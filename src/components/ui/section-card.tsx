import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, description, actions, children, className = "" }: SectionCardProps) {
  return (
    <section className={`ui-section-card ${className}`.trim()}>
      {title || description || actions ? (
        <header className="ui-section-card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="ui-section-card-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
