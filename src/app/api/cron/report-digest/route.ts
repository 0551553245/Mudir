import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigestsForAllOwners } from "@/lib/actions/reports";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${cronSecret}`) return true;

  // Vercel Cron may send the secret as a query param in some setups
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (querySecret === cronSecret) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWeeklyDigestsForAllOwners();
  return NextResponse.json(result);
}
