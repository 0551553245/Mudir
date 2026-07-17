"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CheckSquare,
  Thermometer,
  CalendarDays,
  BarChart3,
  CreditCard,
  Settings,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleTag } from "./role-tag";
import { BranchSwitcher } from "./branch-switcher";
import { NotificationsBell } from "./notifications-bell";
import type { UserRole } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { localeNames, type Locale } from "@/i18n/config";

interface NavItem {
  href: string;
  labelKey: string;
}

interface AppShellProps {
  role: UserRole;
  navItems: NavItem[];
  children: React.ReactNode;
  restaurantId?: string;
  showBranchSwitcher?: boolean;
  mobileBottomNav?: React.ReactNode;
}

const NAV_ICONS: Record<string, LucideIcon> = {
  "/owner": LayoutDashboard,
  "/owner/branches": Building2,
  "/owner/managers": Users,
  "/owner/tasks": CheckSquare,
  "/owner/food-safety": Thermometer,
  "/owner/schedule": CalendarDays,
  "/owner/reports": BarChart3,
  "/owner/billing": CreditCard,
  "/owner/account": UserCircle,
  "/owner/settings": Settings,
  "/manager": LayoutDashboard,
  "/manager/tasks": CheckSquare,
  "/manager/food-safety": Thermometer,
  "/manager/schedule": CalendarDays,
  "/admin": LayoutDashboard,
};

function isNavActive(pathname: string, href: string) {
  if (
    href === "/owner" ||
    href === "/manager" ||
    href === "/admin"
  ) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function AppShell({
  role,
  navItems,
  children,
  restaurantId,
  showBranchSwitcher = false,
  mobileBottomNav,
}: AppShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(
      role === "super_admin"
        ? "/admin/login"
        : role === "manager"
          ? "/manager/login"
          : "/login"
    );
    router.refresh();
  }

  function switchLocale(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className={cn("min-h-screen bg-bg", mobileBottomNav && "pb-20 md:pb-0")}
    >
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[236px] flex-col border-e border-border bg-card md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-2 pt-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent font-[family-name:var(--font-outfit)] text-base font-semibold text-white">
              S
            </span>
            <span className="font-[family-name:var(--font-outfit)] text-[19px] font-semibold text-deep-palm">
              {t("common.appName")}
            </span>
          </Link>
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto px-4">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = NAV_ICONS[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-link", active && "nav-link-active")}
              >
                {Icon ? (
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                ) : null}
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          {role === "super_admin" ? (
            <p className="mb-3 px-1">
              <span className="inline-block rounded-full bg-deep-palm px-2.5 py-[3px] font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase text-white">
                {t("auth.adminInternalTag")}
              </span>
            </p>
          ) : null}
          <div className="flex items-center gap-3 rounded-[10px] bg-bg px-3 py-2.5">
            <RoleTag role={role} />
            <button
              type="button"
              onClick={handleSignOut}
              className="ms-auto text-[12.5px] font-semibold text-ink-soft hover:text-deep-palm"
            >
              {t("common.signOut")}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:ps-[236px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-bg px-4 pb-3 pt-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 md:hidden"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-[family-name:var(--font-outfit)] text-sm font-semibold text-white">
                S
              </span>
            </Link>
            {showBranchSwitcher && <BranchSwitcher />}
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {restaurantId && role === "owner" && (
              <NotificationsBell restaurantId={restaurantId} />
            )}
            <div className="hidden items-center gap-0.5 rounded-[10px] border border-border bg-bg p-[3px] font-[family-name:var(--font-ibm-plex-mono)] text-[11.5px] font-semibold sm:flex">
              {(["ar", "en"] as Locale[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => switchLocale(l)}
                  className={cn(
                    "rounded-[7px] px-2.5 py-1.5 transition-colors",
                    currentLocale === l
                      ? "bg-[#1B4332] text-white"
                      : "text-ink-soft hover:text-deep-palm"
                  )}
                >
                  {localeNames[l]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[13px] font-medium text-ink-soft hover:text-deep-palm md:hidden"
            >
              {t("common.signOut")}
            </button>
          </div>
        </header>

        {!mobileBottomNav && (
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-[10px] px-3 py-2 text-xs font-semibold",
                    active
                      ? "bg-[#1B4332] text-[#F7F5F0]"
                      : "text-ink-soft hover:text-deep-palm"
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        )}

        <main className="relative z-10 mx-auto w-full max-w-[1320px] flex-1 px-4 pb-8 pt-2 md:px-8">
          {children}
        </main>
      </div>

      {mobileBottomNav}
    </div>
  );
}
