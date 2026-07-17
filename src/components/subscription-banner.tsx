import { getBillingState } from "@/lib/actions/billing";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

export async function SubscriptionBanner() {
  const state = await getBillingState();
  const t = await getTranslations("billing");
  const locale = await getLocale();

  if (!state) return null;

  const { access } = state;

  if (access.isEnterprise || access.status === "active") return null;

  if (access.requiresPayment) {
    return (
      <div className="border-b border-amber bg-amber-bg px-6 py-3 text-center text-sm text-amber-ink">
        {t("trialExpiredBanner")}{" "}
        <Link href="/owner/billing" className="font-medium underline">
          {t("addPayment")}
        </Link>
      </div>
    );
  }

  if (access.status === "trialing" && access.trialDaysLeft <= 3) {
    return (
      <div className="border-b border-blue bg-blue-bg px-6 py-3 text-center text-sm text-blue-ink">
        {t("trialEndingSoon", { days: access.trialDaysLeft })}{" "}
        <Link href="/owner/billing" className="font-medium underline">
          {locale === "ar" ? "عرض الخطط" : "View plans"}
        </Link>
      </div>
    );
  }

  if (access.status === "past_due") {
    return (
      <div className="border-b border-needs-attention/30 bg-needs-attention-bg px-6 py-3 text-center text-sm text-needs-attention">
        {t("paymentFailedBanner")}{" "}
        <Link href="/owner/billing" className="font-medium underline">
          {t("updatePayment")}
        </Link>
      </div>
    );
  }

  return null;
}
