import { AppShell } from "@/components/app-shell";
import { ManagerBottomNav } from "@/components/manager-bottom-nav";
import { getProfile } from "@/lib/supabase/auth";
import { redirect } from "@/i18n/navigation";

const managerNav = [
  { href: "/manager", labelKey: "nav.dashboard" },
  { href: "/manager/tasks", labelKey: "nav.tasks" },
  { href: "/manager/food-safety", labelKey: "nav.foodSafety" },
  { href: "/manager/schedule", labelKey: "nav.schedule" },
  { href: "/manager/profile", labelKey: "nav.profile" },
];

export default async function ManagerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await getProfile();
  if (!profile || profile.role !== "manager") {
    redirect({ href: "/manager/login", locale });
  }

  return (
    <AppShell
      role="manager"
      navItems={managerNav}
      mobileBottomNav={<ManagerBottomNav />}
    >
      {children}
    </AppShell>
  );
}
