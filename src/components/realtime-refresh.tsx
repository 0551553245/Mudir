"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeRefreshProps {
  tables: string[];
  filter?: string;
  onUpdate: () => void;
}

export function RealtimeRefresh({
  tables,
  filter,
  onUpdate,
}: RealtimeRefreshProps) {
  useEffect(() => {
    const supabase = createClient();
    const channels = tables.map((table) => {
      const channel = supabase
        .channel(`realtime-${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(filter ? { filter } : {}),
          },
          () => onUpdate()
        )
        .subscribe();
      return channel;
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [tables, filter, onUpdate]);

  return null;
}
