"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/settings";

export async function submitTaskCompletion(formData: FormData) {
  const supabase = await createClient();
  const taskItemId = formData.get("task_item_id") as string;
  const branchId = formData.get("branch_id") as string;
  const managerId = formData.get("manager_id") as string;
  const note = formData.get("note") as string;
  const numberValue = formData.get("number_value") as string;
  const photoUrl = formData.get("photo_url") as string;

  const { data, error } = await supabase
    .from("task_completions")
    .insert({
      task_item_id: taskItemId,
      branch_id: branchId,
      manager_id: managerId,
      note: note || null,
      number_value: numberValue ? parseFloat(numberValue) : null,
      photo_url: photoUrl || null,
      status: "completed",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/manager");
  return { data };
}

export async function submitFoodSafetyReading(formData: FormData) {
  const supabase = await createClient();
  const standardId = formData.get("standard_id") as string;
  const branchId = formData.get("branch_id") as string;
  const managerId = formData.get("manager_id") as string;
  const value = parseFloat(formData.get("value") as string);
  const note = (formData.get("note") as string) || null;

  const { data, error } = await supabase
    .from("food_safety_readings")
    .insert({
      standard_id: standardId,
      branch_id: branchId,
      manager_id: managerId,
      value,
      note,
    })
    .select("*, food_safety_standards(name, restaurant_id), branches(name)")
    .single();

  if (error) return { error: error.message };

  if (data && data.passed === false) {
    if (!note || !note.trim()) {
      return { error: "Note is required for failed readings" };
    }

    const standard = data.food_safety_standards as {
      name: string;
      restaurant_id: string;
    };
    const branch = data.branches as { name: string };

    const admin = createServiceClient();
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("owner_user_id, notify_food_safety_failure, name")
      .eq("id", standard.restaurant_id)
      .single();

    if (restaurant && restaurant.notify_food_safety_failure !== false) {
      await createNotification({
        restaurantId: standard.restaurant_id,
        userId: restaurant.owner_user_id,
        type: "failed_reading",
        title: `Failed reading: ${standard.name}`,
        body: `${branch?.name ?? "Branch"} · value ${value}${note ? ` · ${note}` : ""}`,
        relatedId: data.id,
      });
    }

    revalidatePath("/manager");
    revalidatePath("/owner/food-safety");
    return { data, notified: true };
  }

  revalidatePath("/manager");
  return { data, notified: false };
}

export async function uploadProof(
  file: FormData
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const photo = file.get("photo") as File;
  if (!photo) return { error: "No file" };

  const ext = photo.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from("proofs").upload(path, photo);

  if (error) return { error: error.message };

  const { data: signedData, error: signError } = await supabase.storage
    .from("proofs")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError || !signedData) {
    return { error: signError?.message ?? "Failed to sign URL" };
  }

  return { url: signedData.signedUrl };
}

/** Retry-aware upload with up to 3 attempts */
export async function uploadProofWithRetry(
  file: FormData,
  attempts = 3
): Promise<{ url: string } | { error: string }> {
  let lastError = "Upload failed";
  for (let i = 0; i < attempts; i++) {
    const result = await uploadProof(file);
    if ("url" in result && result.url) return { url: result.url };
    lastError = "error" in result ? (result.error ?? lastError) : lastError;
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return { error: lastError };
}
