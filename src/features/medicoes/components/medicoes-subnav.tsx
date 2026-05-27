"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const items = [
  { href: "/medicoes" as Route, label: "Medicao real" },
  { href: "/medicoes/simulacao" as Route, label: "Simulacao" }
];

export function MedicoesSubnav() {
  const pathname = usePathname();

  return (
    <nav className="page-subnav" aria-label="Modos de medicao">
      {items.map((item) => {
        const isActive =
          item.href === "/medicoes"
            ? pathname === "/medicoes"
            : pathname?.startsWith(item.href);

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
