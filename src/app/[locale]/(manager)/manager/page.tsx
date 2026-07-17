import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getManagerContext, getProfile } from "@/lib/supabase/auth";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/metric-card";
import { ManagerDashboardClient } from "./dashboard-client";
import { getItemStatus } from "@/lib/tasks/period";
import type { TaskFrequency } from "@/lib/supabase/types";

function tierColor(pct: number) {
  if (pct >= 85) return { solid: "#43978D", bg: "#EAF4F2", ink: "#1F5C54" };
  if (pct >= 70) return { solid: "#264D59", bg: "#E7EDEF", ink: "#17323A" };
  if (pct >= 50) return { solid: "#F9E07F", bg: "#FFFBEA", ink: "#8A6D1D" };
  if (pct >= 30) return { solid: "#F9AD6A", bg: "#FFF3E6", ink: "#A85A1E" };
  return { solid: "#D46C4E", bg: "#FBEAE4", ink: "#9C3F26" };
}

function formatEventDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 6);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export default async function ManagerDashboardPage() {
  const t = await getTranslations("manager");
  const tf = await getTranslations("frequency");
  const te = await getTranslations("empty");
  const locale = await getLocale();
  const context = await getManagerContext();
  if (!context) return null;

  const profile = await getProfile();
  const branch = context.branches as { id: string; name: string };
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, task_items(*)")
    .eq("restaurant_id", context.restaurant_id)
    .eq("is_active", true)
    .or(`branch_id.is.null,branch_id.eq.${branch.id}`);

  const { data: completions } = await supabase
    .from("task_completions")
    .select("*")
    .eq("branch_id", branch.id)
    .order("submitted_at", { ascending: false });

  const { data: events } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("restaurant_id", context.restaurant_id)
    .or(`branch_id.is.null,branch_id.eq.${branch.id}`)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date")
    .limit(2);

  let done = 0;
  let total = 0;

  const taskSummaries = (tasks ?? []).map((task) => {
    const items = task.task_items ?? [];
    let taskDone = 0;
    for (const item of items) {
      total++;
      const last = completions?.find((c) => c.task_item_id === item.id);
      const status = getItemStatus({
        frequency: task.frequency as TaskFrequency,
        createdAt: new Date(item.created_at),
        lastCompletionAt: last ? new Date(last.submitted_at) : null,
      });
      if (status === "completed") {
        done++;
        taskDone++;
      }
    }
    const title =
      locale === "ar" && task.title_ar ? task.title_ar : task.title;
    const freqKey = task.frequency as "daily" | "weekly" | "monthly";
    return {
      id: task.id,
      title,
      freq: tf(freqKey),
      doneCount: taskDone,
      totalCount: items.length,
      pct:
        items.length === 0
          ? 0
          : Math.round((taskDone / items.length) * 100),
    };
  });

  const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);
  const shiftTier = tierColor(completionPct);
  const circumference = 2 * Math.PI * 36;
  const dash = `${((completionPct / 100) * circumference).toFixed(1)} ${circumference}`;
  const nextEvent = events?.[0] ?? null;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="relative flex flex-col gap-[18px] animate-[mgrFade_0.25s_ease]">
      <ManagerDashboardClient branchId={branch.id} />

      <div>
        <h1 className="font-[family-name:var(--font-outfit)] text-[26px] font-medium text-deep-palm">
          {firstName
            ? t("greeting", { name: firstName })
            : t("dashboardTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("dashboardSubtitle")}</p>
        <p className="mt-1 font-[family-name:var(--font-ibm-plex-mono)] text-[11.5px] text-ink-faint">
          {t("yourBranch")}: {branch.name}
        </p>
      </div>

      <section className="flex flex-wrap items-center gap-5 rounded-[18px] border border-border bg-card p-5">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden>
            <circle
              cx="42"
              cy="42"
              r="36"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="42"
              cy="42"
              r="36"
              fill="none"
              stroke={shiftTier.solid}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={dash}
              transform="rotate(-90 42 42)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-outfit)] text-[19px] font-semibold text-deep-palm">
            {completionPct}%
          </div>
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="font-[family-name:var(--font-outfit)] text-[17px] font-semibold text-ink">
            {t("shiftProgress")}
          </div>
          <div className="mt-1 text-[13px] text-ink-soft">
            {done}/{total} {t("itemsComplete")}
          </div>
          {total > 0 && done === total ? (
            <div className="mt-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-[11.5px] text-accent">
              {t("allCaughtUp")}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[18px] border border-border bg-card p-[18px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-[family-name:var(--font-outfit)] text-base font-medium text-ink">
              {t("todaysTasks")}
            </h3>
            <Link
              href="/manager/tasks"
              className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold text-accent hover:underline"
            >
              {t("viewAll")} →
            </Link>
          </div>
          {taskSummaries.length === 0 ? (
            <EmptyState title={te("noTasks")} />
          ) : (
            <div className="flex flex-col">
              {taskSummaries.slice(0, 5).map((ts) => {
                const tier = tierColor(ts.pct);
                return (
                  <Link
                    key={ts.id}
                    href="/manager/tasks"
                    className="flex items-center justify-between gap-2.5 border-b border-border py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold text-ink">
                        {ts.title}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-ink-faint">
                        {ts.freq}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-bold"
                      style={{ background: tier.bg, color: tier.ink }}
                    >
                      {ts.doneCount}/{ts.totalCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[18px] border border-border bg-card p-[18px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-[family-name:var(--font-outfit)] text-base font-medium text-ink">
              {t("foodDue")}
            </h3>
            <Link
              href="/manager/food-safety"
              className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold text-accent hover:underline"
            >
              {t("viewAll")} →
            </Link>
          </div>
          <Link
            href="/manager/food-safety"
            className="flex items-center justify-between gap-2.5 border-b border-border py-2.5"
          >
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-ink">
                {t("foodSafetyTitle")}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ink-faint">
                {t("foodSafetySubtitle")}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#FFF3E6] px-2.5 py-1 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-bold text-[#A85A1E]">
              {t("foodPending")}
            </span>
          </Link>
        </section>
      </div>

      <Link
        href="/manager/schedule"
        className="block rounded-[18px] border border-border bg-card p-[18px] transition-colors hover:border-accent/40"
      >
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-outfit)] text-base font-medium text-ink">
            {t("nextEvent")}
          </h3>
          <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold text-accent">
            {t("viewSchedule")} →
          </span>
        </div>
        {nextEvent ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-md bg-[#EAF4F2] px-2 py-0.5 font-[family-name:var(--font-ibm-plex-mono)] text-[10.5px] font-bold uppercase text-[#1F5C54]">
              {formatEventDay(nextEvent.event_date)}
            </span>
            <span className="font-[family-name:var(--font-outfit)] text-[14.5px] font-semibold text-ink">
              {nextEvent.title}
            </span>
            <span className="text-[12.5px] text-ink-faint">
              {nextEvent.event_date}
            </span>
          </div>
        ) : (
          <p className="text-[13px] text-ink-faint">{te("noUpcomingEvents")}</p>
        )}
      </Link>
    </div>
  );
}
