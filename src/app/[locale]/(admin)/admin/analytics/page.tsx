import { Suspense } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow, StatCard } from "@/components/panel-block";
import { BarChart } from "@/components/charts/bar-chart";
import {
  parseAdminDateRange,
  buildDailyCountSeries,
  computeAdminSummary,
  computeSubscriptionBreakdown,
  groupActivityByAction,
} from "@/lib/analytics/admin-analytics";
import type { DateRangePreset } from "@/lib/analytics/types";
import { formatSAR } from "@/lib/utils";
import { AnalyticsFilters } from "./analytics-filters";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const t = await getTranslations("analytics");
  const locale = await getLocale();
  const rangeLabels: Record<DateRangePreset, string> = {
    "7d": t("range7d"),
    "30d": t("range30d"),
    "90d": t("range90d"),
  };
  const params = await searchParams;
  const rangePreset = (["7d", "30d", "90d"].includes(params.range ?? "")
    ? params.range
    : "30d") as DateRangePreset;

  const supabase = createClient();
  const range = parseAdminDateRange(rangePreset);

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .order("created_at");

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*");

  const { count: branchCount } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { data: completions } = await supabase
    .from("task_completions")
    .select("submitted_at")
    .gte("submitted_at", range.start.toISOString())
    .lte("submitted_at", range.end.toISOString());

  const { data: readings } = await supabase
    .from("food_safety_readings")
    .select("submitted_at")
    .gte("submitted_at", range.start.toISOString())
    .lte("submitted_at", range.end.toISOString());

  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .gte("created_at", range.start.toISOString())
    .lte("created_at", range.end.toISOString())
    .order("created_at", { ascending: false });

  const summary = computeAdminSummary(
    restaurants ?? [],
    subscriptions ?? [],
    branchCount ?? 0,
    completions?.length ?? 0,
    readings?.length ?? 0
  );

  const breakdown = computeSubscriptionBreakdown(subscriptions ?? []);
  const topActions = groupActivityByAction(activity ?? []);

  const signupSeries = buildDailyCountSeries(restaurants ?? [], range);
  const completionSeries = buildDailyCountSeries(
    completions ?? [],
    range,
    "submitted_at"
  );
  const readingSeries = buildDailyCountSeries(
    readings ?? [],
    range,
    "submitted_at"
  );

  const sampleStep = rangePreset === "90d" ? 7 : rangePreset === "30d" ? 3 : 1;

  function sampleSeries<T extends { date: string; count: number }>(series: T[]) {
    return series
      .filter((_, i) => i % sampleStep === 0)
      .map((d) => ({
        label: format(new Date(d.date), "MMM d"),
        value: d.count,
      }));
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Suspense>
        <AnalyticsFilters currentRange={rangePreset} />
      </Suspense>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalRestaurants")}
          value={summary.totalRestaurants}
        />
        <StatCard
          label={t("estimatedMrr")}
          value={formatSAR(summary.estimatedMrr, locale)}
        />
        <StatCard
          label={t("completionsVolume")}
          value={summary.completionsInPeriod}
          sub={rangeLabels[rangePreset]}
        />
        <StatCard
          label={t("readingsVolume")}
          value={summary.readingsInPeriod}
          sub={rangeLabels[rangePreset]}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t("trialing")} value={breakdown.trialing} />
        <StatCard label={t("active")} value={breakdown.active} />
        <StatCard label={t("pastDue")} value={breakdown.past_due} />
        <StatCard label={t("enterprise")} value={breakdown.enterprise} />
        <StatCard label={t("totalBranches")} value={summary.totalBranches} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock title={t("signupsOverTime")} role="super_admin">
          {(restaurants ?? []).length === 0 ? (
            <EmptyState message={t("noData")} />
          ) : (
            <BarChart items={sampleSeries(signupSeries)} barClassName="bg-blue/80" />
          )}
        </PanelBlock>

        <PanelBlock title={t("completionsOverTime")} role="super_admin">
          {(completions ?? []).length === 0 ? (
            <EmptyState message={t("noData")} />
          ) : (
            <BarChart items={sampleSeries(completionSeries)} />
          )}
        </PanelBlock>

        <PanelBlock title={t("readingsOverTime")} role="super_admin">
          {(readings ?? []).length === 0 ? (
            <EmptyState message={t("noData")} />
          ) : (
            <BarChart items={sampleSeries(readingSeries)} barClassName="bg-amber/80" />
          )}
        </PanelBlock>

        <PanelBlock title={t("topActivity")} role="super_admin">
          {topActions.length === 0 ? (
            <EmptyState message={t("noData")} />
          ) : (
            topActions.map((a) => (
              <FeatureRow
                key={a.action}
                title={a.action}
                description={t("eventCount", { count: a.count })}
              />
            ))
          )}
        </PanelBlock>
      </div>
    </div>
  );
}
