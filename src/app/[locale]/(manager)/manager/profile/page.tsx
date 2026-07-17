
import { getTranslations } from "next-intl/server";
import { getManagerContext, getProfile } from "@/lib/supabase/auth";
import { PageHeader } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerProfilePage() {
  const t = await getTranslations("manager");
  const profile = await getProfile();
  const context = await getManagerContext();
  if (!profile || !context) return null;

  const branch = context.branches as { id: string; name: string };
  const supabase = await createClient();
  const { data: recent } = await supabase
    .from("task_completions")
    .select("submitted_at, task_items(label)")
    .eq("manager_id", context.id)
    .order("submitted_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <PageHeader title={t("profileTitle")} subtitle={branch.name} />
      <PanelBlock title={t("profileTitle")} role="manager">
        <FeatureRow title={profile.full_name ?? profile.email} description={profile.email} />
        <FeatureRow title={branch.name} description={profile.locale.toUpperCase()} />
      </PanelBlock>
      <div className="mt-4">
        <PanelBlock title={t("shiftHistory")} role="manager">
          {(recent ?? []).map((r, i) => (
            <FeatureRow
              key={i}
              title={(r.task_items as unknown as { label: string } | null)?.label ?? "—"}
              description={new Date(r.submitted_at).toLocaleString()}
            />
          ))}
        </PanelBlock>
      </div>
    </div>
  );
}
