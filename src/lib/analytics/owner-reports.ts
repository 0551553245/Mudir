import {
  eachDayOfInterval,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  subDays,
} from "date-fns";
import type {
  Branch,
  Task,
  TaskCompletion,
  TaskItem,
  FoodSafetyReading,
} from "@/lib/supabase/types";
import type {
  DateRange,
  DateRangePreset,
  DailyCompletionPoint,
  DailyPassRatePoint,
  BranchReportRow,
  OwnerReportSummary,
} from "./types";

type TaskWithItems = Task & { task_items: TaskItem[] };

export function parseDateRange(
  preset: DateRangePreset = "30d"
): DateRange {
  const days =
    preset === "1d" ? 1 : preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  return { start, end, preset };
}

/** Week/Month/3M: aggregate daily points into weekly averages for readable charts */
export function aggregateWeeklyRates<
  T extends { date: string; rate: number }
>(points: T[]): Array<{ label: string; rate: number }> {
  if (points.length === 0) return [];
  const weeks: Array<{ label: string; rates: number[] }> = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    weeks.push({
      label: format(new Date(chunk[0].date), "MMM d"),
      rates: chunk.map((c) => c.rate),
    });
  }
  return weeks.map((w) => ({
    label: w.label,
    rate: Math.round(w.rates.reduce((a, b) => a + b, 0) / w.rates.length),
  }));
}

export function chartPointsForPreset(
  daily: Array<{ date: string; rate: number }>,
  preset: DateRangePreset
): Array<{ label: string; rate: number }> {
  if (preset === "30d" || preset === "90d") {
    return aggregateWeeklyRates(daily);
  }
  return daily.map((d) => ({
    label: format(new Date(d.date), preset === "1d" ? "HH:mm" : "MMM d"),
    rate: d.rate,
  }));
}

export function countExpectedItemsPerDay(
  tasks: TaskWithItems[],
  branchIds: string[]
): number {
  let total = 0;
  for (const branchId of branchIds) {
    for (const task of tasks) {
      if (task.branch_id && task.branch_id !== branchId) continue;
      total += task.task_items?.length ?? 0;
    }
  }
  return total;
}

export function buildDailyCompletionSeries(
  completions: TaskCompletion[],
  expectedPerDay: number,
  range: DateRange
): DailyCompletionPoint[] {
  const days = eachDayOfInterval({ start: range.start, end: range.end });

  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const dateKey = format(day, "yyyy-MM-dd");

    const dayCompletions = completions.filter((c) => {
      const submitted = new Date(c.submitted_at);
      return isWithinInterval(submitted, { start: dayStart, end: dayEnd });
    }).length;

    const expected = expectedPerDay;
    const rate =
      expected > 0 ? Math.min(100, Math.round((dayCompletions / expected) * 100)) : 0;

    return {
      date: dateKey,
      completions: dayCompletions,
      expected,
      rate,
    };
  });
}

export function buildDailyPassRateSeries(
  readings: FoodSafetyReading[],
  range: DateRange
): DailyPassRatePoint[] {
  const days = eachDayOfInterval({ start: range.start, end: range.end });

  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const dateKey = format(day, "yyyy-MM-dd");

    const dayReadings = readings.filter((r) => {
      const submitted = new Date(r.submitted_at);
      return isWithinInterval(submitted, { start: dayStart, end: dayEnd });
    });

    const passed = dayReadings.filter((r) => r.passed).length;
    const total = dayReadings.length;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { date: dateKey, total, passed, rate };
  });
}

export function buildBranchBreakdown(
  branches: Branch[],
  tasks: TaskWithItems[],
  completions: TaskCompletion[],
  readings: FoodSafetyReading[],
  range: DateRange
): BranchReportRow[] {
  return branches.map((branch) => {
    const expected = countExpectedItemsPerDay(tasks, [branch.id]);
    const daysInRange = eachDayOfInterval({
      start: range.start,
      end: range.end,
    }).length;
    const totalExpected = expected * daysInRange;

    const branchCompletions = completions.filter((c) => {
      if (c.branch_id !== branch.id) return false;
      const submitted = new Date(c.submitted_at);
      return isWithinInterval(submitted, {
        start: range.start,
        end: range.end,
      });
    });

    const branchReadings = readings.filter((r) => {
      if (r.branch_id !== branch.id) return false;
      const submitted = new Date(r.submitted_at);
      return isWithinInterval(submitted, {
        start: range.start,
        end: range.end,
      });
    });

    const passed = branchReadings.filter((r) => r.passed).length;

    return {
      branchId: branch.id,
      branchName: branch.name,
      completions: branchCompletions.length,
      expected: totalExpected,
      completionRate:
        totalExpected > 0
          ? Math.min(
              100,
              Math.round((branchCompletions.length / totalExpected) * 100)
            )
          : 0,
      readingsTotal: branchReadings.length,
      readingsPassed: passed,
      passRate:
        branchReadings.length > 0
          ? Math.round((passed / branchReadings.length) * 100)
          : 0,
    };
  });
}

export function summarizeOwnerReport(
  completionSeries: DailyCompletionPoint[],
  passRateSeries: DailyPassRatePoint[]
): OwnerReportSummary {
  const daysWithExpected = completionSeries.filter((d) => d.expected > 0);
  const avgCompletionRate =
    daysWithExpected.length > 0
      ? Math.round(
          daysWithExpected.reduce((sum, d) => sum + d.rate, 0) /
            daysWithExpected.length
        )
      : 0;

  const daysWithReadings = passRateSeries.filter((d) => d.total > 0);
  const avgPassRate =
    daysWithReadings.length > 0
      ? Math.round(
          daysWithReadings.reduce((sum, d) => sum + d.rate, 0) /
            daysWithReadings.length
        )
      : 0;

  return {
    avgCompletionRate,
    avgPassRate,
    totalCompletions: completionSeries.reduce(
      (sum, d) => sum + d.completions,
      0
    ),
    totalReadings: passRateSeries.reduce((sum, d) => sum + d.total, 0),
    totalPassed: passRateSeries.reduce((sum, d) => sum + d.passed, 0),
  };
}

export function filterByDateRange<T extends { submitted_at: string }>(
  items: T[],
  range: DateRange
): T[] {
  return items.filter((item) => {
    const submitted = new Date(item.submitted_at);
    return isWithinInterval(submitted, { start: range.start, end: range.end });
  });
}
