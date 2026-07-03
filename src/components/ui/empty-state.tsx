import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, action, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <span className="ui-empty-state-icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2} />
      </span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div className="ui-empty-state-action">{action}</div> : null}
    </div>
  );
}
