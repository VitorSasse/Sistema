"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const items = [
  { href: "/frota/dashboard" as Route, label: "Resumo da frota" },
  { href: "/frota/dashboard/mensal" as Route, label: "Faturamento mensal" }
];

export function FrotaSubnav() {
  const pathname = usePathname();

  return (
    <nav className="page-subnav" aria-label="Modos da dashboard da frota">
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
