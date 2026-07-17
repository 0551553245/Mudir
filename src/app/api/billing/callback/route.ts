import { NextRequest, NextResponse } from "next/server";
import { activateSubscriptionFromPayment } from "@/lib/actions/billing";

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("id");
  const locale = request.nextUrl.searchParams.get("locale") ?? "ar";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!paymentId) {
    return NextResponse.redirect(
      `${appUrl}/${locale}/owner/billing?error=missing_payment`
    );
  }

  try {
    const result = await activateSubscriptionFromPayment(paymentId, undefined, {
      skipAuth: true,
    });

    if (result.error) {
      return NextResponse.redirect(
        `${appUrl}/${locale}/owner/billing?error=${encodeURIComponent(result.error)}`
      );
    }

    if (result.enterprise) {
      return NextResponse.redirect(
        `${appUrl}/${locale}/owner/billing?enterprise=1`
      );
    }

    return NextResponse.redirect(
      `${appUrl}/${locale}/owner/billing?success=1`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "payment_failed";
    return NextResponse.redirect(
      `${appUrl}/${locale}/owner/billing?error=${encodeURIComponent(message)}`
    );
  }
}
