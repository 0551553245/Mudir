"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createFoodSafetyStandard } from "@/lib/actions/owner";
import { acknowledgeReading } from "@/lib/actions/settings";
import { Button, Input, Select, Modal, ModalActions, modalFormClassName, PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import { useOptionalBranchContext } from "@/components/branch-context";
import { cn } from "@/lib/utils";
import type {
  Branch,
  FoodSafetyReading,
  FoodSafetyStandard,
  RangeType,
} from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";

interface ReadingRow extends FoodSafetyReading {
  food_safety_standards?: { name: string } | null;
  branches?: { name: string } | null;
  managers?: { profiles?: { full_name: string | null } | null } | null;
}

interface FoodSafetyClientProps {
  standards: FoodSafetyStandard[];
  branches: Branch[];
  readings: ReadingRow[];
  restaurantId: string;
}

function formatRange(s: FoodSafetyStandard): string {
  if (s.range_type === "min_only") return `≥ ${s.min_value} ${s.unit}`;
  if (s.range_type === "max_only") return `≤ ${s.max_value} ${s.unit}`;
  return `${s.min_value}–${s.max_value} ${s.unit}`;
}

export function FoodSafetyClient({
  standards,
  branches,
  readings,
  restaurantId,
}: FoodSafetyClientProps) {
  const t = useTranslations("owner");
  const tr = useTranslations("rangeTypes");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const branchCtx = useOptionalBranchContext();
  const [view, setView] = useState<"log" | "grid">("log");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rangeType, setRangeType] = useState<RangeType>("min_max");
  const [showAllFailures, setShowAllFailures] = useState(false);

  const filteredStandards = useMemo(() => {
    if (!branchCtx || branchCtx.isAllBranches) return standards;
    return standards.filter(
      (s) => !s.branch_id || s.branch_id === branchCtx.selectedBranchId
    );
  }, [standards, branchCtx]);

  const unresolved = readings.filter((r) => !r.passed && !r.acknowledged_at);
  const visibleFailures = showAllFailures ? unresolved : unresolved.slice(0, 3);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("restaurant_id", restaurantId);
    formData.set("range_type", rangeType);
    const result = await createFoodSafetyStandard(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleAcknowledge(id: string) {
    await acknowledgeReading(id);
    router.refresh();
  }

  function standardName(s: FoodSafetyStandard) {
    return locale === "ar" && s.name_ar ? s.name_ar : s.name;
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <PageHeader
        title={t("foodSafetyTitle")}
        subtitle={t("foodSafetySubtitle")}
        action={
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded px-3 py-1 text-xs",
                  view === "log" ? "bg-accent text-accent-contrast" : "text-ink-soft"
                )}
                onClick={() => setView("log")}
              >
                {t("viewLog")}
              </button>
              <button
                type="button"
                className={cn(
                  "rounded px-3 py-1 text-xs",
                  view === "grid" ? "bg-accent text-accent-contrast" : "text-ink-soft"
                )}
                onClick={() => setView("grid")}
              >
                {t("viewByBranch")}
              </button>
            </div>
            <Button onClick={() => setOpen(true)}>{t("addStandard")}</Button>
          </div>
        }
      />

      {unresolved.length > 0 && (
        <div className="mb-4 space-y-2 rounded-lg border border-needs-attention/40 bg-needs-attention-bg p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-needs-attention">
              {t("unresolvedFailures")} ({unresolved.length})
            </p>
            {unresolved.length > 3 && (
              <button
                type="button"
                className="text-xs text-needs-attention underline"
                onClick={() => setShowAllFailures((v) => !v)}
              >
                {t("viewAllFailures")}
              </button>
            )}
          </div>
          {visibleFailures.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-card px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {r.branches?.name} · {r.food_safety_standards?.name}
                </p>
                <p className="text-xs text-ink-soft">
                  {r.value} · {r.managers?.profiles?.full_name ?? "—"} ·{" "}
                  {new Date(r.submitted_at).toLocaleString()}
                </p>
              </div>
              <Button onClick={() => handleAcknowledge(r.id)}>
                {t("acknowledge")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {view === "log" ? (
        <div className="space-y-4">
          <PanelBlock title={t("foodSafetyTitle")} role="owner">
            {filteredStandards.length === 0 ? (
              <EmptyState message={tc("noResults")} />
            ) : (
              filteredStandards.map((s) => (
                <FeatureRow
                  key={s.id}
                  title={standardName(s)}
                  description={`${formatRange(s)} · ${tr(s.range_type ?? "min_max")} · ${s.branch_id ? branches.find((b) => b.id === s.branch_id)?.name : tc("allBranches")}`}
                />
              ))
            )}
          </PanelBlock>

          <PanelBlock title={locale === "ar" ? "القراءات" : "Readings"} role="owner">
            {readings.length === 0 ? (
              <EmptyState message={tc("noResults")} />
            ) : (
              readings.slice(0, 40).map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "feature-row",
                    !r.passed && !r.acknowledged_at && "reading-unresolved"
                  )}
                >
                  <span className="feature-dot" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {r.food_safety_standards?.name} · {r.value}
                    </p>
                    <p className="text-[13px] text-ink-soft">
                      {r.branches?.name} · {new Date(r.submitted_at).toLocaleString()}
                      {r.passed
                        ? ""
                        : r.acknowledged_at
                          ? ` · ${t("acknowledgedAt", { time: new Date(r.acknowledged_at).toLocaleString() })}`
                          : ` · ${r.note ?? ""}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tag-pill",
                      r.passed ? "status-on-track" : "status-needs-attention"
                    )}
                  >
                    {r.passed ? "Pass" : "Fail"}
                  </span>
                </div>
              ))
            )}
          </PanelBlock>
        </div>
      ) : (
        <PanelBlock title={t("viewByBranch")} role="owner">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-start">{tc("branch")}</th>
                  {filteredStandards.map((s) => (
                    <th key={s.id} className="p-2 text-center">
                      {standardName(s)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2 font-medium">{b.name}</td>
                    {filteredStandards.map((s) => {
                      const reading = readings.find(
                        (r) =>
                          r.standard_id === s.id &&
                          r.branch_id === b.id &&
                          r.submitted_at.startsWith(today)
                      );
                      const unresolvedFail =
                        reading && !reading.passed && !reading.acknowledged_at;
                      const failed = reading && !reading.passed;
                      return (
                        <td key={s.id} className="p-1">
                          <div
                            className={cn(
                              "grid-cell",
                              !reading && "text-ink-faint",
                              reading?.passed && "status-on-track",
                              failed && !unresolvedFail && "status-behind",
                              unresolvedFail && "status-needs-attention ring-1 ring-needs-attention"
                            )}
                          >
                            {reading ? (reading.passed ? "✓" : "!") : "—"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBlock>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("addStandard")}
        footer={
          <ModalActions
            formId="standard-form"
            loading={loading}
            onCancel={() => setOpen(false)}
            submitLabel={tc("create")}
            cancelLabel={tc("cancel")}
            error={error || undefined}
          />
        }
      >
        <form
          id="standard-form"
          onSubmit={handleCreate}
          className={modalFormClassName}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Input name="name" label={t("standardName")} required />
            <Input name="name_ar" label={`${t("standardName")} (AR)`} />
          </div>
          <Select
            name="range_type_display"
            label={t("rangeType")}
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value as RangeType)}
            options={[
              { value: "min_only", label: tr("min_only") },
              { value: "max_only", label: tr("max_only") },
              { value: "min_max", label: tr("min_max") },
            ]}
          />
          <div className="grid grid-cols-2 gap-2.5">
            {(rangeType === "min_only" || rangeType === "min_max") && (
              <Input name="min_value" type="number" step="any" label={t("minValue")} required />
            )}
            {(rangeType === "max_only" || rangeType === "min_max") && (
              <Input name="max_value" type="number" step="any" label={t("maxValue")} required />
            )}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Input name="unit" label={t("unit")} defaultValue="°C" required />
            <Select
              name="check_frequency"
              label={t("checkFrequency")}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
            <Select
              name="branch_id"
              label={tc("branch")}
              options={[
                { value: "", label: tc("allBranches") },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
