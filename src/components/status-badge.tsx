import { cn } from "@/lib/utils";
import type { ItemStatus } from "@/lib/tasks/period";
import { useTranslations } from "next-intl";

const styles: Record<ItemStatus | "passed" | "failed", string> = {
  pending: "bg-behind-bg text-behind",
  due: "bg-info-bg text-info",
  completed: "bg-on-track-bg text-on-track",
  missed: "bg-needs-attention-bg text-needs-attention",
  passed: "bg-on-track-bg text-on-track",
  failed: "bg-needs-attention-bg text-needs-attention",
};

interface StatusBadgeProps {
  status: ItemStatus | "passed" | "failed";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations("status");
  return (
    <span className={cn("tag-pill", styles[status], className)}>
      {t(status)}
    </span>
  );
}
