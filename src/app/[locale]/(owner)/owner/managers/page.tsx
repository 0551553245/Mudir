import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { ManagersClient } from "./managers-client";

export default async function ManagersPage() {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data: managers } = await supabase
    .from("managers")
    .select("*, profiles(full_name, email), branches(name)")
    .eq("restaurant_id", restaurant.id);

  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  return (
    <ManagersClient
      managers={managers ?? []}
      branches={branches ?? []}
      restaurantId={restaurant.id}
    />
  );
}
