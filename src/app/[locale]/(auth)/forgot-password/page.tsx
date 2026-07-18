"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Input, Button } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await requestPasswordReset(email, locale);
    if (result.error === "missingEmail") {
      setError(t("forgotMissingEmail"));
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <AuthShell title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
      {sent ? (
        <div className="flex flex-col gap-[18px]">
          <p className="text-center text-[13.5px] text-ink-soft">
            {t("forgotSent")}
          </p>
          <Link
            href="/login"
            className="text-center text-[13px] font-semibold text-accent hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          <Input
            label={t("email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@restaurant.com"
            className="rounded-[10px] border-border bg-bg px-3.5 py-[11px] text-[13.5px]"
          />

          {error ? (
            <p className="text-sm text-needs-attention">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-[10px] bg-accent py-[13px] text-[14.5px] font-semibold text-white hover:bg-accent-hover"
          >
            {loading ? "…" : t("forgotSubmit")}
          </Button>

          <p className="text-center text-[13px] text-ink-soft">
            <Link
              href="/login"
              className="font-semibold text-accent hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
