import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function MgrCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-[#F4F4F2] p-5",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MgrCardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-[12px] font-semibold text-forest hover:underline"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}

export function ProgressRing({
  pct,
  size = 84,
  stroke = 8,
  color,
  label,
  sublabel,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
  label: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = `${((Math.min(100, Math.max(0, pct)) / 100) * c).toFixed(1)} ${c}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(22,22,22,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[17px] font-semibold leading-none text-forest">
          {label}
        </span>
        {sublabel ? (
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function EventTypeBadge({
  type,
  label,
}: {
  type: string;
  label?: string;
}) {
  const styles: Record<string, string> = {
    training: "bg-[#D8EDE6] text-[#013F32]",
    audit: "bg-[#F3D6D8] text-[#8B3A45]",
    inspection: "bg-[#E8E6F5] text-[#4A4580]",
    other: "bg-[#E8E8E6] text-ink-soft",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        styles[type] ?? styles.other
      )}
    >
      {label ?? type}
    </span>
  );
}

export function initialsFromName(name: string | null | undefined, email?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "M";
}
