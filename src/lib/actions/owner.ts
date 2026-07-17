"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { logActivity, getOwnerRestaurant } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import {
  evaluateSubscription,
  getBranchBlockReason,
} from "@/lib/billing/subscription";
import { ENTERPRISE_BRANCH_THRESHOLD } from "@/lib/supabase/types";
import { syncBranchCount } from "@/lib/actions/billing";

async function getOwnerSubscriptionContext() {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const admin = createServiceClient();
  await admin.rpc("expire_overdue_trials");

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .single();

  const { count: branchCount } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const access = evaluateSubscription(
    restaurant,
    subscription,
    branchCount ?? 0
  );

  return { restaurant, subscription, branchCount: branchCount ?? 0, access };
}

export async function createBranch(formData: FormData) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const restaurantId = formData.get("restaurant_id") as string;
  const locale = (formData.get("locale") as string) ?? "en";

  if (restaurantId !== ctx.restaurant.id) {
    return { error: "Unauthorized" };
  }

  const blockReason = getBranchBlockReason(ctx.access, locale);
  if (blockReason) {
    return { error: blockReason, billingRequired: true };
  }

  if (ctx.branchCount + 1 >= ENTERPRISE_BRANCH_THRESHOLD) {
    const admin = createServiceClient();
    await admin.rpc("sync_subscription_status", {
      p_restaurant_id: restaurantId,
      p_status: "enterprise",
    });
    return {
      error:
        locale === "ar"
          ? "10+ فروع — تواصل مع sales@scopsa.com"
          : "10+ branches — contact sales@scopsa.com",
      enterprise: true,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .insert({ name, address, restaurant_id: restaurantId })
    .select()
    .single();

  if (error) return { error: error.message };

  await syncBranchCount(restaurantId);

  await logActivity("branch.created", "branch", data.id);
  revalidatePath("/owner");
  revalidatePath("/owner/branches");
  revalidatePath("/owner/billing");
  return { data };
}

export async function createManager(formData: FormData) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return {
      error: "Subscription inactive — update billing to continue",
      billingRequired: true,
    };
  }

  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const branchId = formData.get("branch_id") as string;
  const restaurantId = formData.get("restaurant_id") as string;

  const { createServiceClient } = await import("@/lib/supabase/admin");
  const admin = createServiceClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create user" };
  }

  await admin.from("profiles").insert({
    id: authData.user.id,
    email,
    full_name: fullName,
    role: "manager",
  });

  const { data, error } = await supabase.from("managers").insert({
    user_id: authData.user.id,
    branch_id: branchId,
    restaurant_id: restaurantId,
  }).select().single();

  if (error) return { error: error.message };

  await logActivity("manager.created", "manager", data.id);
  revalidatePath("/owner/managers");
  return { data };
}

export async function createTask(formData: FormData) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return { error: "Subscription inactive — update billing to continue", billingRequired: true };
  }

  const supabase = await createClient();
  const restaurantId = formData.get("restaurant_id") as string;
  const branchId = formData.get("branch_id") as string;
  const title = formData.get("title") as string;
  const titleAr = formData.get("title_ar") as string;
  const category = (formData.get("category") as string) || "custom";
  const frequency = formData.get("frequency") as string;
  const itemsJson = formData.get("items") as string;
  const items = JSON.parse(itemsJson) as Array<{
    label: string;
    label_ar?: string;
    requires_photo: boolean;
    requires_note: boolean;
    requires_number: boolean;
  }>;

  const { data: { user } } = await supabase.auth.getUser();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      restaurant_id: restaurantId,
      branch_id: branchId || null,
      title,
      title_ar: titleAr || null,
      category,
      frequency,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (items.length > 0) {
    await supabase.from("task_items").insert(
      items.map((item, i) => ({
        task_id: task.id,
        label: item.label,
        label_ar: item.label_ar || null,
        sort_order: i,
        requires_photo: item.requires_photo,
        requires_note: item.requires_note,
        requires_number: item.requires_number,
      }))
    );
  }

  await logActivity("task.created", "task", task.id);
  revalidatePath("/owner/tasks");
  return { data: task };
}

