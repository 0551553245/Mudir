"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

export function BackToHome({ className = "" }: { className?: string }) {
  const t = useTranslations("common");

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink ${className}`}
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      {t("backToHome")}
    </Link>
  );
}
