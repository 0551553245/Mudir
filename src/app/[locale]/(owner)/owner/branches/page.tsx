import { getTranslations, getLocale } from "next-intl/server";
import { getBillingState } from "@/lib/actions/billing";
import { getBranchBlockReason } from "@/lib/billing/subscription";
import { getOwnerRestaurant } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { BranchesClient } from "./branches-client";

export default async function BranchesPage() {
  await getTranslations("owner");
  const locale = await getLocale();
  const restaurant = await getOwnerRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at");

  const billing = await getBillingState();
  const access = billing?.access;
  const blockReason = access
    ? getBranchBlockReason(access, locale)
    : null;

  return (
    <BranchesClient
      branches={branches ?? []}
      restaurantId={restaurant.id}
      canAddBranch={access?.canAddBranch ?? true}
      blockReason={blockReason}
    />
  );
}
