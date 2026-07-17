import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { fetchOwnerReportData } from "@/lib/analytics/fetch-owner-report";
import { chartPointsForPreset } from "@/lib/analytics/owner-reports";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow, StatCard } from "@/components/panel-block";
import { BarChart, RateChart } from "@/components/charts/bar-chart";
import type { DateRangePreset } from "@/lib/analytics/types";
import { ReportsFilters } from "./reports-filters";
import { ReportsToolbar } from "./reports-toolbar";

export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; branch?: string }>;
}) {
  const t = await getTranslations("reports");
  const rangeLabels: Record<DateRangePreset, string> = {
    "1d": t("range1d"),
    "7d": t("range7d"),
    "30d": t("range30d"),
    "90d": t("range90d"),
  };
  const params = await searchParams;
  const rangePreset = (
    ["1d", "7d", "30d", "90d"].includes(params.range ?? "")
      ? params.range
      : "30d"
  ) as DateRangePreset;
  const branchFilter = params.branch ?? "all";

  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const report = await fetchOwnerReportData(
    supabase,
    restaurant,
    rangePreset,
    branchFilter
  );

  const { data: allBranches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("name");

  const chartCompletionRates = chartPointsForPreset(
    report.completionSeries,
    rangePreset
  );
  const chartPassRateItems = chartPointsForPreset(
    report.passRateSeries,
    rangePreset
  );

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Suspense>
        <ReportsFilters
          branches={allBranches ?? []}
          currentRange={rangePreset}
          currentBranch={branchFilter}
        />
      </Suspense>

      <Suspense>
        <ReportsToolbar />
      </Suspense>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("avgCompletionRate")}
          value={`${report.summary.avgCompletionRate}%`}
          sub={t("completionsCount", {
            count: report.summary.totalCompletions,
          })}
        />
        <StatCard
          label={t("avgPassRate")}
          value={`${report.summary.avgPassRate}%`}
          sub={t("readingsCount", { count: report.summary.totalReadings })}
        />
        <StatCard
          label={t("passedReadings")}
          value={report.summary.totalPassed}
          sub={t("inPeriod")}
        />
        <StatCard
          label={t("branchesIncluded")}
          value={report.branches.length}
          sub={rangeLabels[rangePreset]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock title={t("completionOverTime")} role="owner">
          {report.expectedPerDay === 0 ? (
            <EmptyState message={t("noTasks")} />
          ) : (
            <RateChart items={chartCompletionRates} />
          )}
          <p className="mt-4 text-xs text-ink-faint">{t("completionHint")}</p>
        </PanelBlock>

        <PanelBlock title={t("passRateOverTime")} role="owner">
          {report.summary.totalReadings === 0 ? (
            <EmptyState message={t("noReadings")} />
          ) : (
            <RateChart items={chartPassRateItems} />
          )}
          <p className="mt-4 text-xs text-ink-faint">{t("passRateHint")}</p>
        </PanelBlock>
      </div>

      <div className="mt-6">
        <PanelBlock title={t("byBranch")} role="owner">
          {report.branchBreakdown.length === 0 ? (
            <EmptyState message={t("noBranches")} />
          ) : (
            report.branchBreakdown.map((row) => (
              <FeatureRow
                key={row.branchId}
                title={row.branchName}
                description={t("branchStats", {
                  completion: row.completionRate,
                  pass: row.passRate,
                  completions: row.completions,
                  readings: row.readingsTotal,
                })}
              />
            ))
          )}
        </PanelBlock>
      </div>

      <div className="mt-6">
        <PanelBlock title={t("dailyCompletions")} role="owner">
          {report.summary.totalCompletions === 0 ? (
            <EmptyState message={t("noResults")} />
          ) : (
            <BarChart
              items={chartCompletionRates.map((d) => ({
                label: d.label,
                value: d.rate,
                displayValue: `${d.rate}%`,
              }))}
            />
          )}
        </PanelBlock>
      </div>
    </div>
  );
}
