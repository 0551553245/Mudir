"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { EmptyState } from "@/components/metric-card";
import { useOptionalBranchContext } from "@/components/branch-context";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { cn } from "@/lib/utils";

export interface OwnerDashBranchRow {
  id: string;
  name: string;
  completed: number;
  due: number;
  missed: number;
  pending: number;
  total: number;
  passRate: number | null;
}

export interface OwnerDashEvent {
  id: string;
  title: string;
  event_date: string;
}

interface OwnerDashboardClientProps {
  restaurantId: string;
  branchRows: OwnerDashBranchRow[];
  completionPct: number;
  passRate: number | null;
  trendLabel: string;
  nextEvents: OwnerDashEvent[];
}

function formatEventDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 6);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export function OwnerDashboardView({
  restaurantId: _restaurantId,
  branchRows,
  completionPct,
  passRate,
  trendLabel,
  nextEvents,
}: OwnerDashboardClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const branchCtx = useOptionalBranchContext();

  const filtered = useMemo(() => {
    if (!branchCtx || branchCtx.isAllBranches) return branchRows;
    return branchRows.filter((b) => b.id === branchCtx.selectedBranchId);
  }, [branchRows, branchCtx]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, b) => {
        acc.completed += b.completed;
        acc.pending += b.pending + b.due;
        acc.missed += b.missed;
        acc.total += b.total;
        return acc;
      },
      { completed: 0, pending: 0, missed: 0, total: 0 }
    );
  }, [filtered]);

  const branchBars = useMemo(() => {
    const rows = filtered.slice(0, 7);
    return rows.map((b) => {
      const pct =
        b.total === 0 ? 0 : Math.round((b.completed / b.total) * 100);
      return {
        id: b.id,
        label: b.name.length > 8 ? `${b.name.slice(0, 7)}…` : b.name,
        pct,
      };
    });
  }, [filtered]);

  const statusBars = useMemo(() => {
    const total = totals.total || 1;
    return [
      {
        key: "done",
        label: t("owner.statCompleted"),
        pct: Math.round((totals.completed / total) * 100),
        color: "bg-accent",
      },
      {
        key: "pending",
        label: t("owner.statPending"),
        pct: Math.round((totals.pending / total) * 100),
        color: "bg-[#F9AD6A]",
      },
      {
        key: "missed",
        label: t("owner.statMissed"),
        pct: Math.round((totals.missed / total) * 100),
        color: "bg-[#D46C4E]",
      },
    ];
  }, [totals, t]);

  const activity = useMemo(() => {
    const items: { text: string; time: string }[] = [];
    if (filtered.length > 0) {
      items.push({
        text: t("owner.activityCompletion", {
          pct: completionPct,
          count: filtered.length,
        }),
        time: trendLabel,
      });
    }
    if (passRate !== null) {
      items.push({
        text: t("owner.activityPassRate", { pct: passRate }),
        time: t("owner.todayLabel"),
      });
    }
    const missedBranches = filtered.filter((b) => b.missed > 0).slice(0, 2);
    for (const b of missedBranches) {
      items.push({
        text: t("owner.activityMissed", {
          name: b.name,
          count: b.missed,
        }),
        time: t("owner.todayLabel"),
      });
    }
    return items.slice(0, 4);
  }, [filtered, completionPct, passRate, trendLabel, t]);

  return (
    <div className="relative flex flex-col gap-5 animate-[scopFade_0.25s_ease]">
      <RealtimeRefresh
        tables={["task_completions", "food_safety_readings"]}
        onUpdate={() => router.refresh()}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-[family-name:var(--font-outfit)] text-[28px] font-medium text-deep-palm">
              {t("nav.dashboard")}
            </h1>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
              <span className="h-[7px] w-[7px] rounded-full bg-accent animate-[scopPulse_2s_infinite]" />
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10.5px] font-semibold uppercase text-accent">
                {t("owner.live")}
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {t("owner.dashboardSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          label={t("owner.statCompleted")}
          value={totals.completed}
          top="border-t-accent"
          valueClass="text-deep-palm"
        />
        <StatTile
          label={t("owner.statPending")}
          value={totals.pending}
          top="border-t-[#F9AD6A]"
          valueClass="text-[#A85A1E]"
        />
        <StatTile
          label={t("owner.statMissed")}
          value={totals.missed}
          top="border-t-[#D46C4E]"
          valueClass="text-[#9C3F26]"
        />
        <StatTile
          label={t("owner.statBranches")}
          value={filtered.length}
          top="border-t-deep-palm"
          valueClass="text-deep-palm"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[18px] border border-border bg-card p-[18px]">
          <h3 className="mb-3 font-[family-name:var(--font-outfit)] text-base font-medium text-ink">
            {t("owner.dailyProgress")}
          </h3>
          {branchBars.length === 0 ? (
            <EmptyState title={t("empty.noBranches")} />
          ) : (
            <div className="flex h-[140px] items-end gap-2.5 pt-2.5">
              {branchBars.map((bar) => (
                <div
                  key={bar.id}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <div
                    className="w-full max-w-[36px] rounded-t-md bg-accent"
                    style={{
                      height: `${Math.max(bar.pct, 4)}%`,
                      opacity: bar.pct >= 70 ? 1 : 0.55,
                    }}
                  />
                  <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] text-ink-faint">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[18px] border border-border bg-card p-[18px]">
          <h3 className="mb-3 font-[family-name:var(--font-outfit)] text-base font-medium text-ink">
            {t("owner.completionByStatus")}
          </h3>
          {totals.total === 0 ? (
            <EmptyState title={t("empty.noBranches")} />
          ) : (
            <div className="flex flex-col gap-4 pt-1.5">
              {statusBars.map((bar) => (
                <div key={bar.key}>
                  <div className="mb-1.5 flex justify-between text-[12.5px] text-ink-soft">
                    <span>{bar.label}</span>
                    <span className="font-[family-name:var(--font-ibm-plex-mono)] font-semibold text-ink">
                      {bar.pct}%
                    </span>
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-full bg-bg">
                    <div
                      className={cn("h-full rounded-full", bar.color)}
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[18px] border border-border bg-card p-[18px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-[family-name:var(--font-outfit)] text-base font-medium text-ink">
              {t("owner.nextUp")}
            </h3>
            <Link
              href="/owner/schedule"
              className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold text-accent hover:underline"
            >
              {t("owner.viewSchedule")} →
            </Link>
          </div>
          {nextEvents.length === 0 ? (
            <EmptyState title={t("empty.noUpcomingEvents")} />
          ) : (
            <div className="flex flex-col">
              {nextEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href="/owner/schedule"
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
                >
                  <div className="w-11 shrink-0 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-bold text-deep-palm">
                    {formatEventDay(ev.event_date)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">
                      {ev.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">
                      {ev.event_date}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[18px] border border-border bg-card p-[18px]">
          <h3 className="mb-3 font-[family-name:var(--font-outfit)] text-base font-medium text-ink">
            {t("owner.activity")}
          </h3>
          {activity.length === 0 ? (
            <EmptyState title={t("empty.noBranches")} />
          ) : (
            <div className="flex flex-col gap-3">
              {activity.map((a, i) => (
                <div key={`${a.text}-${i}`} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug text-ink">{a.text}</p>
                    <p className="mt-0.5 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] text-ink-faint">
                      {a.time}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                href="/owner/food-safety"
                className="mt-1 text-[12.5px] font-semibold text-accent hover:underline"
              >
                {t("owner.viewAllFailures")} →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  top,
  valueClass,
}: {
  label: string;
  value: number;
  top: string;
  valueClass: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-border border-t-4 bg-card p-[18px]",
        top
      )}
    >
      <div className="font-[family-name:var(--font-ibm-plex-mono)] text-[10.5px] uppercase tracking-[0.03em] text-ink-faint">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-[family-name:var(--font-outfit)] text-[30px] font-medium",
          valueClass
        )}
      >
        {value}
      </div>
    </div>
  );
}
