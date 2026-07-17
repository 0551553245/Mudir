import { getOwnerRestaurant, getProfile } from "@/lib/supabase/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const restaurant = await getOwnerRestaurant();
  const profile = await getProfile();
  if (!restaurant || !profile) return null;

  return (
    <SettingsClient
      restaurant={restaurant as never}
      locale={profile.locale}
    />
  );
}
