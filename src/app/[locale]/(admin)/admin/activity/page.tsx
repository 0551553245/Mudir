import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";

export default async function AdminActivityPage() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("activity_log")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader title={t("activityTitle")} />

      <PanelBlock title={t("activityTitle")} role="super_admin">
        {(activity ?? []).length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          activity?.map((a) => (
            <FeatureRow
              key={a.id}
              title={a.action}
              description={`${(a.profiles as { email: string })?.email ?? "system"} · ${a.target_type ?? ""} · ${new Date(a.created_at).toLocaleString()}`}
            />
          ))
        )}
      </PanelBlock>
    </div>
  );
}
