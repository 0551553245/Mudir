import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant, getProfile } from "@/lib/supabase/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow, StatCard } from "@/components/panel-block";

export default async function OwnerAccountPage() {
  const t = await getTranslations("account");
  const tc = await getTranslations("common");
  const profile = await getProfile();
  const restaurant = await getOwnerRestaurant();
  if (!profile || !restaurant) return null;

  const supabase = await createClient();

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("name");

  const { data: managers } = await supabase
    .from("managers")
    .select("id, profiles(full_name, email), branches(name)")
    .eq("restaurant_id", restaurant.id);

  const branchCount = branches?.length ?? 0;
  const managerRows = (managers ?? []).map((m) => {
    const mgrProfile = m.profiles as
      | { full_name: string | null; email: string }
      | { full_name: string | null; email: string }[]
      | null;
    const branch = m.branches as
      | { name: string }
      | { name: string }[]
      | null;
    const p = Array.isArray(mgrProfile) ? mgrProfile[0] : mgrProfile;
    const b = Array.isArray(branch) ? branch[0] : branch;
    return {
      id: m.id as string,
      name: p?.full_name || p?.email || "—",
      email: p?.email ?? "",
      branchName: b?.name ?? "—",
    };
  });

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("branchCount")} value={branchCount} />
        <StatCard label={t("managersTitle")} value={managerRows.length} />
        <StatCard
          label={t("activeBranches")}
          value={branchCount}
          sub={restaurant.name}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock title={t("accountDetails")} role="owner">
          <FeatureRow
            title={t("ownerName")}
            description={profile.full_name || "—"}
          />
          <FeatureRow title={t("ownerEmail")} description={profile.email} />
          <FeatureRow
            title={t("businessName")}
            description={restaurant.name}
          />
          <FeatureRow
            title={t("branchCount")}
            description={String(branchCount)}
          />
        </PanelBlock>

        <PanelBlock title={t("managersTitle")} role="owner">
          {managerRows.length === 0 ? (
            <EmptyState message={t("noManagers")} />
          ) : (
            managerRows.map((m) => (
              <FeatureRow
                key={m.id}
                title={m.name}
                description={
                  m.email ? `${m.email} · ${m.branchName}` : m.branchName
                }
              />
            ))
          )}
        </PanelBlock>
      </div>

      <div className="mt-6">
        <PanelBlock title={t("branchesTitle")} role="owner">
          {branchCount === 0 ? (
            <EmptyState message={tc("noResults")} />
          ) : (
            (branches ?? []).map((b) => (
              <FeatureRow key={b.id} title={b.name} />
            ))
          )}
        </PanelBlock>
      </div>
    </div>
  );
}
