"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input, Button } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";
import { cn } from "@/lib/utils";

const inputClass =
  "rounded-[10px] border-border bg-bg px-3.5 py-[11px] text-[13.5px]";

export default function SignupPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 3) return;

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? t("invalidCredentials"));
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: "owner",
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (restaurantName) {
      await supabase
        .from("restaurants")
        .update({ name: restaurantName })
        .eq("owner_user_id", authData.user.id);
    }

    router.refresh();
    router.push("/owner");
  }

  function goNextFromStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantName.trim()) return;
    setStep(2);
  }

  function goNextFromStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 8) return;
    setStep(3);
  }

  const stepTitle =
    step === 1
      ? t("signupTitle")
      : step === 2
        ? t("stepContactTitle")
        : t("stepConfirmTitle");
  const stepSub =
    step === 1
      ? t("signupSubtitle")
      : step === 2
        ? t("stepContactSub")
        : t("stepConfirmSub");

  return (
    <AuthShell hideHeader>
      <div className="flex flex-col gap-[18px]">
        <div className="flex justify-center gap-1.5" aria-hidden>
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className={cn(
                "h-1.5 w-7 rounded-full transition-colors",
                step >= n ? "bg-accent" : "bg-border"
              )}
            />
          ))}
        </div>

        <div className="text-center">
          <h1 className="font-[family-name:var(--font-outfit)] text-[22px] font-medium text-deep-palm">
            {stepTitle}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-soft">{stepSub}</p>
        </div>

        {step === 1 ? (
          <form onSubmit={goNextFromStep1} className="flex flex-col gap-[18px]">
            <p className="text-center text-[11.5px] font-semibold text-accent">
              {t("ownerOnly")}
            </p>
            <Input
              label={t("restaurantName")}
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. Al Baik Express"
            />
            <Button
              type="submit"
              className="w-full rounded-[10px] bg-accent py-[13px] text-[14.5px] font-semibold text-white hover:bg-accent-hover"
            >
              {t("nextContact")}
            </Button>
            <p className="text-center text-[13px] text-ink-soft">
              {t("haveAccount")}{" "}
              <Link
                href="/login"
                className="font-semibold text-accent hover:underline"
              >
                {t("login")}
              </Link>
            </p>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={goNextFromStep2} className="flex flex-col gap-[18px]">
            <Input
              label={t("fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputClass}
            />
            <Input
              label={t("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@restaurant.com"
              className={inputClass}
            />
            <Input
              label={t("password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
            />
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex-1 rounded-[10px] py-[13px] text-[14.5px]"
              >
                {tc("back")}
              </Button>
              <Button
                type="submit"
                className="flex-[2] rounded-[10px] bg-accent py-[13px] text-[14.5px] font-semibold text-white hover:bg-accent-hover"
              >
                {t("nextConfirm")}
              </Button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
            <div className="rounded-[14px] border border-accent/40 bg-[rgba(67,151,141,0.06)] p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-[family-name:var(--font-outfit)] text-base font-semibold text-deep-palm">
                  {t("trialPlanTitle")}
                </h3>
                <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {t("trialPlanBadge")}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] text-ink-soft">
                {t("trialPlanDesc")}
              </p>
              <p className="mt-2.5 font-[family-name:var(--font-outfit)] text-lg font-semibold text-deep-palm">
                {t("trialPlanPrice")}
              </p>
              <p className="mt-3 border-t border-border pt-3 text-[12.5px] text-ink-soft">
                <span className="font-semibold text-ink">{restaurantName}</span>
                {" · "}
                {fullName}
                {" · "}
                <span dir="ltr">{email}</span>
              </p>
            </div>

            {error ? (
              <p className="text-sm text-needs-attention">{error}</p>
            ) : null}

            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(2)}
                className="flex-1 rounded-[10px] py-[13px] text-[14.5px]"
                disabled={loading}
              >
                {tc("back")}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-[2] rounded-[10px] bg-accent py-[13px] text-[14.5px] font-semibold text-white hover:bg-accent-hover"
              >
                {loading ? "…" : t("completeRegistration")}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </AuthShell>
  );
}
