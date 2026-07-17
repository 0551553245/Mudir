import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import { StatusPill } from "@/components/status-pill";
import { formatSAR } from "@/lib/utils";
import { BRANCH_PRICE_SAR } from "@/lib/supabase/types";
import type { BranchStatusVocab } from "@/lib/supabase/types";

export default async function AdminRestaurantsPage() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select(
      "*, profiles!restaurants_owner_user_id_fkey(full_name, email), branches(id), subscriptions(plan, branch_count, status, updated_at)"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title={t("restaurantsTitle")} />

      <PanelBlock title={t("restaurantsTitle")} role="super_admin">
        {(restaurants ?? []).length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          restaurants?.map((r) => {
            const branches = (r.branches as { id: string }[]) ?? [];
            const sub = Array.isArray(r.subscriptions)
              ? r.subscriptions[0]
              : (r.subscriptions as {
                  plan: string;
                  branch_count: number;
                  status: string;
                  updated_at: string;
                } | null);
            const branchCount = sub?.branch_count ?? branches.length;
            const mrr = branchCount * BRANCH_PRICE_SAR;
            const status = (sub?.status ?? r.subscription_status) as string;
            const lastActive = new Date(
              sub?.updated_at ?? r.updated_at
            ).toLocaleDateString();
            const vocab: BranchStatusVocab =
              status === "active"
                ? "on_track"
                : status === "trialing"
                  ? "behind"
                  : "needs_attention";

            return (
              <FeatureRow
                key={r.id}
                title={r.name}
                description={`${(r.profiles as { email: string })?.email} · ${sub?.plan ?? "standard"} · ${branchCount} branches · ${formatSAR(mrr, locale)}/mo · last active ${lastActive}`}
                trailing={<StatusPill status={vocab} />}
              />
            );
          })
        )}
      </PanelBlock>
    </div>
  );
}
