import { createClient } from "@/lib/supabase/server";
import { getManagerContext } from "@/lib/supabase/auth";
import { FoodSafetyPageClient } from "./food-safety-client";

export default async function ManagerFoodSafetyPage() {
  const context = await getManagerContext();
  if (!context) return null;

  const branch = context.branches as { id: string; name: string };
  const supabase = await createClient();

  const { data: standards } = await supabase
    .from("food_safety_standards")
    .select("*")
    .eq("restaurant_id", context.restaurant_id)
    .eq("is_active", true)
    .or(`branch_id.is.null,branch_id.eq.${branch.id}`);

  const { data: readings } = await supabase
    .from("food_safety_readings")
    .select("*")
    .eq("branch_id", branch.id)
    .order("submitted_at", { ascending: false });

  return (
    <FoodSafetyPageClient
      standards={standards ?? []}
      readings={readings ?? []}
      branchId={branch.id}
      managerId={context.id}
    />
  );
}
