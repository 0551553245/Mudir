import { cn } from "@/lib/utils";

export interface BarChartItem {
  label: string;
  value: number;
  displayValue?: string;
}

interface BarChartProps {
  items: BarChartItem[];
  maxValue?: number;
  valueSuffix?: string;
  className?: string;
  barClassName?: string;
}

export function BarChart({
  items,
  maxValue,
  valueSuffix = "",
  className,
  barClassName,
}: BarChartProps) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-faint">—</p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-16 shrink-0 font-mono text-[10px] text-ink-faint">
              {item.label}
            </span>
            <div className="relative h-6 min-w-0 flex-1 rounded-lg bg-cream">
              <div
                className={cn(
                  "absolute inset-y-0 start-0 rounded-lg bg-accent/80 transition-all",
                  barClassName
                )}
                style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-end font-mono text-[10px] text-ink-soft">
              {item.displayValue ?? `${item.value}${valueSuffix}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface RateChartProps {
  items: Array<{ label: string; rate: number }>;
  className?: string;
}

export function RateChart({ items, className }: RateChartProps) {
  return (
    <BarChart
      className={className}
      maxValue={100}
      valueSuffix="%"
      items={items.map((i) => ({
        label: i.label,
        value: i.rate,
        displayValue: `${i.rate}%`,
      }))}
      barClassName="bg-accent"
    />
  );
}

interface SparklineProps {
  values: number[];
  className?: string;
}

export function Sparkline({ values, className }: SparklineProps) {
  if (values.length === 0) return null;

  const max = Math.max(...values, 1);
  const width = 120;
  const height = 32;
  const step = width / Math.max(values.length - 1, 1);

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("text-accent", className)}
      width={width}
      height={height}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
