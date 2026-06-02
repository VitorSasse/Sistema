"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const items = [
  { href: "/dashboard/executivo" as Route, label: "Equipamentos fixos" },
  {
    href: "/dashboard/executivo/complementares" as Route,
    label: "Equipamentos complementares"
  }
];

export function ExecutivoSubnav() {
  const pathname = usePathname();

  return (
    <nav className="page-subnav" aria-label="Modos da dashboard executiva">
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
