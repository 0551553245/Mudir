"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createScheduleEvent } from "@/lib/actions/owner";
import {
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  ModalActions,
  modalFormClassName,
} from "@/components/ui";
import type { Branch, ScheduleEvent } from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  addDays,
  encodeEventTimes,
  EVENT_TYPE_STYLES,
  formatGregorianDayNum,
  formatGregorianWeekday,
  formatHijriDay,
  formatHijriFull,
  formatHijriMonthDay,
  formatHourLabel,
  parseEventTimes,
  sameDay,
  startOfWeek,
  timeToMinutes,
  toDateKey,
} from "@/lib/calendar/hijri";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";

interface ScheduleClientProps {
  events: ScheduleEvent[];
  branches: Branch[];
  restaurantId: string;
}

type CalView = "month" | "week" | "day";

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15];
const HOUR_HEIGHT = 64;

export function ScheduleClient({
  events,
  branches,
  restaurantId,
}: ScheduleClientProps) {
  const t = useTranslations("owner");
  const te = useTranslations("eventTypes");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<CalView>("week");
  const [cursor, setCursor] = useState(() => new Date());

  const weekStart = useMemo(() => startOfWeek(cursor, 1), [cursor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const today = new Date();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("restaurant_id", restaurantId);
    const start = String(formData.get("start_time") || "");
    const end = String(formData.get("end_time") || "");
    const note = String(formData.get("description") || "");
    formData.set("description", encodeEventTimes(start, end, note) ?? "");
    const result = await createScheduleEvent(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  function eventTitle(ev: ScheduleEvent) {
    return locale === "ar" && ev.title_ar ? ev.title_ar : ev.title;
  }

  function eventsForDay(d: Date) {
    const key = toDateKey(d);
    return events.filter((ev) => ev.event_date === key);
  }

  function shift(dir: -1 | 1) {
    if (view === "month") {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + dir);
      setCursor(next);
    } else if (view === "week") {
      setCursor(addDays(cursor, dir * 7));
    } else {
      setCursor(addDays(cursor, dir));
    }
  }

  const monthLabel = cursor.toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en-GB",
    { month: "long", year: "numeric" }
  );
  const hijriLabel = formatHijriFull(cursor, locale);

  return (
    <div className="pb-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
            {t("scheduleTitle")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("scheduleSubtitle")}</p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {monthLabel} · {hijriLabel}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="!rounded-full">
          + {t("addEvent")}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="px-2.5 py-2 text-ink-soft hover:bg-bg hover:text-forest"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="border-x border-border px-3 py-2 text-[12.5px] font-semibold text-ink hover:bg-bg"
          >
            {t("calToday")}
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="px-2.5 py-2 text-ink-soft hover:bg-bg hover:text-forest"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex rounded-xl border border-border bg-card p-0.5">
          {(["month", "week", "day"] as CalView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-[12.5px] font-semibold capitalize",
                view === v
                  ? "bg-forest text-white"
                  : "text-ink-soft hover:text-forest"
              )}
            >
              {t(
                v === "month"
                  ? "calMonth"
                  : v === "week"
                    ? "calWeek"
                    : "calDay"
              )}
            </button>
          ))}
        </div>
      </div>

      {view === "week" || view === "day" ? (
        <WeekDayGrid
          days={view === "day" ? [cursor] : weekDays}
          today={today}
          locale={locale}
          events={events}
          eventTitle={eventTitle}
          te={te}
          eventsForDay={eventsForDay}
        />
      ) : (
        <MonthGrid
          cursor={cursor}
          today={today}
          locale={locale}
          eventsForDay={eventsForDay}
          eventTitle={eventTitle}
          te={te}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("addEvent")}
        footer={
          <ModalActions
            formId="event-form"
            loading={loading}
            onCancel={() => setOpen(false)}
            submitLabel={tc("create")}
            cancelLabel={tc("cancel")}
            error={error || undefined}
          />
        }
      >
        <form
          id="event-form"
          onSubmit={handleCreate}
          className={modalFormClassName}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Input name="title" label={t("eventTitle")} required />
            <Input name="title_ar" label={`${t("eventTitle")} (AR)`} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Select
              name="type"
              label={t("eventType")}
              options={[
                { value: "training", label: te("training") },
                { value: "inspection", label: te("inspection") },
                { value: "audit", label: te("audit") },
                { value: "other", label: te("other") },
              ]}
            />
            <Input
              name="event_date"
              type="date"
              label={t("eventDate")}
              required
              defaultValue={toDateKey(cursor)}
            />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Input
              name="start_time"
              type="time"
              label={t("startTime")}
              defaultValue="09:00"
            />
            <Input
              name="end_time"
              type="time"
              label={t("endTime")}
              defaultValue="10:00"
            />
            <Select
              name="branch_id"
              label={tc("branch")}
              options={[
                { value: "", label: tc("allBranches") },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
          <Textarea name="description" label={tc("optional")} />
        </form>
      </Modal>
    </div>
  );
}

function WeekDayGrid({
  days,
  today,
  locale,
  eventTitle,
  te,
  eventsForDay,
}: {
  days: Date[];
  today: Date;
  locale: string;
  events: ScheduleEvent[];
  eventTitle: (ev: ScheduleEvent) => string;
  te: (key: string) => string;
  eventsForDay: (d: Date) => ScheduleEvent[];
}) {
  const startMin = HOURS[0] * 60;
  const totalMin = (HOURS[HOURS.length - 1] - HOURS[0] + 1) * 60;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="grid border-b border-border"
        style={{
          gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="border-e border-border" />
        {days.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <div
              key={toDateKey(d)}
              className={cn(
                "border-e border-border px-2 py-2.5 text-center last:border-e-0",
                isToday && "bg-forest text-white"
              )}
            >
              <div
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wide",
                  isToday ? "text-white/80" : "text-ink-faint"
                )}
              >
                {formatGregorianWeekday(d, locale)}
              </div>
              <div
                className={cn(
                  "text-[18px] font-bold leading-tight",
                  isToday ? "text-white" : "text-ink"
                )}
              >
                {formatGregorianDayNum(d)}
              </div>
              <div
                className={cn(
                  "text-[10px] font-medium",
                  isToday ? "text-white/75" : "text-ink-faint"
                )}
              >
                {formatHijriMonthDay(d, locale)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="max-h-[min(70vh,640px)] overflow-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
            minHeight: HOURS.length * HOUR_HEIGHT,
          }}
        >
          <div className="relative border-e border-border">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute end-1 -translate-y-1/2 text-[10px] text-ink-faint"
                style={{ top: (h - HOURS[0]) * HOUR_HEIGHT }}
              >
                {formatHourLabel(h, locale)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const dayEvents = eventsForDay(d);
            return (
              <div
                key={toDateKey(d)}
                className="relative border-e border-border last:border-e-0"
                style={{ height: HOURS.length * HOUR_HEIGHT }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-dashed border-border/70"
                    style={{ top: (h - HOURS[0]) * HOUR_HEIGHT }}
                  />
                ))}
                {dayEvents.map((ev) => {
                  const times = parseEventTimes(ev.description);
                  const start = times.start ?? "09:00";
                  const end = times.end ?? "10:00";
                  const top =
                    ((timeToMinutes(start) - startMin) / totalMin) *
                    HOURS.length *
                    HOUR_HEIGHT;
                  const height = Math.max(
                    44,
                    ((timeToMinutes(end) - timeToMinutes(start)) / totalMin) *
                      HOURS.length *
                      HOUR_HEIGHT
                  );
                  const style =
                    EVENT_TYPE_STYLES[ev.type] ?? EVENT_TYPE_STYLES.other;
                  return (
                    <div
                      key={ev.id}
                      className="absolute inset-x-1 z-10 overflow-hidden rounded-lg border-s-4 px-2 py-1.5 shadow-sm"
                      style={{
                        top: Math.max(0, top),
                        height,
                        background: style.bg,
                        borderColor: style.border,
                        color: style.text,
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-wide">
                          {te(ev.type)}
                        </span>
                        <Copy className="h-3 w-3 opacity-40" aria-hidden />
                      </div>
                      <div className="truncate text-[12px] font-semibold">
                        {eventTitle(ev)}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {start} – {end}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  cursor,
  today,
  locale,
  eventsForDay,
  eventTitle,
  te,
}: {
  cursor: Date;
  today: Date;
  locale: string;
  eventsForDay: (d: Date) => ScheduleEvent[];
  eventTitle: (ev: ScheduleEvent) => string;
  te: (key: string) => string;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first, 1);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {cells.slice(0, 7).map((d) => (
          <div
            key={`h-${toDateKey(d)}`}
            className="px-2 py-2 text-center text-[11px] font-bold uppercase text-ink-faint"
          >
            {formatGregorianWeekday(d, locale)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const dayEvents = eventsForDay(d).slice(0, 3);
          return (
            <div
              key={toDateKey(d)}
              className={cn(
                "min-h-[96px] border-b border-e border-border p-1.5 last:border-e-0",
                !inMonth && "bg-[#FAFAF8] opacity-55"
              )}
            >
              <div className="mb-1 flex items-baseline justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-bold",
                    isToday && "bg-forest text-white"
                  )}
                >
                  {formatGregorianDayNum(d)}
                </span>
                <span className="text-[9px] text-ink-faint">
                  {formatHijriDay(d, locale)}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.map((ev) => {
                  const style =
                    EVENT_TYPE_STYLES[ev.type] ?? EVENT_TYPE_STYLES.other;
                  return (
                    <div
                      key={ev.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-semibold"
                      style={{ background: style.bg, color: style.text }}
                      title={`${te(ev.type)} · ${eventTitle(ev)}`}
                    >
                      {eventTitle(ev)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
