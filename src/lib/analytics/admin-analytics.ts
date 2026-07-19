import {
  eachDayOfInterval,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  subDays,
} from "date-fns";
import { BRANCH_PRICE_SAR } from "@/lib/supabase/types";
import type {
  ActivityLogEntry,
  Restaurant,
  Subscription,
} from "@/lib/supabase/types";
import type {
  AdminAnalyticsSummary,
  DailyCountPoint,
  DateRange,
  AdminDateRangePreset,
  SubscriptionBreakdown,
} from "./types";

export function parseAdminDateRange(
  preset: AdminDateRangePreset = "30d"
): DateRange {
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  return { start, end, preset };
}

export function buildDailyCountSeries(
  items: Array<{ created_at?: string; submitted_at?: string }>,
  range: DateRange,
  dateField: "created_at" | "submitted_at" = "created_at"
): DailyCountPoint[] {
  const days = eachDayOfInterval({ start: range.start, end: range.end });

  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const dateKey = format(day, "yyyy-MM-dd");

    const count = items.filter((item) => {
      const raw = item[dateField];
      if (!raw) return false;
      const date = new Date(raw);
      return isWithinInterval(date, { start: dayStart, end: dayEnd });
    }).length;

    return { date: dateKey, count };
  });
}

export function computeSubscriptionBreakdown(
  subscriptions: Subscription[]
): SubscriptionBreakdown {
  return {
    trialing: subscriptions.filter((s) => s.status === "trialing").length,
    active: subscriptions.filter((s) => s.status === "active").length,
    past_due: subscriptions.filter((s) => s.status === "past_due").length,
    canceled: subscriptions.filter((s) => s.status === "canceled").length,
    enterprise: subscriptions.filter((s) => s.status === "enterprise").length,
  };
}

export function computeAdminSummary(
  restaurants: Restaurant[],
  subscriptions: Subscription[],
  branchCount: number,
  completionsInPeriod: number,
  readingsInPeriod: number
): AdminAnalyticsSummary {
  const breakdown = computeSubscriptionBreakdown(subscriptions);
  const estimatedMrr = subscriptions
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((sum, s) => {
      const fromTotal = Number(s.total_price_sar);
      if (!Number.isNaN(fromTotal) && fromTotal > 0) return sum + fromTotal;
      return (
        sum + (s.paid_branch_limit || s.branch_count) * BRANCH_PRICE_SAR
      );
    }, 0);

  return {
    totalRestaurants: restaurants.length,
    activeTrials: breakdown.trialing,
    payingCustomers: breakdown.active,
    enterpriseCustomers: breakdown.enterprise,
    estimatedMrr,
    totalBranches: branchCount,
    completionsInPeriod,
    readingsInPeriod,
  };
}

export function groupActivityByAction(
  activity: ActivityLogEntry[]
): Array<{ action: string; count: number }> {
  const map = new Map<string, number>();
  for (const entry of activity) {
    map.set(entry.action, (map.get(entry.action) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function filterRestaurantsInRange(
  restaurants: Restaurant[],
  range: DateRange
): Restaurant[] {
  return restaurants.filter((r) => {
    const created = new Date(r.created_at);
    return isWithinInterval(created, { start: range.start, end: range.end });
  });
}
