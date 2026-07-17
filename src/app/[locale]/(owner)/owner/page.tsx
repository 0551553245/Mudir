import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { getItemStatus } from "@/lib/tasks/period";
import type { TaskFrequency } from "@/lib/supabase/types";
import { OwnerDashboardView } from "./dashboard-view";
import { startOfDay } from "date-fns";

export default async function OwnerDashboardPage() {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const todayStart = startOfDay(new Date()).toISOString();

  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, task_items(*)")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const branchIds = branches?.map((b) => b.id) ?? [];

  const { data: completions } = branchIds.length
    ? await supabase
        .from("task_completions")
        .select("*")
        .in("branch_id", branchIds)
        .order("submitted_at", { ascending: false })
    : { data: [] };

  const { data: readingsToday } = branchIds.length
    ? await supabase
        .from("food_safety_readings")
        .select("*")
        .in("branch_id", branchIds)
        .gte("submitted_at", todayStart)
    : { data: [] };

  const { data: events } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date")
    .limit(2);

  let completed = 0;
  let due = 0;
  let missed = 0;
  let pending = 0;
  let total = 0;

  const branchRows = (branches ?? []).map((branch) => {
    let bCompleted = 0;
    let bDue = 0;
    let bMissed = 0;
    let bPending = 0;
    let bTotal = 0;

    for (const task of tasks ?? []) {
      if (task.branch_id && task.branch_id !== branch.id) continue;
      for (const item of task.task_items ?? []) {
        bTotal++;
        const lastCompletion = completions?.find(
          (c) => c.task_item_id === item.id && c.branch_id === branch.id
        );
        const status = getItemStatus({
          frequency: task.frequency as TaskFrequency,
          createdAt: new Date(item.created_at),
          lastCompletionAt: lastCompletion
            ? new Date(lastCompletion.submitted_at)
            : null,
        });
        if (status === "completed") bCompleted++;
        else if (status === "due") bDue++;
        else if (status === "missed") bMissed++;
        else bPending++;
      }
    }

    completed += bCompleted;
    due += bDue;
    missed += bMissed;
    pending += bPending;
    total += bTotal;

    const branchReadings =
      readingsToday?.filter((r) => r.branch_id === branch.id) ?? [];
    const passRate =
      branchReadings.length === 0
        ? null
        : Math.round(
            (branchReadings.filter((r) => r.passed).length /
              branchReadings.length) *
              100
          );

    return {
      id: branch.id,
      name: branch.name,
      completed: bCompleted,
      due: bDue,
      missed: bMissed,
      pending: bPending,
      total: bTotal,
      passRate,
    };
  });

  const completionPct =
    total === 0 ? 0 : Math.round((completed / total) * 100);
  const allReadings = readingsToday ?? [];
  const passRate =
    allReadings.length === 0
      ? null
      : Math.round(
          (allReadings.filter((r) => r.passed).length / allReadings.length) *
            100
        );

  const trendLabel =
    completionPct >= 80
      ? `+${completionPct}% today`
      : `${completionPct}% today`;

  return (
    <OwnerDashboardView
      restaurantId={restaurant.id}
      branchRows={branchRows}
      completionPct={completionPct}
      passRate={passRate}
      trendLabel={trendLabel}
      nextEvents={(events ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        event_date: e.event_date,
      }))}
    />
  );
}
