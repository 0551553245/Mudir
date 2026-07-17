"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getOwnerRestaurant, getProfile, logActivity } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import type { NotificationType } from "@/lib/supabase/types";

export async function updateRestaurantSettings(formData: FormData) {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name: formData.get("name") as string,
      commercial_registration:
        (formData.get("commercial_registration") as string) || null,
      vat_number: (formData.get("vat_number") as string) || null,
      timezone: (formData.get("timezone") as string) || "Asia/Riyadh",
      notify_missed_checklist: formData.get("notify_missed_checklist") === "on",
      notify_food_safety_failure:
        formData.get("notify_food_safety_failure") === "on",
      notify_weekly_summary: false,
    })
    .eq("id", restaurant.id);

  if (error) return { error: error.message };

  const locale = formData.get("locale") as string;
  if (locale === "ar" || locale === "en") {
    const profile = await getProfile();
    if (profile) {
      await supabase
        .from("profiles")
        .update({
          locale,
          digest_enabled: false,
          digest_frequency: "off",
        })
        .eq("id", profile.id);
    }
  }

  revalidatePath("/owner/settings");
  return { success: true };
}

export async function createNotification(params: {
  restaurantId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  relatedId?: string;
}) {
  const admin = createServiceClient();
  await admin.from("notifications").insert({
    restaurant_id: params.restaurantId,
    user_id: params.userId ?? null,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    related_id: params.relatedId ?? null,
  });
}

export async function acknowledgeReading(readingId: string) {
  const profile = await getProfile();
  const restaurant = await getOwnerRestaurant();
  if (!profile || !restaurant) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("food_safety_readings")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: profile.id,
    })
    .eq("id", readingId);

  if (error) return { error: error.message };

  await logActivity("reading.acknowledged", "food_safety_reading", readingId);
  revalidatePath("/owner/food-safety");
  return { success: true };
}
