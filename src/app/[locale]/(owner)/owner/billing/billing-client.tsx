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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="pricing-box">
          <p className="font-mono text-xs uppercase tracking-wider opacity-80">
            {access.status}
          </p>
          <p className="mt-4 font-display text-5xl">
            {access.isEnterprise ? "—" : formatSAR(access.monthlyAmountSar, locale)}
          </p>
          <p className="mt-2 text-sm opacity-90">
            {formatSAR(BRANCH_PRICE_SAR, locale)} × {access.paidBranchLimit}{" "}
            {locale === "ar" ? "فروع" : "branches"}
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>✓ {t("branchCount", { count: access.branchCount })}</li>
            <li>
              ✓{" "}
              {locale === "ar"
                ? `${access.paidBranchLimit} خانات مدفوعة`
                : `${access.paidBranchLimit} paid branch slots`}
            </li>
            <li>✓ {locale === "ar" ? "مديران لكل فرع" : "2 managers per branch included"}</li>
            {access.nextInvoiceDate && (
              <li>
                ✓ {tb("nextInvoice")}:{" "}
                {format(access.nextInvoiceDate, "PP")}
              </li>
            )}
          </ul>
        </div>

        <PanelBlock title={t("billingTitle")} role="owner">
          {access.status === "trialing" && access.trialDaysLeft > 0 && (
            <FeatureRow
              title={t("trialDaysLeft", { days: access.trialDaysLeft })}
              description={tb("noCardRequired")}
            />
          )}
          <FeatureRow
            title={tb("activeBranches")}
            description={`${access.branchCount}`}
          />
          <FeatureRow
            title={tb("paidBranchLimit")}
            description={`${access.paidBranchLimit}`}
          />
          <FeatureRow
            title={tb("subscriptionStatus")}
            description={subscription?.status ?? restaurant.subscription_status}
          />
          {access.isEnterprise && (
            <FeatureRow
              title={t("enterpriseNote")}
              description="sales@scopsa.com"
            />
          )}
        </PanelBlock>
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
        <div className="mt-6 panel-block p-6">
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
