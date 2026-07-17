import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getManagerContext } from "@/lib/supabase/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import { format } from "date-fns";

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
    <div>
      <PageHeader title={t("scheduleTitle")} subtitle={branch.name} />

      <PanelBlock title={t("scheduleTitle")} role="manager">
        {(events ?? []).length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          events?.map((ev) => (
            <FeatureRow
              key={ev.id}
              title={locale === "ar" && ev.title_ar ? ev.title_ar : ev.title}
              description={`${te(ev.type)} · ${format(new Date(ev.event_date), "PP")}`}
            />
          ))
        )}
      </PanelBlock>
    </div>
  );
}
