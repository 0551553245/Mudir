import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { fetchPayment } from "@/lib/moyasar/client";
import { activateSubscriptionFromPayment } from "@/lib/actions/billing";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const paymentId = body?.id ?? body?.data?.id;
    const eventType = body?.type ?? body?.event;

    if (!paymentId) {
      return NextResponse.json({ error: "No payment id" }, { status: 400 });
    }

    if (
      eventType &&
      !["payment_paid", "payment.failed", "payment_paid"].includes(eventType)
    ) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const payment = await fetchPayment(paymentId);

    if (payment.status === "paid") {
      await activateSubscriptionFromPayment(paymentId, undefined, {
        skipAuth: true,
      });
    } else if (payment.status === "failed") {
      const restaurantId = payment.metadata?.restaurant_id;
      if (restaurantId) {
        const admin = createServiceClient();
        await admin.rpc("sync_subscription_status", {
          p_restaurant_id: restaurantId,
          p_status: "past_due",
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
