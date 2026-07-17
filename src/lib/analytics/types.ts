export type DateRangePreset = "1d" | "7d" | "30d" | "90d";

/** Admin analytics only supports multi-day windows. */
export type AdminDateRangePreset = "7d" | "30d" | "90d";

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset | AdminDateRangePreset;
}

export interface DailyCompletionPoint {
  date: string;
  completions: number;
  expected: number;
  rate: number;
}

export interface DailyPassRatePoint {
  date: string;
  total: number;
  passed: number;
  rate: number;
}

export interface BranchReportRow {
  branchId: string;
  branchName: string;
  completions: number;
  expected: number;
  completionRate: number;
  readingsTotal: number;
  readingsPassed: number;
  passRate: number;
}

export interface OwnerReportSummary {
  avgCompletionRate: number;
  avgPassRate: number;
  totalCompletions: number;
  totalReadings: number;
  totalPassed: number;
}

export interface DailyCountPoint {
  date: string;
  count: number;
}

export interface AdminAnalyticsSummary {
  totalRestaurants: number;
  activeTrials: number;
  payingCustomers: number;
  enterpriseCustomers: number;
  estimatedMrr: number;
  totalBranches: number;
  completionsInPeriod: number;
  readingsInPeriod: number;
}

export interface SubscriptionBreakdown {
  trialing: number;
  active: number;
  past_due: number;
  canceled: number;
  enterprise: number;
}
