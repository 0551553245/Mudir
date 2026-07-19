"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { getOwnerRestaurant, logActivity } from "@/lib/supabase/auth";
import {
  chargeWithToken,
  fetchPayment,
  isMoyasarConfigured,
  sarToHalalas,
} from "@/lib/moyasar/client";
import {
  evaluateSubscription,
  nextPeriodEnd,
  computeMonthlyAmount,
} from "@/lib/billing/subscription";
import {
  ENTERPRISE_BRANCH_THRESHOLD,
  PRICE_PER_BRANCH_SAR,
} from "@/lib/supabase/types";
import { revalidatePath } from "next/cache";

async function getBillingContext() {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const admin = createServiceClient();
  await admin.rpc("expire_overdue_trials");

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .single();

  const { count: branchCount } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const access = evaluateSubscription(
    restaurant,
    subscription,
    branchCount ?? 0
  );

  return { restaurant, subscription, branchCount: branchCount ?? 0, access, admin };
}

export async function syncBranchCount(restaurantId: string) {
  const admin = createServiceClient();
  const { count } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  // Only sync usage count — never reduce paid_branch_limit on delete (no refund until renewal)
  await admin
    .from("subscriptions")
    .update({ branch_count: count ?? 0 })
    .eq("restaurant_id", restaurantId);
}

/**
 * After owner signup: set restaurant name + paid branch slots from the registration stepper.
 */
export async function completeOwnerSignup(input: {
  restaurantName: string;
  branchCount: number;
}) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const slots = Math.max(1, Math.floor(input.branchCount) || 1);
  if (slots >= ENTERPRISE_BRANCH_THRESHOLD) {
    return {
      error: "10+ branches require enterprise pricing — contact sales@scopsa.com",
      enterprise: true,
    };
  }

  const admin = createServiceClient();
  const price = PRICE_PER_BRANCH_SAR;
  const total = computeMonthlyAmount(slots, price);

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!restaurant) {
    return { error: "Restaurant not found — try signing in again" };
  }

  if (input.restaurantName.trim()) {
    await admin
      .from("restaurants")
      .update({ name: input.restaurantName.trim() })
      .eq("id", restaurant.id);
  }

  await admin
    .from("subscriptions")
    .update({
      paid_branch_limit: slots,
      price_per_branch_sar: price,
      total_price_sar: total,
    })
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/owner");
  revalidatePath("/owner/billing");
  return { success: true, paidBranchLimit: slots, totalPriceSar: total };
}

export async function activateSubscriptionFromPayment(
  paymentId: string,
  token?: string,
  options?: { skipAuth?: boolean }
) {
  if (!isMoyasarConfigured()) {
    return { error: "Moyasar is not configured" };
  }

  const admin = createServiceClient();
  const payment = await fetchPayment(paymentId);

  if (payment.status !== "paid") {
    return { error: "Payment not completed", status: payment.status };
  }

  const restaurantId = payment.metadata?.restaurant_id;
  if (!restaurantId) {
    return { error: "Payment missing restaurant_id metadata" };
  }

  if (!options?.skipAuth) {
    const ownerRestaurant = await getOwnerRestaurant();
    if (!ownerRestaurant || ownerRestaurant.id !== restaurantId) {
      return { error: "Unauthorized" };
    }
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .single();

  if (!restaurant) return { error: "Restaurant not found" };

  const { data: existing } = await admin
    .from("billing_payments")
    .select("id")
    .eq("moyasar_payment_id", paymentId)
    .maybeSingle();

  if (existing) {
    return { success: true, alreadyProcessed: true };
  }

  const paymentType = payment.metadata?.payment_type ?? "subscription";
  const cardToken = token ?? payment.source.token;

  if (paymentType === "branch_addon") {
    return applyBranchAddonPayment({
      admin,
      restaurantId,
      paymentId,
      payment,
      cardToken,
      skipAuth: options?.skipAuth,
    });
  }

  const { count: branchCount } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const branches = branchCount ?? 0;

  if (branches >= ENTERPRISE_BRANCH_THRESHOLD) {
    await admin.rpc("sync_subscription_status", {
      p_restaurant_id: restaurantId,
      p_status: "enterprise",
    });
    return { success: true, enterprise: true };
  }

  const { data: currentSub } = await admin
    .from("subscriptions")
    .select("paid_branch_limit, price_per_branch_sar")
    .eq("restaurant_id", restaurantId)
    .single();

  const price =
    Number(currentSub?.price_per_branch_sar) || PRICE_PER_BRANCH_SAR;
  // Keep signup-selected slots; never shrink below current branches
  const paidLimit = Math.max(
    currentSub?.paid_branch_limit ?? 0,
    branches,
    1
  );
  const total = computeMonthlyAmount(paidLimit, price);

  await admin.from("billing_payments").insert({
    restaurant_id: restaurantId,
    moyasar_payment_id: paymentId,
    amount_halalas: payment.amount,
    branch_count: paidLimit,
    status: payment.status,
    payment_type: paymentType,
  });

  if (cardToken) {
    await admin
      .from("payment_methods")
      .update({ is_default: false })
      .eq("restaurant_id", restaurantId);

    const lastFour = payment.source.number?.slice(-4) ?? null;
    await admin.from("payment_methods").insert({
      restaurant_id: restaurantId,
      moyasar_token: cardToken,
      card_company: payment.source.company ?? null,
      card_last_four: lastFour,
      is_default: true,
    });
  }

  const periodEnd = nextPeriodEnd();

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      branch_count: branches,
      paid_branch_limit: paidLimit,
      price_per_branch_sar: price,
      total_price_sar: total,
      current_period_end: periodEnd,
      moyasar_customer_id: cardToken ?? null,
    })
    .eq("restaurant_id", restaurantId);

  await admin.rpc("sync_subscription_status", {
    p_restaurant_id: restaurantId,
    p_status: "active",
  });

  if (!options?.skipAuth) {
    await logActivity("subscription.activated", "subscription", restaurantId, {
      payment_id: paymentId,
      branch_count: paidLimit,
    });
  } else {
    await admin.from("activity_log").insert({
      action: "subscription.activated",
      target_type: "subscription",
      target_id: restaurantId,
      metadata: { payment_id: paymentId, branch_count: paidLimit },
    });
  }

  revalidatePath("/owner/billing");
  revalidatePath("/owner");
  revalidatePath("/owner/branches");

  return { success: true };
}

