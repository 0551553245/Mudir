"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { submitFoodSafetyReading } from "@/lib/actions/manager";
import type {
  FoodSafetyStandard,
  FoodSafetyReading,
  RangeType,
} from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";
import { startOfDay } from "date-fns";
import { StatusBadge } from "@/components/status-badge";

interface FoodSafetyPageClientProps {
  standards: FoodSafetyStandard[];
  readings: FoodSafetyReading[];
  branchId: string;
  managerId: string;
}

function formatRange(s: FoodSafetyStandard): string {
  if (s.range_type === "min_only") return `≥ ${s.min_value} ${s.unit}`;
  if (s.range_type === "max_only") return `≤ ${s.max_value} ${s.unit}`;
  return `${s.min_value} – ${s.max_value} ${s.unit}`;
}

function willFail(s: FoodSafetyStandard, raw: string): boolean | null {
  if (!raw) return null;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return null;
  const type = (s.range_type ?? "min_max") as RangeType;
  if (type === "min_only") return !(value >= (s.min_value ?? 0));
  if (type === "max_only") return !(value <= (s.max_value ?? 0));
  return !(value >= (s.min_value ?? 0) && value <= (s.max_value ?? 0));
}

export function FoodSafetyPageClient({
  standards,
  readings,
  branchId,
  managerId,
}: FoodSafetyPageClientProps) {
  const t = useTranslations("manager");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const todayStart = startOfDay(new Date());
  const myToday = useMemo(
    () =>
      readings.filter(
        (r) =>
          r.manager_id === managerId &&
          new Date(r.submitted_at) >= todayStart
      ),
    [readings, managerId, todayStart]
  );

  async function handleSubmit(standard: FoodSafetyStandard) {
    const value = values[standard.id];
    const failing = willFail(standard, value);
    if (failing && !notes[standard.id]?.trim()) {
      setMessage(t("noteRequired"));
      return;
    }

    setLoadingId(standard.id);
    setMessage(null);
    const formData = new FormData();
    formData.set("standard_id", standard.id);
    formData.set("branch_id", branchId);
    formData.set("manager_id", managerId);
    formData.set("value", value);
    if (notes[standard.id]) formData.set("note", notes[standard.id]);

    const result = await submitFoodSafetyReading(formData);
    if (result.error) {
      setMessage(result.error);
    } else if (result.notified) {
      setMessage(t("ownerNotified"));
    }
    setLoadingId(null);
    router.refresh();
  }

  function standardName(s: FoodSafetyStandard) {
    return locale === "ar" && s.name_ar ? s.name_ar : s.name;
  }

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
          {t("foodSafetyTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("foodSafetySubtitle")}</p>
      </div>

      {message && <p className="mb-4 text-sm text-accent">{message}</p>}

      {standards.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-faint">
          {tc("noResults")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {standards.map((s) => {
            const failing = willFail(s, values[s.id] ?? "");
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-border/70 bg-[#F4F4F2] p-4"
              >
                <p className="text-[14px] font-semibold text-ink">
                  {standardName(s)}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {formatRange(s)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={values[s.id] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [s.id]: e.target.value })
                    }
                    placeholder={t("enterReading")}
                    className="input-field min-w-0 flex-1 !py-2"
                  />
                  <button
                    type="button"
                    className="btn-primary shrink-0 !px-3.5 !py-2 text-sm"
                    onClick={() => handleSubmit(s)}
                    disabled={!values[s.id] || loadingId === s.id}
                  >
                    {failing ? t("submitAndNotify") : t("submit")}
                  </button>
                </div>
                {failing ? (
                  <textarea
                    value={notes[s.id] ?? ""}
                    onChange={(e) =>
                      setNotes({ ...notes, [s.id]: e.target.value })
                    }
                    placeholder={t("noteRequired")}
                    className="input-field mt-2 min-h-[64px] resize-y text-sm"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">
          {t("myReadingsToday")}
        </h2>
        {myToday.length === 0 ? (
          <p className="text-sm text-ink-faint">{tc("noResults")}</p>
        ) : (
          <div className="space-y-2">
            {myToday.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-[#F4F4F2] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.value}</p>
                  <p className="text-xs text-ink-soft">
                    {new Date(r.submitted_at).toLocaleTimeString()}
                  </p>
                </div>
                <StatusBadge status={r.passed ? "passed" : "failed"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
