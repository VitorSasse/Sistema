import type { ReactNode } from "react";

export function MedicaoField({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function MedicaoInfoCard({
  title,
  lines
}: {
  title: string;
  lines: string[];
}) {
  return (
    <article className="tile-card">
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>{title}</h3>
      <div className="list-stack">
        {lines.map((line) => (
          <span key={`${title}-${line}`} className="subtle">
            {line}
          </span>
        ))}
      </div>
    </article>
  );
}
