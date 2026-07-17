"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input, Button } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

export default function AdminLoginPage() {
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

    if (profile?.role !== "super_admin") {
      await supabase.auth.signOut();
      setError(t("adminOnly"));
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/admin");
  }

  return (
    <AuthShell hideHeader>
      <div className="flex justify-center">
        <span className="rounded-full bg-deep-palm px-2.5 py-[3px] font-[family-name:var(--font-ibm-plex-mono)] text-[10.5px] font-bold uppercase tracking-[0.03em] text-white">
          {t("adminInternalTag")}
        </span>
      </div>

      <div className="text-center">
        <h1 className="font-[family-name:var(--font-outfit)] text-[22px] font-medium text-deep-palm">
          {t("adminLoginTitle")}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-soft">
          {t("adminLoginSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <Input
          label={t("email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@scopsa.com"
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
          className="w-full rounded-[10px] bg-deep-palm py-[13px] text-[14.5px] font-semibold text-white hover:bg-deep-palm/90"
        >
          {loading ? "…" : t("login")}
        </Button>

        <p className="text-center text-[12px] text-ink-faint">
          {t("adminLoginHelp")}
        </p>
      </form>
    </AuthShell>
  );
}
