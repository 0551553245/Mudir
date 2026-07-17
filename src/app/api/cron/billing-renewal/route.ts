import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  chargeWithToken,
  isMoyasarConfigured,
} from "@/lib/moyasar/client";
import { activateSubscriptionFromPayment } from "@/lib/actions/billing";
import { computeMonthlyAmount, nextPeriodEnd } from "@/lib/billing/subscription";
import { sarToHalalas } from "@/lib/moyasar/client";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMoyasarConfigured()) {
    return NextResponse.json({ error: "Moyasar not configured" }, { status: 503 });
  }

  const admin = createServiceClient();
  await admin.rpc("expire_overdue_trials");

  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .lt("current_period_end", new Date().toISOString());

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const results: Array<{ restaurant_id: string; status: string }> = [];

  for (const sub of subscriptions ?? []) {
    const { data: paymentMethod } = await admin
      .from("payment_methods")
      .select("*")
      .eq("restaurant_id", sub.restaurant_id)
      .eq("is_default", true)
      .maybeSingle();

    if (!paymentMethod) {
      await admin.rpc("sync_subscription_status", {
        p_restaurant_id: sub.restaurant_id,
        p_status: "past_due",
      });
      results.push({ restaurant_id: sub.restaurant_id, status: "past_due_no_card" });
      continue;
    }

    const amountHalalas = sarToHalalas(computeMonthlyAmount(sub.branch_count));

    try {
      const payment = await chargeWithToken({
        amountHalalas,
        token: paymentMethod.moyasar_token,
        description: `Scop renewal — ${sub.branch_count} branches`,
        callbackUrl: `${appUrl}/api/billing/callback`,
        metadata: {
          restaurant_id: sub.restaurant_id,
          branch_count: String(sub.branch_count),
          payment_type: "renewal",
        },
      });

      if (payment.status === "paid") {
        await activateSubscriptionFromPayment(payment.id, undefined, {
          skipAuth: true,
        });
        await admin
          .from("subscriptions")
          .update({ current_period_end: nextPeriodEnd() })
          .eq("restaurant_id", sub.restaurant_id);
        results.push({ restaurant_id: sub.restaurant_id, status: "renewed" });
      } else {
        await admin.rpc("sync_subscription_status", {
          p_restaurant_id: sub.restaurant_id,
          p_status: "past_due",
        });
        results.push({ restaurant_id: sub.restaurant_id, status: payment.status });
      }
    } catch {
      await admin.rpc("sync_subscription_status", {
        p_restaurant_id: sub.restaurant_id,
        p_status: "past_due",
      });
      results.push({ restaurant_id: sub.restaurant_id, status: "charge_failed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
