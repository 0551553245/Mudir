import { NextRequest, NextResponse } from "next/server";
import { activateSubscriptionFromPayment } from "@/lib/actions/billing";

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("id");
  const locale = request.nextUrl.searchParams.get("locale") ?? "ar";
  const intent = request.nextUrl.searchParams.get("intent");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const successPath =
    intent === "branch_addon"
      ? `/${locale}/owner/branches?upgraded=1`
      : `/${locale}/owner/billing?success=1`;
  const errorBase =
    intent === "branch_addon"
      ? `/${locale}/owner/branches`
      : `/${locale}/owner/billing`;

  if (!paymentId) {
    return NextResponse.redirect(
      `${appUrl}${errorBase}?error=missing_payment`
    );
  }

  try {
    const result = await activateSubscriptionFromPayment(paymentId, undefined, {
      skipAuth: true,
    });

    if (result.error) {
      return NextResponse.redirect(
        `${appUrl}${errorBase}?error=${encodeURIComponent(result.error)}`
      );
    }

    if ("enterprise" in result && result.enterprise) {
      return NextResponse.redirect(
        `${appUrl}/${locale}/owner/billing?enterprise=1`
      );
    }

    return NextResponse.redirect(`${appUrl}${successPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "payment_failed";
    return NextResponse.redirect(
      `${appUrl}${errorBase}?error=${encodeURIComponent(message)}`
    );
  }
}
