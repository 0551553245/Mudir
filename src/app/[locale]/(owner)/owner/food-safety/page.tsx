import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { FoodSafetyClient } from "./food-safety-client";

export default async function FoodSafetyPage() {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data: standards } = await supabase
    .from("food_safety_standards")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  const branchIds = (branches ?? []).map((b) => b.id);
  const { data: readings } = branchIds.length
    ? await supabase
        .from("food_safety_readings")
        .select(
          "*, food_safety_standards(name), branches(name), managers(profiles(full_name))"
        )
        .in("branch_id", branchIds)
        .order("submitted_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <FoodSafetyClient
      standards={standards ?? []}
      branches={branches ?? []}
      readings={readings ?? []}
      restaurantId={restaurant.id}
    />
  );
}
