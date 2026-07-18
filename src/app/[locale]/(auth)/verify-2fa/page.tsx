"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input, Button } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";
import {
  getFirstLoginStatus,
  sendFirstLoginOtp,
  verifyFirstLoginOtp,
} from "@/lib/actions/auth";
import { ROLE_ROUTES } from "@/lib/supabase/types";

export default function Verify2faPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const status = await getFirstLoginStatus();
      if (cancelled) return;

      if (!status.needsVerification) {
        router.replace(status.role ? ROLE_ROUTES[status.role] : "/login");
        return;
      }

      setEmail(status.email ?? "");
      const sent = await sendFirstLoginOtp();
      if (cancelled) return;

      if (sent.alreadyVerified) {
        router.replace(status.role ? ROLE_ROUTES[status.role] : "/");
        return;
      }
      if (sent.error) {
        const map: Record<string, string> = {
          sendFailed: t("twoFaSendFailed"),
          emailNotConfigured: t("twoFaSendFailed"),
          unauthorized: t("twoFaUnauthorized"),
        };
        setError(map[sent.error] ?? t("twoFaSendFailed"));
      } else {
        setInfo(t("twoFaSent"));
      }
      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount to send a single OTP.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await verifyFirstLoginOtp(code);
    if (result.error) {
      const map: Record<string, string> = {
        invalidCode: t("twoFaInvalidCode"),
        codeExpired: t("twoFaCodeExpired"),
        tooManyAttempts: t("twoFaTooManyAttempts"),
        unauthorized: t("twoFaUnauthorized"),
      };
      setError(map[result.error] ?? t("twoFaInvalidCode"));
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(result.redirectTo ?? "/");
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setInfo("");
    const sent = await sendFirstLoginOtp();
    if (sent.error) {
      setError(t("twoFaSendFailed"));
    } else {
      setInfo(t("twoFaSent"));
    }
    setResending(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <AuthShell title={t("twoFaTitle")} subtitle={t("twoFaSubtitle")}>
      {!ready ? (
        <p className="text-center text-[13.5px] text-ink-soft">…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          {email ? (
            <p className="text-center text-[13px] text-ink-soft">
              {t("twoFaSentTo", { email })}
            </p>
          ) : null}

          <Input
            label={t("twoFaCode")}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
            maxLength={6}
            placeholder="000000"
            className="rounded-[10px] border-border bg-bg px-3.5 py-[11px] text-center font-[family-name:var(--font-ibm-plex-mono)] text-[18px] tracking-[0.35em]"
          />

          {info ? (
            <p className="text-center text-[13px] text-deep-palm">{info}</p>
          ) : null}
          {error ? (
            <p className="text-sm text-needs-attention">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-[10px] bg-accent py-[13px] text-[14.5px] font-semibold text-white hover:bg-accent-hover"
          >
            {loading ? "…" : t("twoFaVerify")}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-center font-[family-name:var(--font-ibm-plex-mono)] text-[11.5px] text-accent hover:underline disabled:opacity-50"
          >
            {resending ? "…" : t("twoFaResend")}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-center text-[12.5px] text-ink-faint hover:text-ink-soft"
          >
            {t("twoFaSignOut")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
