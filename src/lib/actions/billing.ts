"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { getOwnerRestaurant, logActivity } from "@/lib/supabase/auth";
import {
  chargeWithToken,
  fetchPayment,
  isMoyasarConfigured,
} from "@/lib/moyasar/client";
import {
  evaluateSubscription,
  nextPeriodEnd,
} from "@/lib/billing/subscription";
import { ENTERPRISE_BRANCH_THRESHOLD } from "@/lib/supabase/types";
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

  await admin
    .from("subscriptions")
    .update({ branch_count: count ?? 0 })
    .eq("restaurant_id", restaurantId);
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

  const { count: branchCount } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const branches = branchCount ?? 0;
  const cardToken = token ?? payment.source.token;

  if (branches >= ENTERPRISE_BRANCH_THRESHOLD) {
    await admin.rpc("sync_subscription_status", {
      p_restaurant_id: restaurantId,
      p_status: "enterprise",
    });
    return { success: true, enterprise: true };
  }

  await admin.from("billing_payments").insert({
    restaurant_id: restaurantId,
    moyasar_payment_id: paymentId,
    amount_halalas: payment.amount,
    branch_count: branches,
    status: payment.status,
    payment_type: payment.metadata?.payment_type ?? "subscription",
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
      paid_branch_limit: branches,
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
      branch_count: branches,
    });
  } else {
    await admin.from("activity_log").insert({
      action: "subscription.activated",
      target_type: "subscription",
      target_id: restaurantId,
      metadata: { payment_id: paymentId, branch_count: branches },
    });
  }

  revalidatePath("/owner/billing");
  revalidatePath("/owner");

  return { success: true };
}

export async function savePaymentToken(token: string, paymentId: string) {
  const ctx = await getBillingContext();
  if (!ctx) return { error: "Unauthorized" };

  return activateSubscriptionFromPayment(paymentId, token);
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
    description: `Scop subscription — ${ctx.branchCount} branches`,
    callbackUrl,
    metadata: {
      restaurant_id: ctx.restaurant.id,
      branch_count: String(ctx.branchCount),
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
  };
}
