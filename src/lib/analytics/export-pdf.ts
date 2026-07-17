import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { OwnerReportData } from "./fetch-owner-report";
import type { ExportLabels } from "./export-csv";

export function buildReportPdf(
  data: OwnerReportData,
  labels: ExportLabels
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 45, 32);
  doc.text(labels.title, margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(87, 83, 78);
  doc.text(`${labels.restaurant}: ${data.restaurant.name}`, margin, y);
  y += 5;
  doc.text(`${labels.period}: ${data.rangeStart} – ${data.rangeEnd}`, margin, y);
  y += 5;
  doc.text(`${labels.branch}: ${data.branchLabel === "all" ? labels.allBranches : data.branchLabel}`, margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [[labels.summary, ""]],
    body: [
      [labels.avgCompletion, `${data.summary.avgCompletionRate}%`],
      [labels.avgPassRate, `${data.summary.avgPassRate}%`],
      [labels.totalCompletions, String(data.summary.totalCompletions)],
      [labels.totalReadings, String(data.summary.totalReadings)],
      [labels.passedReadings, String(data.summary.totalPassed)],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [27, 67, 50], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 40 } },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: y,
    head: [[labels.date, labels.completions, labels.rate]],
    body: data.completionSeries.map((d) => [
      d.date,
      String(d.completions),
      `${d.rate}%`,
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 67, 50], textColor: 255 },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(156, 150, 145);
      doc.text(labels.dailyCompletion, margin, 8);
    },
  });

  doc.addPage();
  y = margin;

  autoTable(doc, {
    startY: y,
    head: [[labels.date, labels.total, labels.passed, labels.rate]],
    body: data.passRateSeries
      .filter((d) => d.total > 0)
      .map((d) => [d.date, String(d.total), String(d.passed), `${d.rate}%`]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 67, 50], textColor: 255 },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.text(labels.dailyPassRate, margin, 8);
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  if (y > 240) {
    doc.addPage();
    y = margin;
  }

  autoTable(doc, {
    startY: y,
    head: [
      [
        labels.branchName,
        labels.completionRate,
        labels.passRate,
        labels.completions,
        labels.totalReadings,
      ],
    ],
    body: data.branchBreakdown.map((b) => [
      b.branchName,
      `${b.completionRate}%`,
      `${b.passRate}%`,
      String(b.completions),
      String(b.readingsTotal),
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 67, 50], textColor: 255 },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.text(labels.byBranch, margin, 8);
    },
  });

  doc.setFontSize(7);
  doc.setTextColor(156, 150, 145);
  doc.text("Scop · scopsa.com", margin, 290);

  return new Uint8Array(doc.output("arraybuffer"));
}
