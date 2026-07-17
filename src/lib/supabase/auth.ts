import { createClient } from "./server";
import type { Profile, UserRole } from "./types";
import { ROLE_ROUTES } from "./types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export function getDashboardPath(role: UserRole): string {
  return ROLE_ROUTES[role];
}

export async function logActivity(
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata ?? {},
  });
}

export async function getOwnerRestaurant() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile || profile.role !== "owner") return null;

  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_user_id", profile.id)
    .single();

  return data;
}

export async function getManagerContext() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile || profile.role !== "manager") return null;

  const { data: manager } = await supabase
    .from("managers")
    .select("*, branches(*)")
    .eq("user_id", profile.id)
    .single();

  return manager;
}
