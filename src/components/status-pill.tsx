"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { BranchStatusVocab } from "@/lib/supabase/types";
import { statusPillClass } from "@/lib/status";

interface StatusPillProps {
  status: BranchStatusVocab;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const t = useTranslations("statusVocab");
  return (
    <span className={cn("tag-pill", statusPillClass(status), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {t(status)}
    </span>
  );
}
