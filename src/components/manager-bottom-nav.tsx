"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Thermometer,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/manager", labelKey: "nav.dashboard", Icon: LayoutDashboard },
  { href: "/manager/tasks", labelKey: "nav.tasks", Icon: CheckSquare },
  {
    href: "/manager/food-safety",
    labelKey: "nav.foodSafety",
    Icon: Thermometer,
  },
  { href: "/manager/schedule", labelKey: "nav.schedule", Icon: CalendarDays },
] as const;

export function ManagerBottomNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav className="manager-bottom-nav md:hidden" dir="auto">
      {tabs.map((tab) => {
        const active =
          tab.href === "/manager"
            ? pathname === "/manager"
            : pathname.startsWith(tab.href);
        const Icon = tab.Icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(active && "active")}
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.25 : 2} />
            <span>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
