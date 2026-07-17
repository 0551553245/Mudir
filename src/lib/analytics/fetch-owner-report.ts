import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseDateRange,
  countExpectedItemsPerDay,
  buildDailyCompletionSeries,
  buildDailyPassRateSeries,
  buildBranchBreakdown,
  summarizeOwnerReport,
  filterByDateRange,
} from "./owner-reports";
import type {
  DateRangePreset,
  DailyCompletionPoint,
  DailyPassRatePoint,
  BranchReportRow,
  OwnerReportSummary,
} from "./types";
import type {
  Branch,
  FoodSafetyReading,
  Restaurant,
  Task,
  TaskCompletion,
  TaskItem,
} from "@/lib/supabase/types";

type TaskWithItems = Task & { task_items: TaskItem[] };

export interface OwnerReportData {
  restaurant: Restaurant;
  rangePreset: DateRangePreset;
  branchFilter: string;
  branchLabel: string;
  branches: Branch[];
  summary: OwnerReportSummary;
  completionSeries: DailyCompletionPoint[];
  passRateSeries: DailyPassRatePoint[];
  branchBreakdown: BranchReportRow[];
  expectedPerDay: number;
  rangeStart: string;
  rangeEnd: string;
}

export async function fetchOwnerReportData(
  supabase: SupabaseClient,
  restaurant: Restaurant,
  rangePreset: DateRangePreset,
  branchFilter: string = "all"
): Promise<OwnerReportData> {
  const range = parseDateRange(rangePreset);

  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("name");

  const filteredBranches =
    branchFilter === "all"
      ? branches ?? []
      : (branches ?? []).filter((b) => b.id === branchFilter);

  const branchIds = filteredBranches.map((b) => b.id);
  const branchLabel =
    branchFilter === "all"
      ? "all"
      : (filteredBranches[0]?.name ?? branchFilter);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, task_items(*)")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const typedTasks = (tasks ?? []) as TaskWithItems[];
  const expectedPerDay = countExpectedItemsPerDay(typedTasks, branchIds);

  let completions: TaskCompletion[] = [];
  let readings: FoodSafetyReading[] = [];

  if (branchIds.length > 0) {
    const [completionsRes, readingsRes] = await Promise.all([
      supabase
        .from("task_completions")
        .select("*")
        .in("branch_id", branchIds)
        .gte("submitted_at", range.start.toISOString())
        .lte("submitted_at", range.end.toISOString())
        .order("submitted_at"),
      supabase
        .from("food_safety_readings")
        .select("*")
        .in("branch_id", branchIds)
        .gte("submitted_at", range.start.toISOString())
        .lte("submitted_at", range.end.toISOString())
        .order("submitted_at"),
    ]);
    completions = completionsRes.data ?? [];
    readings = readingsRes.data ?? [];
  }

  const filteredCompletions = filterByDateRange(completions, range);
  const filteredReadings = filterByDateRange(readings, range);

  const completionSeries = buildDailyCompletionSeries(
    filteredCompletions,
    expectedPerDay,
    range
  );

  const passRateSeries = buildDailyPassRateSeries(filteredReadings, range);
  const summary = summarizeOwnerReport(completionSeries, passRateSeries);
  const branchBreakdown = buildBranchBreakdown(
    filteredBranches,
    typedTasks,
    filteredCompletions,
    filteredReadings,
    range
  );

  return {
    restaurant,
    rangePreset,
    branchFilter,
    branchLabel,
    branches: filteredBranches,
    summary,
    completionSeries,
    passRateSeries,
    branchBreakdown,
    expectedPerDay,
    rangeStart: range.start.toISOString().split("T")[0],
    rangeEnd: range.end.toISOString().split("T")[0],
  };
}
