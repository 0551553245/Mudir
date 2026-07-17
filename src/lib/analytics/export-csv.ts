import type { OwnerReportData } from "./fetch-owner-report";

export interface ExportLabels {
  title: string;
  restaurant: string;
  period: string;
  branch: string;
  allBranches: string;
  summary: string;
  avgCompletion: string;
  avgPassRate: string;
  totalCompletions: string;
  totalReadings: string;
  passedReadings: string;
  dailyCompletion: string;
  dailyPassRate: string;
  date: string;
  completions: string;
  expected: string;
  rate: string;
  total: string;
  passed: string;
  byBranch: string;
  branchName: string;
  completionRate: string;
  passRate: string;
  readings: string;
}

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells: (string | number)[]): string {
  return cells.map(escapeCsv).join(",");
}

export function buildReportCsv(
  data: OwnerReportData,
  labels: ExportLabels
): string {
  const lines: string[] = [];

  lines.push(row([labels.title]));
  lines.push(row([labels.restaurant, data.restaurant.name]));
  lines.push(row([labels.period, `${data.rangeStart} – ${data.rangeEnd}`]));
  lines.push(row([labels.branch, data.branchLabel === "all" ? labels.allBranches : data.branchLabel]));
  lines.push("");

  lines.push(row([labels.summary]));
  lines.push(row([labels.avgCompletion, `${data.summary.avgCompletionRate}%`]));
  lines.push(row([labels.avgPassRate, `${data.summary.avgPassRate}%`]));
  lines.push(row([labels.totalCompletions, data.summary.totalCompletions]));
  lines.push(row([labels.totalReadings, data.summary.totalReadings]));
  lines.push(row([labels.passedReadings, data.summary.totalPassed]));
  lines.push("");

  lines.push(row([labels.dailyCompletion]));
  lines.push(row([labels.date, labels.completions, labels.expected, labels.rate]));
  for (const d of data.completionSeries) {
    lines.push(row([d.date, d.completions, d.expected, `${d.rate}%`]));
  }
  lines.push("");

  lines.push(row([labels.dailyPassRate]));
  lines.push(row([labels.date, labels.total, labels.passed, labels.rate]));
  for (const d of data.passRateSeries) {
    lines.push(row([d.date, d.total, d.passed, `${d.rate}%`]));
  }
  lines.push("");

  lines.push(row([labels.byBranch]));
  lines.push(
    row([
      labels.branchName,
      labels.completions,
      labels.expected,
      labels.completionRate,
      labels.readings,
      labels.passedReadings,
      labels.passRate,
    ])
  );
  for (const b of data.branchBreakdown) {
    lines.push(
      row([
        b.branchName,
        b.completions,
        b.expected,
        `${b.completionRate}%`,
        b.readingsTotal,
        b.readingsPassed,
        `${b.passRate}%`,
      ])
    );
  }

  return "\uFEFF" + lines.join("\n");
}

export function reportFilename(
  restaurantName: string,
  format: "csv" | "pdf",
  rangePreset: string
): string {
  const slug = restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `scop-report-${slug}-${rangePreset}.${format}`;
}