async function applyBranchAddonPayment(params: {
  admin: ReturnType<typeof createServiceClient>;
  restaurantId: string;
  paymentId: string;
  payment: Awaited<ReturnType<typeof fetchPayment>>;
  cardToken?: string;
  skipAuth?: boolean;
}) {
  const { admin, restaurantId, paymentId, payment, cardToken, skipAuth } =
    params;

  const expectedHalalas = sarToHalalas(PRICE_PER_BRANCH_SAR);
  if (payment.amount < expectedHalalas) {
    return { error: "Payment amount does not match branch upgrade price" };
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!sub) return { error: "Subscription not found" };

  const price = Number(sub.price_per_branch_sar) || PRICE_PER_BRANCH_SAR;
  const newLimit = (sub.paid_branch_limit ?? 0) + 1;
  const newTotal = computeMonthlyAmount(newLimit, price);

  await admin.from("billing_payments").insert({
    restaurant_id: restaurantId,
    moyasar_payment_id: paymentId,
    amount_halalas: payment.amount,
    branch_count: newLimit,
    status: payment.status,
    payment_type: "branch_addon",
  });

  if (cardToken) {
    await admin
      .from("payment_methods")
      .update({ is_default: false })
      .eq("restaurant_id", restaurantId);

    const lastFour = payment.source.number?.slice(-4) ?? null;
    await admin.from("payment_methods").insert({
      restaurant_id: restaurantId,
      moyasar_token: cardToken,
      card_company: payment.source.company ?? null,
      card_last_four: lastFour,
      is_default: true,
    });
  }

  await admin
    .from("subscriptions")
    .update({
      paid_branch_limit: newLimit,
      price_per_branch_sar: price,
      total_price_sar: newTotal,
      status: sub.status === "trialing" ? sub.status : "active",
    })
    .eq("restaurant_id", restaurantId);

  if (sub.status !== "trialing" && sub.status !== "enterprise") {
    await admin.rpc("sync_subscription_status", {
      p_restaurant_id: restaurantId,
      p_status: "active",
    });
  }

  if (!skipAuth) {
    await logActivity("subscription.branch_addon", "subscription", restaurantId, {
      payment_id: paymentId,
      paid_branch_limit: newLimit,
    });
  } else {
    await admin.from("activity_log").insert({
      action: "subscription.branch_addon",
      target_type: "subscription",
      target_id: restaurantId,
      metadata: { payment_id: paymentId, paid_branch_limit: newLimit },
    });
  }

  revalidatePath("/owner/billing");
  revalidatePath("/owner/branches");
  revalidatePath("/owner");

  return { success: true, paidBranchLimit: newLimit };
}

/**
 * Charge +50 SAR and increment paid_branch_limit by 1.
 * Does not create the branch — owner creates it after the slot is paid.
 */
