import { addDays, differenceInDays, isPast } from "date-fns";
import {
  BRANCH_PRICE_SAR,
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
}

export function computeMonthlyAmount(branchCount: number): number {
  return branchCount * BRANCH_PRICE_SAR;
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
  const paidBranchLimit = subscription?.paid_branch_limit ?? 0;
  const isEnterprise =
    status === "enterprise" || branchCount >= ENTERPRISE_BRANCH_THRESHOLD;
  const monthlyAmountSar = computeMonthlyAmount(branchCount);
  const monthlyAmountHalalas = sarToHalalas(monthlyAmountSar);

  const nextInvoiceDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  const isTrialing = status === "trialing" && !trialExpired;
  const isActive = status === "active";
  const isPastDue = status === "past_due" || (status === "trialing" && !!trialExpired);
  const isCanceled = status === "canceled";

  const canUsePlatform =
    isEnterprise || isTrialing || isActive || isPastDue;

  const canWrite =
    isEnterprise ||
    isTrialing ||
    isActive ||
    (isPastDue && branchCount <= paidBranchLimit);

  const requiresPayment = isPastDue && !isEnterprise;

  const canAddBranch =
    !isCanceled &&
    !isEnterprise &&
    branchCount < ENTERPRISE_BRANCH_THRESHOLD &&
    (isTrialing ||
      (isActive && branchCount < paidBranchLimit) ||
      (isPastDue && branchCount < paidBranchLimit));

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
  if (
    access.status === "active" &&
    access.branchCount >= access.paidBranchLimit
  ) {
    return locale === "ar"
      ? "حدّث خطتك في الفوترة لإضافة فرع جديد"
      : "Update your plan on the billing page to add a branch";
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
