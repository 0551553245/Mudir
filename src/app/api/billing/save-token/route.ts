import { NextRequest, NextResponse } from "next/server";
import { activateSubscriptionFromPayment } from "@/lib/actions/billing";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, payment_id: paymentId } = body;

    if (!token || !paymentId) {
      return NextResponse.json(
        { error: "token and payment_id required" },
        { status: 400 }
      );
    }

    const result = await activateSubscriptionFromPayment(paymentId, token);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
