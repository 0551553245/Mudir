import type { BranchStatusVocab } from "@/lib/supabase/types";
import type { ItemStatus } from "@/lib/tasks/period";

export type { BranchStatusVocab };

/** Map counts → On track / Behind / Needs attention */
export function toBranchStatus(
  missed: number,
  due: number,
  pending: number,
  completed: number,
  total: number
): BranchStatusVocab {
  if (total === 0) return "on_track";
  if (missed > 0) return "needs_attention";
  if (due > 0 || pending > 0) return "behind";
  if (completed === total) return "on_track";
  return "behind";
}

export function itemStatusToVocab(status: ItemStatus): BranchStatusVocab {
  if (status === "missed") return "needs_attention";
  if (status === "due" || status === "pending") return "behind";
  return "on_track";
}

export function statusPillClass(status: BranchStatusVocab): string {
  if (status === "on_track") return "status-on-track";
  if (status === "behind") return "status-behind";
  return "status-needs-attention";
}
