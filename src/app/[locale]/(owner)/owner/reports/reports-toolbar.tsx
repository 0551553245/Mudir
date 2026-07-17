"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function ReportsToolbar() {
  const t = useTranslations("reports");
  const searchParams = useSearchParams();

  const range = searchParams.get("range") ?? "30d";
  const branch = searchParams.get("branch") ?? "all";

  function exportUrl(format: "csv" | "pdf") {
    const params = new URLSearchParams({ format, range, branch });
    return `/api/reports/export?${params.toString()}`;
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <a href={exportUrl("csv")} className="btn-secondary">
        {t("exportCsv")}
      </a>
      <a href={exportUrl("pdf")} className="btn-secondary">
        {t("exportPdf")}
      </a>
    </div>
  );
}
