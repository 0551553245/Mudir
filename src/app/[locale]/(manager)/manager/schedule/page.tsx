import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getManagerContext } from "@/lib/supabase/auth";
import { EventTypeBadge } from "@/components/manager-ui";

function formatEventDay(dateStr: string, locale: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 6);
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", {
    weekday: "short",
    day: "numeric",
  });
}

export default async function ManagerSchedulePage() {
  const t = await getTranslations("manager");
  const te = await getTranslations("eventTypes");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const context = await getManagerContext();
  if (!context) return null;

  const branch = context.branches as { id: string; name: string };
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("restaurant_id", context.restaurant_id)
    .or(`branch_id.is.null,branch_id.eq.${branch.id}`)
    .order("event_date");

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
          {t("scheduleTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("scheduleSubtitle")}</p>
      </div>

      {(events ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-faint">
          {tc("noResults")}
        </p>
      ) : (
        <div className="flex max-w-3xl flex-col gap-3">
          {events?.map((ev) => {
            const title =
              locale === "ar" && ev.title_ar ? ev.title_ar : ev.title;
            return (
              <div
                key={ev.id}
                className="flex items-stretch gap-4 rounded-2xl border border-border/70 bg-[#F4F4F2] px-4 py-4"
              >
                <div className="flex w-[72px] shrink-0 flex-col justify-center border-e border-border/80 pe-4">
                  <span className="text-[15px] font-bold leading-tight text-ink">
                    {formatEventDay(ev.event_date, locale)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventTypeBadge type={ev.type} label={te(ev.type)} />
                    <span className="text-[14.5px] font-semibold text-ink">
                      {title}
                    </span>
                  </div>
                  {ev.description ? (
                    <p className="mt-1 text-[12.5px] text-ink-soft">
                      {ev.description}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
