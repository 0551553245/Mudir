"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { submitFoodSafetyReading } from "@/lib/actions/manager";
import { Button, Input, Textarea, PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock } from "@/components/panel-block";
import { StatusBadge } from "@/components/status-badge";
import type {
  FoodSafetyStandard,
  FoodSafetyReading,
  RangeType,
} from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";
import { startOfDay } from "date-fns";

interface FoodSafetyPageClientProps {
  standards: FoodSafetyStandard[];
  readings: FoodSafetyReading[];
  branchId: string;
  managerId: string;
}

function formatRange(s: FoodSafetyStandard): string {
  if (s.range_type === "min_only") return `≥ ${s.min_value} ${s.unit}`;
  if (s.range_type === "max_only") return `≤ ${s.max_value} ${s.unit}`;
  return `${s.min_value}–${s.max_value} ${s.unit}`;
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
      <PageHeader title={t("foodSafetyTitle")} subtitle={t("foodSafetySubtitle")} />
      {message && <p className="mb-4 text-sm text-accent">{message}</p>}

      {standards.length === 0 ? (
        <EmptyState message={tc("noResults")} />
      ) : (
        <PanelBlock title={t("foodSafetyTitle")} role="manager">
          {standards.map((s) => {
            const failing = willFail(s, values[s.id] ?? "");
            return (
              <div
                key={s.id}
                className="feature-row flex-col items-stretch gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className="feature-dot" />
                  <div>
                    <p className="text-sm font-semibold">{standardName(s)}</p>
                    <p className="text-[13px] text-ink-soft">{formatRange(s)}</p>
                  </div>
                </div>
                <div className="w-full space-y-2 sm:w-56">
                  <Input
                    type="number"
                    step="any"
                    value={values[s.id] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [s.id]: e.target.value })
                    }
                    placeholder={t("enterValue")}
                  />
                  {failing && (
                    <Textarea
                      value={notes[s.id] ?? ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [s.id]: e.target.value })
                      }
                      placeholder={t("noteRequired")}
                    />
                  )}
                  <Button
                    className="w-full"
                    onClick={() => handleSubmit(s)}
                    disabled={!values[s.id] || loadingId === s.id}
                  >
                    {failing ? t("submitAndNotify") : t("submit")}
                  </Button>
                </div>
              </div>
            );
          })}
        </PanelBlock>
      )}

      <div className="mt-4">
        <PanelBlock title={t("myReadingsToday")} role="manager">
          {myToday.length === 0 ? (
            <EmptyState message={tc("noResults")} />
          ) : (
            myToday.map((r) => (
              <div key={r.id} className="feature-row">
                <span className="feature-dot" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{r.value}</p>
                  <p className="text-xs text-ink-soft">
                    {new Date(r.submitted_at).toLocaleTimeString()}
                  </p>
                </div>
                <StatusBadge status={r.passed ? "passed" : "failed"} />
              </div>
            ))
          )}
        </PanelBlock>
      </div>
    </div>
  );
}
