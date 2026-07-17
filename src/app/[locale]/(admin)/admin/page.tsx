import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow, StatCard } from "@/components/panel-block";
import { StatusBadge } from "@/components/status-badge";
import { formatSAR } from "@/lib/utils";
import { BRANCH_PRICE_SAR } from "@/lib/supabase/types";

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select(
      "*, profiles!restaurants_owner_user_id_fkey(full_name, email), branches(id)"
    )
    .order("created_at", { ascending: false });

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*");

  const { count: customerCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");

  const { count: branchCount } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const total = restaurants?.length ?? 0;
  const trialing =
    subscriptions?.filter((s) => s.status === "trialing").length ?? 0;
  const paying =
    subscriptions?.filter((s) => s.status === "active").length ?? 0;
  const overdue =
    subscriptions?.filter((s) => s.status === "past_due").length ?? 0;
  const mrr =
    (subscriptions ?? [])
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.branch_count * BRANCH_PRICE_SAR, 0);

  const { data: recentActivity } = await supabase
    .from("activity_log")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <PageHeader title={t("dashboardTitle")} />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("totalRestaurants")} value={total} />
        <StatCard label={t("payingCustomers")} value={paying} />
        <StatCard label={t("activeTrials")} value={trialing} />
        <StatCard label={t("overdueCustomers")} value={overdue} />
        <StatCard label={t("mrr")} value={formatSAR(mrr, locale)} />
        <StatCard
          label={t("totalCustomers")}
          value={customerCount ?? 0}
          sub={`${branchCount ?? 0} ${t("totalBranches").toLowerCase()}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock
          title={t("restaurantsTitle")}
          role="super_admin"
          action={
            <Link
              href="/admin/restaurants"
              className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold text-accent hover:underline"
            >
              {t("viewAll")} →
            </Link>
          }
        >
          {(restaurants ?? []).length === 0 ? (
            <EmptyState message={tc("noResults")} />
          ) : (
            (restaurants ?? []).slice(0, 8).map((r) => (
              <FeatureRow
                key={r.id}
                title={r.name}
                description={
                  (r.profiles as { email: string } | null)?.email ?? undefined
                }
                trailing={
                  <StatusBadge
                    status={
                      r.subscription_status === "active"
                        ? "completed"
                        : r.subscription_status === "trialing"
                          ? "pending"
                          : "missed"
                    }
                  />
                }
              />
            ))
          )}
        </PanelBlock>

        <PanelBlock
          title={t("recentActivity")}
          role="super_admin"
          action={
            <Link
              href="/admin/activity"
              className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold text-accent hover:underline"
            >
              {t("viewAll")} →
            </Link>
          }
        >
          {(recentActivity ?? []).length === 0 ? (
            <EmptyState message={tc("noResults")} />
          ) : (
            (recentActivity ?? []).map((a) => (
              <FeatureRow
                key={a.id}
                title={a.action}
                description={`${(a.profiles as { email: string } | null)?.email ?? "system"} · ${new Date(a.created_at).toLocaleString(locale)}`}
              />
            ))
          )}
        </PanelBlock>
      </div>
    </div>
  );
}
