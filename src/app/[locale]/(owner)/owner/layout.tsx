import { AppShell } from "@/components/app-shell";
import { BranchProvider } from "@/components/branch-context";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { initialsFromName } from "@/components/manager-ui";
import { getProfile, getOwnerRestaurant } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

const ownerNav = [
  { href: "/owner", labelKey: "nav.dashboard" },
  { href: "/owner/branches", labelKey: "nav.branches" },
  { href: "/owner/managers", labelKey: "nav.managers" },
  { href: "/owner/tasks", labelKey: "nav.tasks" },
  { href: "/owner/food-safety", labelKey: "nav.foodSafety" },
  { href: "/owner/schedule", labelKey: "nav.schedule" },
  { href: "/owner/reports", labelKey: "nav.reports" },
  { href: "/owner/billing", labelKey: "nav.billing" },
];

export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await getProfile();
  if (!profile || profile.role !== "owner") {
    redirect({ href: "/login", locale });
    return null;
  }

  const restaurant = await getOwnerRestaurant();
  const supabase = await createClient();
  const { data: branches } = restaurant
    ? await supabase
        .from("branches")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("name")
    : { data: [] };

  return (
    <BranchProvider branches={branches ?? []}>
      <SubscriptionBanner />
      <AppShell
        role="owner"
        navItems={ownerNav}
        restaurantId={restaurant?.id}
        showBranchSwitcher
        userInitials={initialsFromName(profile.full_name, profile.email)}
        profileHref="/owner/account"
      >
        {children}
      </AppShell>
    </BranchProvider>
  );
}