export async function purchaseAdditionalBranchSlot() {
  if (!isMoyasarConfigured()) {
    return { error: "Moyasar is not configured", needsCheckout: true };
  }

  const ctx = await getBillingContext();
  if (!ctx) return { error: "Unauthorized" };

  if (ctx.access.isEnterprise) {
    return { error: "Enterprise accounts require sales contact" };
  }

  if (ctx.branchCount + 1 >= ENTERPRISE_BRANCH_THRESHOLD) {
    return { error: "10+ branches require enterprise pricing" };
  }

  if (ctx.access.canAddBranch) {
    return { success: true, alreadyHasSlot: true };
  }

  const { data: paymentMethod } = await ctx.admin
    .from("payment_methods")
    .select("*")
    .eq("restaurant_id", ctx.restaurant.id)
    .eq("is_default", true)
    .maybeSingle();

  if (!paymentMethod) {
    return {
      error: "No saved payment method",
      needsCheckout: true,
      amountSar: PRICE_PER_BRANCH_SAR,
      amountHalalas: sarToHalalas(PRICE_PER_BRANCH_SAR),
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/billing/callback`;

  const payment = await chargeWithToken({
    amountHalalas: sarToHalalas(PRICE_PER_BRANCH_SAR),
    token: paymentMethod.moyasar_token,
    description: `Scop — add 1 branch (+${PRICE_PER_BRANCH_SAR} SAR/mo)`,
    callbackUrl,
    metadata: {
      restaurant_id: ctx.restaurant.id,
      payment_type: "branch_addon",
      branches_added: "1",
    },
  });

  if (payment.status === "paid") {
    const result = await activateSubscriptionFromPayment(payment.id);
    return { ...result, paymentId: payment.id };
  }

  return {
    success: false,
    paymentId: payment.id,
    status: payment.status,
    message: "Payment initiated — complete verification if required",
    needsCheckout: payment.status !== "paid",
  };
}

export async function upgradeSubscriptionPlan() {
  if (!isMoyasarConfigured()) {
    return { error: "Moyasar is not configured" };
  }

  const ctx = await getBillingContext();
  if (!ctx) return { error: "Unauthorized" };

  if (ctx.access.isEnterprise) {
    return { error: "Enterprise accounts require sales contact" };
  }

  if (ctx.branchCount >= ENTERPRISE_BRANCH_THRESHOLD) {
    await ctx.admin.rpc("sync_subscription_status", {
      p_restaurant_id: ctx.restaurant.id,
      p_status: "enterprise",
    });
    return { error: "Enterprise pricing required for 10+ branches" };
  }

  const { data: paymentMethod } = await ctx.admin
    .from("payment_methods")
    .select("*")
    .eq("restaurant_id", ctx.restaurant.id)
    .eq("is_default", true)
    .maybeSingle();

  if (!paymentMethod) {
    return { error: "No saved payment method — complete checkout first" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = `${appUrl}/api/billing/callback`;

  const payment = await chargeWithToken({
    amountHalalas: ctx.access.monthlyAmountHalalas,
    token: paymentMethod.moyasar_token,
    description: `Scop subscription — ${ctx.access.paidBranchLimit} branches`,
    callbackUrl,
    metadata: {
      restaurant_id: ctx.restaurant.id,
      branch_count: String(ctx.access.paidBranchLimit),
      payment_type: "upgrade",
    },
  });

  if (payment.status === "paid") {
    await activateSubscriptionFromPayment(payment.id);
    return { success: true, paymentId: payment.id };
  }

  return {
    success: false,
    paymentId: payment.id,
    status: payment.status,
    message: "Payment initiated — complete verification if required",
  };
}

export async function removePaymentMethod(id: string) {
  const ctx = await getBillingContext();
  if (!ctx) return { error: "Unauthorized" };

  const { error } = await ctx.admin
    .from("payment_methods")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", ctx.restaurant.id);

  if (error) return { error: error.message };

  revalidatePath("/owner/billing");
  return { success: true };
}

export async function getBillingState() {
  const ctx = await getBillingContext();
  if (!ctx) return null;

  const { data: paymentMethods } = await ctx.admin
    .from("payment_methods")
    .select("*")
    .eq("restaurant_id", ctx.restaurant.id)
    .order("created_at", { ascending: false });

  const { data: recentPayments } = await ctx.admin
    .from("billing_payments")
    .select("*")
    .eq("restaurant_id", ctx.restaurant.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    restaurant: ctx.restaurant,
    subscription: ctx.subscription,
    access: ctx.access,
    paymentMethods: paymentMethods ?? [],
    recentPayments: recentPayments ?? [],
    moyasarConfigured: isMoyasarConfigured(),
    publishableKey: process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? null,
    pricePerBranchSar: PRICE_PER_BRANCH_SAR,
  };
}
