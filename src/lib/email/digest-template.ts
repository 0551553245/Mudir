import type { OwnerReportData } from "@/lib/analytics/fetch-owner-report";
import type { ExportLocale } from "@/lib/analytics/export-labels";
import { EXPORT_LABELS } from "@/lib/analytics/export-labels";

interface DigestCopy {
  subject: string;
  preview: string;
  heading: string;
  greeting: string;
  period: string;
  summaryTitle: string;
  avgCompletion: string;
  avgPassRate: string;
  completions: string;
  readings: string;
  passed: string;
  viewReports: string;
  footer: string;
  branchTitle: string;
}

const COPY: Record<ExportLocale, DigestCopy> = {
  en: {
    subject: "Your weekly Scop operations report",
    preview: "Completion and food safety summary for the past 7 days",
    heading: "Weekly operations digest",
    greeting: "Here's how your branches performed this week.",
    period: "Period",
    summaryTitle: "Summary",
    avgCompletion: "Avg completion rate",
    avgPassRate: "Avg food safety pass rate",
    completions: "Task completions",
    readings: "Food safety readings",
    passed: "Passed readings",
    viewReports: "View full reports",
    footer: "You're receiving this because weekly digests are enabled for your Scop account.",
    branchTitle: "By branch",
  },
  ar: {
    subject: "تقرير عمليات سكوب الأسبوعي",
    preview: "ملخص الإنجاز وسلامة الغذاء لآخر 7 أيام",
    heading: "ملخص العمليات الأسبوعي",
    greeting: "إليك أداء فروعك هذا الأسبوع.",
    period: "الفترة",
    summaryTitle: "الملخص",
    avgCompletion: "متوسط معدل الإنجاز",
    avgPassRate: "متوسط نجاح سلامة الغذاء",
    completions: "إنجاز المهام",
    readings: "قراءات سلامة الغذاء",
    passed: "قراءات ناجحة",
    viewReports: "عرض التقارير الكاملة",
    footer: "تتلقى هذا البريد لأن الملخصات الأسبوعية مفعّلة في حسابك على سكوب.",
    branchTitle: "حسب الفرع",
  },
};

export function buildDigestEmail(
  data: OwnerReportData,
  locale: ExportLocale,
  ownerName: string | null,
  appUrl: string
): { subject: string; html: string; text: string } {
  const c = COPY[locale];
  const labels = EXPORT_LABELS[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const reportsUrl = `${appUrl}/${locale}/owner/reports?range=7d`;

  const branchRows = data.branchBreakdown
    .map(
      (b) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;">${escapeHtml(b.branchName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;text-align:center;">${b.completionRate}%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #E8E4DC;text-align:center;">${b.passRate}%</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#FAF4E6;font-family:Inter,Segoe UI,sans-serif;color:#2C2723;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#151311;color:#F5F1EA;border-radius:18px 18px 0 0;padding:24px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8;">Scop</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:500;">${c.heading}</h1>
    </div>
    <div style="background:#FFFDF7;border:1px solid #E6D4C8;border-top:none;border-radius:0 0 18px 18px;padding:24px;">
      <p style="margin:0 0 8px;">${ownerName ? `${ownerName},` : ""} ${c.greeting}</p>
      <p style="margin:0 0 20px;font-size:13px;color:#54504C;">${c.period}: ${data.rangeStart} – ${data.rangeEnd} · ${escapeHtml(data.restaurant.name)}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#FAF4E6;">
          <td style="padding:12px;font-size:13px;">${c.avgCompletion}</td>
          <td style="padding:12px;font-size:20px;font-weight:600;color:#A97C3F;text-align:end;">${data.summary.avgCompletionRate}%</td>
        </tr>
        <tr>
          <td style="padding:12px;font-size:13px;">${c.avgPassRate}</td>
          <td style="padding:12px;font-size:20px;font-weight:600;color:#A97C3F;text-align:end;">${data.summary.avgPassRate}%</td>
        </tr>
        <tr style="background:#FAF4E6;">
          <td style="padding:12px;font-size:13px;">${c.completions}</td>
          <td style="padding:12px;font-size:16px;text-align:end;">${data.summary.totalCompletions}</td>
        </tr>
        <tr>
          <td style="padding:12px;font-size:13px;">${c.readings}</td>
          <td style="padding:12px;font-size:16px;text-align:end;">${data.summary.totalReadings}</td>
        </tr>
        <tr style="background:#FAF4E6;">
          <td style="padding:12px;font-size:13px;">${c.passed}</td>
          <td style="padding:12px;font-size:16px;text-align:end;">${data.summary.totalPassed}</td>
        </tr>
      </table>

      ${
        data.branchBreakdown.length > 0
          ? `<p style="font-size:13px;font-weight:600;margin:0 0 8px;">${c.branchTitle}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead>
          <tr style="background:#FAF4E6;">
            <th style="padding:8px 12px;text-align:start;">${labels.branchName}</th>
            <th style="padding:8px 12px;text-align:center;">${labels.completionRate}</th>
            <th style="padding:8px 12px;text-align:center;">${labels.passRate}</th>
          </tr>
        </thead>
        <tbody>${branchRows}</tbody>
      </table>`
          : ""
      }

      <a href="${reportsUrl}" style="display:inline-block;background:#A97C3F;color:#FAF4E6;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600;">${c.viewReports}</a>
      <p style="margin:24px 0 0;font-size:11px;color:#978F84;">${c.footer}</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    c.heading,
    `${c.period}: ${data.rangeStart} – ${data.rangeEnd}`,
    `${c.avgCompletion}: ${data.summary.avgCompletionRate}%`,
    `${c.avgPassRate}: ${data.summary.avgPassRate}%`,
    `${c.completions}: ${data.summary.totalCompletions}`,
    `${c.readings}: ${data.summary.totalReadings}`,
    `${c.viewReports}: ${reportsUrl}`,
  ].join("\n");

  return { subject: c.subject, html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
