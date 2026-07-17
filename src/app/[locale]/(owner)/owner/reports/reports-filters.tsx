"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Branch } from "@/lib/supabase/types";
import type { DateRangePreset } from "@/lib/analytics/types";

interface ReportsFiltersProps {
  branches: Branch[];
  currentRange: DateRangePreset;
  currentBranch: string;
}

export function ReportsFilters({
  branches,
  currentRange,
  currentBranch,
}: ReportsFiltersProps) {
  const t = useTranslations("reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const ranges: DateRangePreset[] = ["1d", "7d", "30d", "90d"];
  const rangeLabels: Record<DateRangePreset, string> = {
    "1d": t("range1d"),
    "7d": t("range7d"),
    "30d": t("range30d"),
    "90d": t("range90d"),
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex rounded-md border border-border p-0.5">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => updateParams("range", r)}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition",
              currentRange === r
                ? "bg-accent text-accent-contrast"
                : "text-ink-soft hover:text-ink"
            )}
          >
            {rangeLabels[r]}
          </button>
        ))}
      </div>

      <select
        value={currentBranch}
        onChange={(e) => updateParams("branch", e.target.value)}
        className="input-field w-auto min-w-[160px]"
      >
        <option value="all">{t("allBranches")}</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
