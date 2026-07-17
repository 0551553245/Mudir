"use client";

import { useRouter } from "@/i18n/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { useCallback } from "react";

export function OwnerDashboardClient({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);

  return (
    <RealtimeRefresh
      tables={["task_completions", "food_safety_readings"]}
      onUpdate={refresh}
    />
  );
}
