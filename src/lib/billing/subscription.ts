import { addDays, differenceInDays, isPast } from "date-fns";
import {
  PRICE_PER_BRANCH_SAR,
  ENTERPRISE_BRANCH_THRESHOLD,
  type Restaurant,
  type Subscription,
  type SubscriptionStatus,
} from "@/lib/supabase/types";
import { sarToHalalas } from "@/lib/moyasar/client";

export interface SubscriptionAccess {
  status: SubscriptionStatus | "expired";
  canUsePlatform: boolean;
  canAddBranch: boolean;
  canWrite: boolean;
  trialDaysLeft: number;
  isEnterprise: boolean;
  requiresPayment: boolean;
  branchCount: number;
  paidBranchLimit: number;
  monthlyAmountSar: number;
  monthlyAmountHalalas: number;
  nextInvoiceDate: Date | null;
  pricePerBranchSar: number;
}

export function computeMonthlyAmount(
  branchSlots: number,
  pricePerBranchSar: number = PRICE_PER_BRANCH_SAR
): number {
  return branchSlots * pricePerBranchSar;
}

export function evaluateSubscription(
  restaurant: Restaurant,
  subscription: Subscription | null,
  branchCount: number
): SubscriptionAccess {
  const trialDaysLeft = restaurant.trial_ends_at
    ? Math.max(
        0,
        differenceInDays(new Date(restaurant.trial_ends_at), new Date())
      )
    : 0;

  const trialExpired =
    restaurant.trial_ends_at &&
    isPast(new Date(restaurant.trial_ends_at));

  const status = restaurant.subscription_status;
  const pricePerBranchSar =
    Number(subscription?.price_per_branch_sar) || PRICE_PER_BRANCH_SAR;
  const paidBranchLimit = subscription?.paid_branch_limit ?? 0;
  const isEnterprise =
    status === "enterprise" || branchCount >= ENTERPRISE_BRANCH_THRESHOLD;

  // Bill for paid slots (not only created branches) — removing a branch does not lower MRR
  const billedSlots = isEnterprise
    ? branchCount
    : Math.max(paidBranchLimit, 0);
  const monthlyAmountSar = computeMonthlyAmount(
    billedSlots,
    pricePerBranchSar
  );
  const monthlyAmountHalalas = sarToHalalas(monthlyAmountSar);

  const nextInvoiceDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  const isTrialing = status === "trialing" && !trialExpired;
  const isActive = status === "active";
  const isPastDue =
    status === "past_due" || (status === "trialing" && !!trialExpired);
  const isCanceled = status === "canceled";

  const canUsePlatform =
    isEnterprise || isTrialing || isActive || isPastDue;

  const canWrite =
    isEnterprise ||
    isTrialing ||
    isActive ||
    (isPastDue && branchCount <= paidBranchLimit);

  const requiresPayment = isPastDue && !isEnterprise;

  // Within paid slots → free to create; at/over limit → must upgrade (pay +1)
  const withinPaidSlots =
    paidBranchLimit > 0 && branchCount < paidBranchLimit;

  const canAddBranch =
    !isCanceled &&
    !isEnterprise &&
    branchCount < ENTERPRISE_BRANCH_THRESHOLD &&
    (isTrialing || isActive || isPastDue) &&
    withinPaidSlots &&
    !requiresPayment;

  return {
    status: isPastDue && status === "trialing" ? "past_due" : status,
    canUsePlatform,
    canAddBranch,
    canWrite,
    trialDaysLeft,
    isEnterprise,
    requiresPayment,
    branchCount,
    paidBranchLimit,
    monthlyAmountSar,
    monthlyAmountHalalas,
    nextInvoiceDate,
    pricePerBranchSar,
  };
}

export function getBranchBlockReason(
  access: SubscriptionAccess,
  locale: string
): string | null {
  if (access.isEnterprise) {
    return locale === "ar"
      ? "10+ فروع — تواصل مع sales@scopsa.com للأسعار المؤسسية"
      : "10+ branches — contact sales@scopsa.com for enterprise pricing";
  }
  if (access.status === "canceled") {
    return locale === "ar"
      ? "اشتراكك ملغى — جدّد الدفع من صفحة الفوترة"
      : "Subscription canceled — renew from the billing page";
  }
  if (access.requiresPayment) {
    return locale === "ar"
      ? "انتهت التجربة المجانية — أضف طريقة دفع للمتابعة"
      : "Free trial ended — add a payment method to continue";
  }
  if (access.branchCount >= access.paidBranchLimit) {
    return locale === "ar"
      ? `استخدمت كل فروع خطتك (${access.paidBranchLimit}). أضف فرعًا مقابل ${access.pricePerBranchSar} ر.س/شهر.`
      : `You've used all ${access.paidBranchLimit} branches on your plan. Add 1 branch for ${access.pricePerBranchSar} SAR/month.`;
  }
  if (access.branchCount >= ENTERPRISE_BRANCH_THRESHOLD) {
    return locale === "ar"
      ? "الحد الأقصى 9 فروع للخطط القياسية"
      : "Maximum 9 branches on the standard plan";
  }
  return null;
}

export function nextPeriodEnd(from: Date = new Date()): string {
  return addDays(from, 30).toISOString();
}
