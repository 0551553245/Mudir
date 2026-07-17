import { cn } from "@/lib/utils";
import { RoleTag } from "./role-tag";
import type { UserRole } from "@/lib/supabase/types";

interface PanelBlockProps {
  title: string;
  role?: UserRole;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PanelBlock({
  title,
  role,
  children,
  action,
  className,
}: PanelBlockProps) {
  return (
    <section className={cn("panel-block", className)}>
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <h2 className="text-lg">{title}</h2>
          {role && <RoleTag role={role} />}
        </div>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

interface FeatureRowProps {
  title: string;
  description?: string;
  trailing?: React.ReactNode;
}

export function FeatureRow({ title, description, trailing }: FeatureRowProps) {
  return (
    <div className="feature-row">
      <span className="feature-dot" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="mt-0.5 text-[13px] text-ink-soft">{description}</p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="label-mono">{label}</p>
      <p className="font-display mt-2 text-3xl font-medium text-ink">{value}</p>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}
