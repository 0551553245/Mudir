"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MudirWordmark } from "@/components/mudir-logo";

interface AuthShellProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Hide default title/subtitle when the form owns its own headers. */
  hideHeader?: boolean;
  className?: string;
  footer?: React.ReactNode;
}

/** Visual-only auth layout — centered card matching Mudir Owner/Manager Panel login. */
export function AuthShell({
  title,
  subtitle,
  children,
  hideHeader = false,
  className,
  footer,
}: AuthShellProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-bg px-4 py-10",
        className
      )}
    >
      <div className="my-[60px] flex w-full max-w-[400px] flex-col gap-6">
        <Link href="/" className="flex justify-center">
          <MudirWordmark name={tc("appName")} size={36} />
        </Link>

        <div className="flex flex-col gap-[18px] rounded-[20px] border border-border bg-card p-8 shadow-[0_12px_40px_rgba(1,63,50,0.08)]">
          {!hideHeader && title ? (
            <div className="text-center">
              <h1 className="font-[family-name:var(--font-baloo)] text-[22px] font-bold text-forest">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 text-[13.5px] text-ink-soft">{subtitle}</p>
              ) : null}
            </div>
          ) : null}

          {children}
        </div>

        {footer ? (
          <div className="text-center text-[12.5px] text-ink-faint">{footer}</div>
        ) : (
          <div className="flex justify-center gap-4 text-xs text-ink-soft">
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-forest"
            >
              {t("footerPrivacy")}
            </Link>
            <Link
              href="/terms-of-service"
              className="transition-colors hover:text-forest"
            >
              {t("footerTerms")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
