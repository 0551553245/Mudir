"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import type { Notification, NotificationType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const FILTERS: Array<NotificationType | "all"> = [
  "all",
  "failed_reading",
  "missed_checklist",
  "billing",
];

export function NotificationsBell({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(40);
    setItems((data as Notification[]) ?? []);
  }, [restaurantId]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, load]);

  const unread = items.filter((n) => !n.is_read).length;
  const filtered =
    filter === "all" ? items : items.filter((n) => n.type === filter);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("restaurant_id", restaurantId)
      .eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-soft hover:text-ink"
        aria-label={t("title")}
      >
        Bell
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-needs-attention px-1 text-[10px] text-accent-contrast">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-sm font-semibold">{t("title")}</p>
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-accent hover:underline"
              >
                {t("markAllRead")}
              </button>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-[11px]",
                    filter === f
                      ? "bg-accent text-accent-contrast"
                      : "bg-bg text-ink-soft"
                  )}
                >
                  {t(`filter.${f}`)}
                </button>
              ))}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="empty-state py-8">{t("empty")}</p>
              ) : (
                filtered.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "block w-full border-b border-border px-3 py-2.5 text-start hover:bg-bg",
                      !n.is_read && "bg-accent-muted/40"
                    )}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-ink-soft">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-ink-faint">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-border px-3 py-2">
              <Link
                href="/owner/notifications"
                className="text-xs text-accent hover:underline"
                onClick={() => setOpen(false)}
              >
                {t("viewAll")}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
