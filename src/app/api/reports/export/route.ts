import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant, getProfile } from "@/lib/supabase/auth";
import { fetchOwnerReportData } from "@/lib/analytics/fetch-owner-report";
import { buildReportCsv, reportFilename } from "@/lib/analytics/export-csv";
import { buildReportPdf } from "@/lib/analytics/export-pdf";
import { EXPORT_LABELS } from "@/lib/analytics/export-labels";
import type { DateRangePreset } from "@/lib/analytics/types";
import type { ExportLocale } from "@/lib/analytics/export-labels";

export async function GET(request: NextRequest) {
  const profile = await getProfile();
  const restaurant = await getOwnerRestaurant();

  if (!profile || profile.role !== "owner" || !restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format") ?? "csv";
  const rangePreset = (
    ["7d", "30d", "90d"].includes(searchParams.get("range") ?? "")
      ? searchParams.get("range")
      : "30d"
  ) as DateRangePreset;
  const branchFilter = searchParams.get("branch") ?? "all";
  const locale = (profile.locale ?? "en") as ExportLocale;
  const labels = EXPORT_LABELS[locale] ?? EXPORT_LABELS.en;

  const supabase = await createClient();
  const report = await fetchOwnerReportData(
    supabase,
    restaurant,
    rangePreset,
    branchFilter
  );

  const filename = reportFilename(restaurant.name, format as "csv" | "pdf", rangePreset);

  if (format === "csv") {
    const csv = buildReportCsv(report, labels);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "pdf") {
    const pdfBytes = buildReportPdf(report, labels);
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}
