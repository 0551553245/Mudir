"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AdminDateRangePreset } from "@/lib/analytics/types";

interface AnalyticsFiltersProps {
  currentRange: AdminDateRangePreset;
}

export function AnalyticsFilters({ currentRange }: AnalyticsFiltersProps) {
  const t = useTranslations("analytics");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ranges: AdminDateRangePreset[] = ["7d", "30d", "90d"];

  function updateRange(r: AdminDateRangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", r);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const rangeLabels: Record<AdminDateRangePreset, string> = {
    "7d": t("range7d"),
    "30d": t("range30d"),
    "90d": t("range90d"),
  };

  return (
    <div className="mb-8 flex w-fit rounded-xl border border-border p-0.5">
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => updateRange(r)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            currentRange === r
              ? "bg-accent text-accent-contrast"
              : "text-ink-soft hover:text-ink"
          )}
        >
          {rangeLabels[r]}
        </button>
      ))}
    </div>
  );
}
