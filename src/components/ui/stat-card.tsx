import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
};

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
  className = ""
}: StatCardProps) {
  return (
    <article className={`ui-stat-card ui-stat-card-${tone} ${className}`.trim()}>
      <div className="ui-stat-card-top">
        <span>{label}</span>
        {Icon ? (
          <span className="ui-stat-card-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={2.1} />
          </span>
        ) : null}
      </div>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}
