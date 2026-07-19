import { AppShell } from "@/components/app-shell";
import { ManagerBottomNav } from "@/components/manager-bottom-nav";
import { initialsFromName } from "@/components/manager-ui";
import { getManagerContext, getProfile } from "@/lib/supabase/auth";
import { redirect } from "@/i18n/navigation";

const managerNav = [
  { href: "/manager", labelKey: "nav.dashboard" },
  { href: "/manager/tasks", labelKey: "nav.tasks" },
  { href: "/manager/food-safety", labelKey: "nav.foodSafety" },
  { href: "/manager/schedule", labelKey: "nav.schedule" },
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

  const context = await getManagerContext();
  const branch = context?.branches as
    | { name: string; address: string | null }
    | undefined;
  const branchLabel = branch
    ? branch.address
      ? `${branch.name} — ${branch.address}`
      : branch.name
    : undefined;

  return (
    <AppShell
      role="manager"
      navItems={managerNav}
      mobileBottomNav={<ManagerBottomNav />}
      branchLabel={branchLabel}
      userInitials={initialsFromName(profile?.full_name, profile?.email)}
      profileHref="/manager/profile"
    >
      {children}
    </AppShell>
  );
}
