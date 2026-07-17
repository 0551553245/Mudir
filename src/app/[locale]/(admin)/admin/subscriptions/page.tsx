import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import { StatusBadge } from "@/components/status-badge";
import { formatSAR } from "@/lib/utils";
import { BRANCH_PRICE_SAR } from "@/lib/supabase/types";

export default async function AdminSubscriptionsPage() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*, restaurants(name, profiles!restaurants_owner_user_id_fkey(email))")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title={t("subscriptionsTitle")} />

      <PanelBlock title={t("subscriptionsTitle")} role="super_admin">
        {(subscriptions ?? []).length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          subscriptions?.map((s) => {
            const restaurant = s.restaurants as {
              name: string;
              profiles: { email: string };
            };
            return (
              <FeatureRow
                key={s.id}
                title={restaurant?.name ?? "—"}
                description={`${restaurant?.profiles?.email} · ${s.branch_count} branches · ${formatSAR(s.branch_count * BRANCH_PRICE_SAR, locale)}/mo`}
                trailing={
                  <StatusBadge
                    status={
                      s.status === "active"
                        ? "completed"
                        : s.status === "trialing"
                          ? "pending"
                          : "missed"
                    }
                  />
                }
              />
            );
          })
        )}
      </PanelBlock>
    </div>
  );
}
