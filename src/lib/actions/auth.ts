"use server";

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { ROLE_ROUTES, type UserRole } from "@/lib/supabase/types";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(userId: string, code: string): string {
  const pepper =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.CRON_SECRET ??
    "scop-otp";
  return createHash("sha256").update(`${userId}:${code}:${pepper}`).digest("hex");
}

function codesMatch(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function otpEmailHtml(code: string): string {
  return `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#0f2d20;">
      <h2 style="margin:0 0 12px;font-size:20px;">Your verification code</h2>
      <p style="margin:0 0 16px;color:#4a6358;font-size:14px;">
        Enter this code to finish signing in to Scop. It expires in 10 minutes.
      </p>
      <p style="margin:0;font-size:28px;letter-spacing:0.2em;font-weight:700;">${code}</p>
    </div>
  `;
}

export async function requestPasswordReset(
  email: string,
  locale: string
): Promise<{ error?: string; ok?: boolean }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "missingEmail" };

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${origin}/auth/callback?next=/${locale}/reset-password`,
  });

  // Always return ok to avoid email enumeration.
  if (error) {
    console.error("resetPasswordForEmail:", error.message);
  }

  return { ok: true };
}

export async function updatePassword(
  password: string
): Promise<{ error?: string; ok?: boolean; redirectTo?: string }> {
  if (password.length < 8) return { error: "passwordTooShort" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "sessionExpired" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "updateFailed" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_login_verified_at")
    .eq("id", user.id)
    .single();

  if (profile && !profile.first_login_verified_at) {
    const sent = await sendFirstLoginOtp();
    if (sent.error && sent.error !== "alreadyVerified") {
      return { error: sent.error };
    }
    return { ok: true, redirectTo: "/verify-2fa" };
  }

  const role = (profile?.role as UserRole | undefined) ?? "owner";
  return { ok: true, redirectTo: ROLE_ROUTES[role] };
}

export async function sendFirstLoginOtp(): Promise<{
  error?: string;
  ok?: boolean;
  alreadyVerified?: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { error: "unauthorized" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("first_login_verified_at, email")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "unauthorized" };
  if (profile.first_login_verified_at) {
    return { ok: true, alreadyVerified: true };
  }

  const code = String(randomInt(100000, 999999));
  const codeHash = hashOtp(user.id, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await admin.from("login_otps").delete().eq("user_id", user.id);
  const { error: insertError } = await admin.from("login_otps").insert({
    user_id: user.id,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("login_otps insert:", insertError.message);
    return { error: "sendFailed" };
  }

  if (isEmailConfigured()) {
    try {
      await sendEmail({
        to: profile.email || user.email,
        subject: "Your Scop verification code",
        html: otpEmailHtml(code),
        text: `Your Scop verification code is ${code}. It expires in 10 minutes.`,
      });
    } catch (err) {
      console.error("2FA email send failed:", err);
      return { error: "sendFailed" };
    }
  } else if (process.env.NODE_ENV === "development") {
    console.info(`[dev] First-login 2FA code for ${user.email}: ${code}`);
  } else {
    return { error: "emailNotConfigured" };
  }

  return { ok: true };
}

export async function verifyFirstLoginOtp(
  code: string
): Promise<{ error?: string; ok?: boolean; redirectTo?: string }> {
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return { error: "invalidCode" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "unauthorized" };

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, first_login_verified_at")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "unauthorized" };
  if (profile.first_login_verified_at) {
    return {
      ok: true,
      redirectTo: ROLE_ROUTES[profile.role as UserRole],
    };
  }

  const { data: otp } = await admin
    .from("login_otps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return { error: "codeExpired" };
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await admin.from("login_otps").delete().eq("user_id", user.id);
    return { error: "codeExpired" };
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await admin.from("login_otps").delete().eq("user_id", user.id);
    return { error: "tooManyAttempts" };
  }

  const expected = hashOtp(user.id, trimmed);
  if (!codesMatch(expected, otp.code_hash)) {
    await admin
      .from("login_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);
    return { error: "invalidCode" };
  }

  await admin
    .from("profiles")
    .update({ first_login_verified_at: new Date().toISOString() })
    .eq("id", user.id);
  await admin.from("login_otps").delete().eq("user_id", user.id);

  return {
    ok: true,
    redirectTo: ROLE_ROUTES[profile.role as UserRole],
  };
}

export async function getFirstLoginStatus(): Promise<{
  needsVerification: boolean;
  email?: string;
  role?: UserRole;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { needsVerification: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_login_verified_at, email")
    .eq("id", user.id)
    .single();

  if (!profile) return { needsVerification: false };

  return {
    needsVerification: !profile.first_login_verified_at,
    email: profile.email,
    role: profile.role as UserRole,
  };
}
