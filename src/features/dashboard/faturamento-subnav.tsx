"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const items = [
  { href: "/dashboard" as Route, label: "Faturamento por cliente" },
  { href: "/dashboard/mensal" as Route, label: "Faturamento mensal" }
];

export function FaturamentoSubnav() {
  const pathname = usePathname();

  return (
    <nav className="page-subnav" aria-label="Modos da dashboard de faturamento">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`page-subnav-link${isActive ? " page-subnav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
