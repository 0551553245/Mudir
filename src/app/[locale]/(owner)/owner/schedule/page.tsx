import { createClient } from "@/lib/supabase/server";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("event_date");

  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id);

  return (
    <ScheduleClient
      events={events ?? []}
      branches={branches ?? []}
      restaurantId={restaurant.id}
    />
  );
}
