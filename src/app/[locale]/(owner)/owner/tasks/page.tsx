import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, task_items(*)")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const branchIds = (branches ?? []).map((b) => b.id);
  const { data: completions } = branchIds.length
    ? await supabase
        .from("task_completions")
        .select("task_item_id, branch_id, submitted_at")
        .in("branch_id", branchIds)
        .order("submitted_at", { ascending: false })
    : { data: [] };

  return (
    <TasksClient
      tasks={tasks ?? []}
      branches={branches ?? []}
      restaurantId={restaurant.id}
      completions={completions ?? []}
    />
  );
}
