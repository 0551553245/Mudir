import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getManagerContext, getProfile } from "@/lib/supabase/auth";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/metric-card";
import { ManagerDashboardClient } from "./dashboard-client";
import {
  MgrCard,
  MgrCardHeader,
  ProgressRing,
  EventTypeBadge,
} from "@/components/manager-ui";
import { getItemStatus } from "@/lib/tasks/period";
import type { TaskFrequency } from "@/lib/supabase/types";
import { startOfDay } from "date-fns";

function tierColor(pct: number) {
  if (pct >= 85) return "#37B788";
  if (pct >= 70) return "#43978D";
  if (pct >= 50) return "#E0A23B";
  if (pct >= 30) return "#F9AD6A";
  return "#E8697C";
}

function formatEventDay(dateStr: string, locale: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 6);
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", {
    weekday: "short",
    day: "numeric",
  });
}

export default async function ManagerDashboardPage() {
  const t = await getTranslations("manager");
  const tf = await getTranslations("frequency");
  const te = await getTranslations("empty");
  const tet = await getTranslations("eventTypes");
  const locale = await getLocale();
  const context = await getManagerContext();
  if (!context) return null;

  const profile = await getProfile();
  const branch = context.branches as { id: string; name: string; address: string | null };
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const todayStart = startOfDay(new Date());

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
    .gte("event_date", today)
    .order("event_date")
    .limit(2);

  const { data: standards } = await supabase
    .from("food_safety_standards")
    .select("*")
    .eq("restaurant_id", context.restaurant_id)
    .eq("is_active", true)
    .or(`branch_id.is.null,branch_id.eq.${branch.id}`);

  const { data: readings } = await supabase
    .from("food_safety_readings")
    .select("*")
    .eq("branch_id", branch.id)
    .gte("submitted_at", todayStart.toISOString());

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
  const nextEvent = events?.[0] ?? null;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "";

  let fsPass = 0;
  let fsFail = 0;
  let fsPending = 0;
  for (const s of standards ?? []) {
    const reading = (readings ?? []).find((r) => r.standard_id === s.id);
    if (!reading) fsPending++;
    else if (reading.passed) fsPass++;
    else fsFail++;
  }
  const fsTotal = (standards ?? []).length;
  const fsPassPct = fsTotal === 0 ? 0 : Math.round((fsPass / fsTotal) * 100);

  return (
    <div className="relative flex flex-col gap-4 animate-[mgrFade_0.25s_ease]">
      <ManagerDashboardClient branchId={branch.id} />

      <div>
        <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
          {firstName
            ? t("greeting", { name: firstName })
            : t("dashboardTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("dashboardSubtitle")}</p>
      </div>

      <MgrCard className="flex flex-wrap items-center gap-5">
        <ProgressRing
          pct={completionPct}
          color={tierColor(completionPct)}
          label={`${completionPct}%`}
        />
        <div className="min-w-[180px] flex-1">
          <div className="text-[17px] font-semibold text-ink">
            {t("shiftProgress")}
          </div>
          <div className="mt-1 text-[13px] text-ink-soft">
            {done}/{total} {t("itemsComplete")}
          </div>
          <div className="mt-1 text-[12.5px] text-ink-faint">
            {t("shiftEnds", { time: "22:00" })}
          </div>
          {total > 0 && done === total ? (
            <div className="mt-1.5 text-[12px] font-semibold text-on-track">
              {t("allCaughtUp")}
            </div>
          ) : null}
        </div>
      </MgrCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <MgrCard>
          <MgrCardHeader
            title={t("todaysTasks")}
            href="/manager/tasks"
            linkLabel={t("viewAll")}
          />
          {taskSummaries.length === 0 ? (
            <EmptyState title={te("noTasks")} />
          ) : (
            <div className="flex flex-col gap-3.5">
              {taskSummaries.slice(0, 5).map((ts) => (
                <Link key={ts.id} href="/manager/tasks" className="block">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-ink">
                      {ts.title}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-ink-faint">
                      {ts.doneCount}/{ts.totalCount}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${ts.pct}%`,
                        backgroundColor: tierColor(ts.pct),
                      }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </MgrCard>

        <MgrCard>
          <MgrCardHeader
            title={t("foodDue")}
            href="/manager/food-safety"
            linkLabel={t("viewAll")}
          />
          {fsTotal === 0 ? (
            <EmptyState title={te("noReadingsDue")} />
          ) : (
            <div className="flex flex-wrap items-center gap-5">
              <ProgressRing
                pct={fsPassPct || (fsPending === fsTotal ? 8 : fsPassPct)}
                size={96}
                stroke={10}
                color={
                  fsFail > 0
                    ? "#E8697C"
                    : fsPending > 0
                      ? "#E0A23B"
                      : "#37B788"
                }
                label={`${fsPass}/${fsTotal}`}
                sublabel="PASS"
              />
              <ul className="space-y-2 text-[13px] text-ink-soft">
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#37B788]" />
                  {t("fsPass")}: {fsPass}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E8697C]" />
                  {t("fsFail")}: {fsFail}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E0A23B]" />
                  {t("fsPending")}: {fsPending}
                </li>
              </ul>
            </div>
          )}
        </MgrCard>
      </div>

      <MgrCard>
        <MgrCardHeader
          title={t("nextEvent")}
          href="/manager/schedule"
          linkLabel={t("viewSchedule")}
        />
        {nextEvent ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <EventTypeBadge
              type={nextEvent.type}
              label={tet(nextEvent.type)}
            />
            <span className="text-[14.5px] font-semibold text-ink">
              {locale === "ar" && nextEvent.title_ar
                ? nextEvent.title_ar
                : nextEvent.title}
            </span>
            <span className="text-[12.5px] text-ink-faint">
              {formatEventDay(nextEvent.event_date, locale)}
              {nextEvent.description ? ` · ${nextEvent.description}` : ""}
            </span>
          </div>
        ) : (
          <p className="text-[13px] text-ink-faint">{te("noUpcomingEvents")}</p>
        )}
      </MgrCard>
    </div>
  );
}
