import { AppShell } from "@/components/app-shell";
import { getProfile } from "@/lib/supabase/auth";
import { redirect } from "@/i18n/navigation";

const adminNav = [
  { href: "/admin", labelKey: "nav.dashboard" },
  { href: "/admin/restaurants", labelKey: "nav.restaurants" },
  { href: "/admin/subscriptions", labelKey: "nav.subscriptions" },
  { href: "/admin/analytics", labelKey: "nav.analytics" },
  { href: "/admin/activity", labelKey: "nav.activityLog" },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await getProfile();
  if (!profile || profile.role !== "super_admin") {
    redirect({ href: "/admin/login", locale });
  }

  return (
    <AppShell role="super_admin" navItems={adminNav}>
      {children}
    </AppShell>
  );
}
