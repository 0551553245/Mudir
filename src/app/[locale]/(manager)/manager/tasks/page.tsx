import { createClient } from "@/lib/supabase/server";
import { getManagerContext } from "@/lib/supabase/auth";
import { TasksPageClient } from "./tasks-client";

export default async function ManagerTasksPage() {
  const context = await getManagerContext();
  if (!context) return null;

  const branch = context.branches as { id: string; name: string };
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, task_items(*)")
    .eq("restaurant_id", context.restaurant_id)
    .eq("is_active", true)
    .or(`branch_id.is.null,branch_id.eq.${branch.id}`);

  const { data: completions } = await supabase
    .from("task_completions")
    .select("*")
    .eq("branch_id", branch.id)
    .order("submitted_at", { ascending: false });

  return (
    <TasksPageClient
      tasks={tasks ?? []}
      completions={completions ?? []}
      branchId={branch.id}
      managerId={context.id}
    />
  );
}
