import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
};

export function StatusBadge({ children, tone = "neutral", className = "" }: StatusBadgeProps) {
  return <span className={`ui-status-badge ui-status-badge-${tone} ${className}`.trim()}>{children}</span>;
}
