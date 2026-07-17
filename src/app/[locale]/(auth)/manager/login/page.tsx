"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input, Button } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

export default function ManagerLoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(t("invalidCredentials"));
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(t("invalidCredentials"));
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "manager") {
      await supabase.auth.signOut();
      setError(t("managerOnly"));
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/manager");
  }

  return (
    <AuthShell
      title={t("managerLoginTitle")}
      subtitle={t("managerLoginDescription")}
    >
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
        <Input
          label={t("password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
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
          {loading ? "…" : t("login")}
        </Button>

        <p className="text-center text-[12.5px] text-ink-faint">
          {t("loginHelp")}
        </p>

        <p className="text-center text-xs text-ink-soft">
          <Link
            href="/login"
            className="font-semibold text-ink-soft hover:text-deep-palm"
          >
            {t("ownerLoginLink")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
