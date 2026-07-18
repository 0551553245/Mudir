"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Input, Button } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";
import { updatePassword } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);

    if (result.error) {
      const map: Record<string, string> = {
        passwordTooShort: t("passwordTooShort"),
        sessionExpired: t("resetSessionExpired"),
        updateFailed: t("resetFailed"),
        sendFailed: t("twoFaSendFailed"),
        emailNotConfigured: t("twoFaSendFailed"),
      };
      setError(map[result.error] ?? t("resetFailed"));
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(result.redirectTo ?? "/login");
  }

  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <Input
          label={t("newPassword")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className="rounded-[10px] border-border bg-bg px-3.5 py-[11px] text-[13.5px]"
        />
        <Input
          label={t("confirmPassword")}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
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
          {loading ? "…" : t("resetSubmit")}
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
    </AuthShell>
  );
}
