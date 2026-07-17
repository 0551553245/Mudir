"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptionalBranchContext } from "./branch-context";

export function BranchSwitcher() {
  const t = useTranslations("common");
  const ctx = useOptionalBranchContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!ctx) return null;

  const options = [
    { value: "all", label: t("allBranches") },
    ...ctx.branches.map((b) => ({ value: b.id, label: b.name })),
  ];
  const selected =
    options.find((o) => o.value === ctx.selectedBranchId) ?? options[0];

  function select(value: string) {
    ctx!.setSelectedBranchId(value);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("branch")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-w-[140px] items-center gap-2 rounded-full border border-border bg-card py-2.5 pe-3 ps-4",
          "font-[family-name:var(--font-ibm-plex-mono)] text-[13px] font-semibold text-ink shadow-sm",
          "transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        )}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          className={cn(
            "ms-auto h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("branch")}
          className="absolute start-0 top-[calc(100%+6px)] z-50 max-h-64 min-w-full overflow-auto rounded-[14px] border border-border bg-card py-1.5 shadow-[0_12px_32px_rgba(15,45,32,0.12)]"
        >
          {options.map((opt) => {
            const active = opt.value === ctx.selectedBranchId;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(opt.value)}
                  className={cn(
                    "flex w-full items-center px-3.5 py-2.5 text-start",
                    "font-[family-name:var(--font-ibm-plex-mono)] text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-[#1B4332] text-[#F7F5F0]"
                      : "text-ink hover:bg-bg"
                  )}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
