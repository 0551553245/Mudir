import {
  addDays,
  addHours,
  differenceInHours,
  isAfter,
  isBefore,
  subDays,
} from "date-fns";
import type { TaskFrequency } from "@/lib/supabase/types";

const FREQUENCY_HOURS: Record<TaskFrequency, number> = {
  daily: 24,
  weekly: 24 * 7,
  monthly: 24 * 30,
};

export type ItemStatus = "pending" | "due" | "completed" | "missed";

export interface StatusInput {
  frequency: TaskFrequency;
  createdAt: Date;
  lastCompletionAt: Date | null;
  now?: Date;
}

export function getWindowHours(frequency: TaskFrequency): number {
  return FREQUENCY_HOURS[frequency];
}

/** Rolling window start: last completion or item creation */
export function getPeriodStart(input: StatusInput): Date {
  if (input.lastCompletionAt) {
    return input.lastCompletionAt;
  }
  return input.createdAt;
}

/** When the current rolling window expires */
export function getDueAt(input: StatusInput): Date {
  const start = getPeriodStart(input);
  return addHours(start, getWindowHours(input.frequency));
}

export function getItemStatus(input: StatusInput): ItemStatus {
  const now = input.now ?? new Date();
  const windowHours = getWindowHours(input.frequency);
  const dueAt = getDueAt(input);

  if (input.lastCompletionAt) {
    const hoursSinceCompletion = differenceInHours(now, input.lastCompletionAt);
    if (hoursSinceCompletion < windowHours) {
      return "completed";
    }
  }

  if (isBefore(now, dueAt)) {
    return "pending";
  }

  // Missed = two full windows passed without completion
  const missedAt = addHours(dueAt, windowHours);
  if (isAfter(now, missedAt)) {
    return "missed";
  }

  return "due";
}

export function getTodayReadingsDue(
  lastReadingAt: Date | null,
  frequency: TaskFrequency = "daily"
): boolean {
  const status = getItemStatus({
    frequency,
    createdAt: lastReadingAt ?? subDays(new Date(), 1),
    lastCompletionAt: lastReadingAt,
  });
  return status === "due" || status === "missed" || status === "pending";
}

export function frequencyLabel(
  frequency: TaskFrequency,
  locale: string
): string {
  const labels: Record<TaskFrequency, Record<string, string>> = {
    daily: { en: "Daily", ar: "يومي" },
    weekly: { en: "Weekly", ar: "أسبوعي" },
    monthly: { en: "Monthly", ar: "شهري" },
  };
  return labels[frequency][locale] ?? labels[frequency].en;
}

export function statusColor(status: ItemStatus): string {
  const map: Record<ItemStatus, string> = {
    completed: "bg-on-track-bg text-on-track",
    pending: "bg-behind-bg text-behind",
    due: "bg-info-bg text-info",
    missed: "bg-needs-attention-bg text-needs-attention",
  };
  return map[status];
}

/** All-branch items apply to every branch including ones added later */
export function appliesToBranch(
  branchId: string | null,
  targetBranchId: string
): boolean {
  return branchId === null || branchId === targetBranchId;
}
