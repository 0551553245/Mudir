import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { getBillingState } from "@/lib/actions/billing";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const t = await getTranslations("owner");
  const state = await getBillingState();

  if (!state) return null;

  return (
    <div>
      <PageHeader
        title={t("billingTitle")}
        subtitle={t("billingSubtitle")}
      />

      <Suspense>
        <BillingClient
          restaurant={state.restaurant}
          subscription={state.subscription}
          access={state.access}
          paymentMethods={state.paymentMethods}
          recentPayments={state.recentPayments}
          moyasarConfigured={state.moyasarConfigured}
          publishableKey={state.publishableKey}
        />
      </Suspense>
    </div>
  );
}
