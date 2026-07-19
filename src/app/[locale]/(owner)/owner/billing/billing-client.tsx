"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import {
  removePaymentMethod,
  upgradeSubscriptionPlan,
} from "@/lib/actions/billing";
import { formatSAR } from "@/lib/utils";
import { BRANCH_PRICE_SAR } from "@/lib/supabase/types";
import type {
  PaymentMethod,
  BillingPayment,
  Restaurant,
  Subscription,
} from "@/lib/supabase/types";
import type { SubscriptionAccess } from "@/lib/billing/subscription";
import { format } from "date-fns";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

interface BillingClientProps {
  restaurant: Restaurant;
  subscription: Subscription | null;
  access: SubscriptionAccess;
  paymentMethods: PaymentMethod[];
  recentPayments: BillingPayment[];
  moyasarConfigured: boolean;
  publishableKey: string | null;
}

export function BillingClient({
  restaurant,
  subscription,
  access,
  paymentMethods,
  recentPayments,
  moyasarConfigured,
  publishableKey,
}: BillingClientProps) {
  const t = useTranslations("owner");
  const tb = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const showCheckout =
    moyasarConfigured &&
    publishableKey &&
    !access.isEnterprise &&
    (access.requiresPayment ||
      access.status === "trialing" ||
      (access.status === "active" &&
        access.branchCount > access.paidBranchLimit));

  const needsUpgrade =
    access.status === "active" &&
    access.branchCount > access.paidBranchLimit;

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const enterprise = searchParams.get("enterprise");

    if (success) setMessage(tb("paymentSuccess"));
    else if (enterprise) setMessage(tb("enterpriseActivated"));
    else if (error) setMessage(decodeURIComponent(error));
  }, [searchParams, tb]);

  useEffect(() => {
    if (!showCheckout || !scriptReady || !formRef.current || !publishableKey) {
      return;
    }

    formRef.current.innerHTML = "";

    window.Moyasar?.init({
      element: formRef.current,
      amount: access.monthlyAmountHalalas,
      currency: "SAR",
      description: `Scop — ${access.paidBranchLimit} branches`,
      publishable_api_key: publishableKey,
      callback_url: `${appUrl}/api/billing/callback?locale=${locale}`,
      supported_networks: ["visa", "mastercard", "mada"],
      methods: ["creditcard"],
      credit_card: {
        save_card: true,
      },
      metadata: {
        restaurant_id: restaurant.id,
        branch_count: String(access.paidBranchLimit),
        payment_type: needsUpgrade ? "upgrade" : "subscription",
      },
      on_completed: async function (payment: {
        id: string;
        source: { token?: string };
      }) {
        if (payment.source?.token) {
          await fetch("/api/billing/save-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: payment.source.token,
              payment_id: payment.id,
            }),
          });
        }
      },
    });
  }, [
    showCheckout,
    scriptReady,
    publishableKey,
    access.monthlyAmountHalalas,
    access.paidBranchLimit,
    restaurant.id,
    appUrl,
    locale,
    needsUpgrade,
  ]);

  async function handleUpgrade() {
    setUpgrading(true);
    setMessage(null);
    const result = await upgradeSubscriptionPlan();
    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage(tb("planUpdated"));
      router.refresh();
    }
    setUpgrading(false);
  }

  async function handleRemoveCard(id: string) {
    const result = await removePaymentMethod(id);
    if (result.error) setMessage(result.error);
    else router.refresh();
  }

  return (
    <>
      <Script
        src="https://cdn.moyasar.com/moyasar.js"
        onReady={() => setScriptReady(true)}
      />
      <link
        rel="stylesheet"
        href="https://cdn.moyasar.com/moyasar.css"
      />

      {message && (
        <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {access.requiresPayment && (
        <div className="mb-6 rounded-xl border border-amber bg-amber-bg px-4 py-3 text-sm text-amber-ink">
          {tb("trialExpiredBanner")}
          <Link href="/owner/billing" className="ms-2 font-medium underline">
            {tb("addPayment")}
          </Link>
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
          {t("billingTitle")}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-forest p-6 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            {tb("currentPlan")}
          </p>
          <p className="mt-3 font-[family-name:var(--font-baloo)] text-4xl font-bold">
            {access.isEnterprise
              ? "—"
              : formatSAR(BRANCH_PRICE_SAR, locale)}
          </p>
          <p className="mt-1 text-sm text-white/80">{tb("perBranchMonth")}</p>
          <div className="my-4 h-px bg-white/20" />
          <ul className="space-y-2 text-sm text-white/90">
            <li>✓ {tb("featureManagers")}</li>
            <li>✓ {tb("featureRealtime")}</li>
            <li>✓ {tb("featureUnlimited")}</li>
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="space-y-3 border-b border-border px-5 py-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-ink-soft">{tb("activeBranches")}</span>
              <span className="font-semibold text-ink">{access.branchCount}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-ink-soft">{tb("managersIncluded")}</span>
              <span className="font-semibold text-ink">
                {access.branchCount * 2}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-ink-soft">{tb("nextInvoice")}</span>
              <span className="font-semibold text-ink">
                {access.isEnterprise
                  ? "—"
                  : formatSAR(access.monthlyAmountSar, locale)}
              </span>
            </div>
          </div>

          {access.status === "trialing" && access.trialDaysLeft > 0 ? (
            <div className="border-b border-border px-5 py-4">
              <div className="rounded-xl border border-[#E8C39A] bg-[#FFF6EB] px-3 py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">{tb("freeTrial")}</span>
                  <span className="font-bold text-ink">
                    {t("trialDaysLeft", { days: access.trialDaysLeft })}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#E0A23B]"
                    style={{
                      width: `${Math.max(8, Math.min(100, (access.trialDaysLeft / 14) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="px-5 py-4">
            <p className="text-sm text-ink-soft">{tb("paymentMethods")}</p>
            {paymentMethods[0] ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {paymentMethods[0].card_company ?? "card"} ****{" "}
                  {paymentMethods[0].card_last_four ?? "••••"}
                </p>
                <button
                  type="button"
                  className="rounded-full border border-forest px-3 py-1.5 text-xs font-semibold text-forest"
                  onClick={() =>
                    document
                      .getElementById("owner-billing-checkout")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {tb("updatePayment")}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink-faint">{tb("noCardRequired")}</p>
            )}
          </div>
        </div>
      </div>

      {needsUpgrade && (
        <div className="mt-6 panel-block p-6">
          <h3 className="font-display text-lg">{tb("upgradeRequired")}</h3>
          <p className="mt-2 text-sm text-ink-soft">{tb("upgradeDescription")}</p>
          <Button onClick={handleUpgrade} disabled={upgrading} className="mt-4">
            {upgrading ? tb("processing") : tb("updatePlan")}
          </Button>
        </div>
      )}

      {showCheckout && (
        <div id="owner-billing-checkout" className="mt-6 panel-block p-6">
          <h3 className="mb-4 font-display text-lg">
            {access.requiresPayment ? tb("subscribeNow") : tb("updatePayment")}
          </h3>
          {!moyasarConfigured && (
            <p className="text-sm text-ink-soft">{tb("moyasarNotConfigured")}</p>
          )}
          <div ref={formRef} className="mysr-form" />
        </div>
      )}

      {paymentMethods.length > 0 && (
        <div className="mt-6">
          <PanelBlock title={tb("paymentMethods")} role="owner">
            {paymentMethods.map((pm) => (
              <FeatureRow
                key={pm.id}
                title={`${pm.card_company ?? "Card"} •••• ${pm.card_last_four ?? "****"}`}
                description={pm.is_default ? tb("defaultCard") : undefined}
                trailing={
                  <button
                    onClick={() => handleRemoveCard(pm.id)}
                    className="text-xs text-needs-attention hover:underline"
                  >
                    {tb("removeCard")}
                  </button>
                }
              />
            ))}
          </PanelBlock>
        </div>
      )}

      {recentPayments.length > 0 && (
        <div className="mt-6">
          <PanelBlock title={tb("paymentHistory")} role="owner">
            {recentPayments.map((p) => (
              <FeatureRow
                key={p.id}
                title={formatSAR(p.amount_halalas / 100, locale)}
                description={`${p.branch_count} branches · ${p.payment_type} · ${format(new Date(p.created_at), "PP")}`}
              />
            ))}
          </PanelBlock>
        </div>
      )}
    </>
  );
}