export async function updateTask(formData: FormData) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return { error: "Subscription inactive — update billing to continue", billingRequired: true };
  }

  const supabase = await createClient();
  const taskId = formData.get("task_id") as string;
  const branchId = formData.get("branch_id") as string;
  const title = formData.get("title") as string;
  const titleAr = formData.get("title_ar") as string;
  const category = (formData.get("category") as string) || "custom";
  const frequency = formData.get("frequency") as string;
  const itemsJson = formData.get("items") as string;
  const items = JSON.parse(itemsJson || "[]") as Array<{
    label: string;
    label_ar?: string;
    requires_photo: boolean;
    requires_note: boolean;
    requires_number: boolean;
  }>;

  const { error } = await supabase
    .from("tasks")
    .update({
      branch_id: branchId || null,
      title,
      title_ar: titleAr || null,
      category,
      frequency,
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  await supabase.from("task_items").delete().eq("task_id", taskId);

  if (items.length > 0) {
    await supabase.from("task_items").insert(
      items.map((item, i) => ({
        task_id: taskId,
        label: item.label,
        label_ar: item.label_ar || null,
        sort_order: i,
        requires_photo: item.requires_photo,
        requires_note: item.requires_note,
        requires_number: item.requires_number,
      }))
    );
  }

  await logActivity("task.updated", "task", taskId);
  revalidatePath("/owner/tasks");
  return { success: true };
}

export async function createFoodSafetyStandard(formData: FormData) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return { error: "Subscription inactive — update billing to continue", billingRequired: true };
  }

  const supabase = await createClient();
  const restaurantId = formData.get("restaurant_id") as string;
  const branchId = formData.get("branch_id") as string;
  const name = formData.get("name") as string;
  const nameAr = formData.get("name_ar") as string;
  const rangeType = (formData.get("range_type") as string) || "min_max";
  const minRaw = formData.get("min_value") as string;
  const maxRaw = formData.get("max_value") as string;
  const unit = formData.get("unit") as string;
  const checkFrequency = (formData.get("check_frequency") as string) || "daily";

  let minValue: number | null = minRaw ? parseFloat(minRaw) : null;
  let maxValue: number | null = maxRaw ? parseFloat(maxRaw) : null;

  if (rangeType === "min_only") maxValue = null;
  if (rangeType === "max_only") minValue = null;

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("food_safety_standards")
    .insert({
      restaurant_id: restaurantId,
      branch_id: branchId || null,
      name,
      name_ar: nameAr || null,
      range_type: rangeType,
      min_value: minValue,
      max_value: maxValue,
      unit,
      check_frequency: checkFrequency,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity("standard.created", "food_safety_standard", data.id);
  revalidatePath("/owner/food-safety");
  return { data };
}

export async function createScheduleEvent(formData: FormData) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return { error: "Subscription inactive — update billing to continue", billingRequired: true };
  }

  const supabase = await createClient();
  const restaurantId = formData.get("restaurant_id") as string;
  const branchId = formData.get("branch_id") as string;
  const title = formData.get("title") as string;
  const titleAr = formData.get("title_ar") as string;
  const type = formData.get("type") as string;
  const eventDate = formData.get("event_date") as string;
  const description = formData.get("description") as string;

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("schedule_events")
    .insert({
      restaurant_id: restaurantId,
      branch_id: branchId || null,
      title,
      title_ar: titleAr || null,
      type,
      event_date: eventDate,
      description: description || null,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity("schedule.created", "schedule_event", data.id);
  revalidatePath("/owner/schedule");
  return { data };
}

export async function deleteBranch(id: string) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return { error: "Subscription inactive — update billing to continue", billingRequired: true };
  }

  const supabase = await createClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("restaurant_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) return { error: error.message };

  if (branch?.restaurant_id) {
    await syncBranchCount(branch.restaurant_id);
  }

  await logActivity("branch.deleted", "branch", id);
  revalidatePath("/owner/branches");
  revalidatePath("/owner/billing");
  return { success: true };
}

export async function deleteTask(id: string) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return { error: "Subscription inactive — update billing to continue", billingRequired: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  await logActivity("task.deleted", "task", id);
  revalidatePath("/owner/tasks");
  return { success: true };
}

export async function deleteManager(id: string, userId: string) {
  const ctx = await getOwnerSubscriptionContext();
  if (!ctx?.access.canWrite) {
    return { error: "Subscription inactive — update billing to continue", billingRequired: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("managers").delete().eq("id", id);
  if (error) return { error: error.message };

  const { createServiceClient } = await import("@/lib/supabase/admin");
  const admin = createServiceClient();
  await admin.auth.admin.deleteUser(userId);

  await logActivity("manager.deleted", "manager", id);
  revalidatePath("/owner/managers");
  return { success: true };
}
