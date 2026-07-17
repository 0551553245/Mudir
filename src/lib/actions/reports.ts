"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { isEmailConfigured } from "@/lib/email/send";

/** Weekly digests removed — kept as no-ops for any leftover callers. */
export async function updateDigestPreference(_enabled: boolean) {
  return { error: "Weekly email digests are no longer available" };
}

export async function sendTestDigest() {
  return { error: "Weekly email digests are no longer available" };
}

export async function getDigestSettings() {
  const profile = await getProfile();
  if (!profile || profile.role !== "owner") return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("digest_enabled, digest_frequency, digest_last_sent_at, email")
    .eq("id", profile.id)
    .single();

  return {
    enabled: false,
    frequency: "off" as const,
    lastSentAt: data?.digest_last_sent_at ?? null,
    emailConfigured: isEmailConfigured(),
  };
}

export async function sendWeeklyDigestsForAllOwners(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  return { sent: 0, skipped: 0, errors: [] };
}
