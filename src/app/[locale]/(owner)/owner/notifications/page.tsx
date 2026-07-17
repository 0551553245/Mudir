import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PanelBlock title={t("feed")} role="owner">
        {(data ?? []).length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          data?.map((n) => (
            <FeatureRow
              key={n.id}
              title={n.title}
              description={`${n.type} · ${new Date(n.created_at).toLocaleString()}${n.body ? ` · ${n.body}` : ""}`}
            />
          ))
        )}
      </PanelBlock>
    </div>
  );
}
