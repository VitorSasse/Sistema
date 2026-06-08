import { ReactNode } from "react";

type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
};

type SimpleTableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  data: T[];
};

export function SimpleTable<T extends Record<string, unknown>>({
  columns,
  data
}: SimpleTableProps<T>) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        background: "var(--surface)",
        color: "var(--text)"
      }}
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={String(column.key)}
              style={{ textAlign: "left", padding: 12, borderBottom: "1px solid var(--line-strong)" }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td
                key={String(column.key)}
                style={{ padding: 12, borderBottom: "1px solid var(--line)" }}
              >
                {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
