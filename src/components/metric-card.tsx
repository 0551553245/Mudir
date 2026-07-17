import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("empty-state", className)}>
      <div
        className="mb-3 h-16 w-16 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #EAE2D3 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, #EAE2D3 0 2px, transparent 2px 8px)",
        }}
        aria-hidden
      />
      <p className="font-medium text-ink-soft">{title}</p>
      {description && <p className="text-ink-faint">{description}</p>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  trend,
  sub,
  icon,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  trend?: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: "accent" | "clay" | "gold";
}) {
  const toneClass =
    tone === "clay"
      ? "bg-clay-muted text-clay"
      : tone === "gold"
        ? "bg-gold-muted text-gold"
        : "bg-accent-muted text-accent";

  return (
    <div className="metric-card flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            toneClass
          )}
        >
          {icon ?? <span className="text-xs font-bold">•</span>}
        </div>
        {trend ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-on-track-bg px-2 py-0.5 text-[11px] font-bold text-on-track">
            {trend}
          </span>
        ) : null}
      </div>
      <div className="mt-5">
        <p className="label-mono">{label}</p>
        <p
          className={cn(
            "mt-1 text-3xl font-semibold tracking-tight",
            tone === "clay" ? "text-clay" : "text-accent"
          )}
        >
          {value}
        </p>
        {sub ? <p className="mt-1 text-sm text-ink-soft">{sub}</p> : null}
      </div>
    </div>
  );
}
