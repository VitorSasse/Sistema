"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: Route;
  label: string;
};

type NavigationGroup = {
  label: string;
  description: string;
  items: NavigationItem[];
};

type AdminNavProps = {
  groups: NavigationGroup[];
};

export function AdminNav({ groups }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      {groups.map((group) => (
        <section key={group.label} className="admin-nav-section">
          <p className="admin-nav-section-label">{group.label}</p>
          <div className="admin-nav-section-links">
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link${isActive ? " admin-nav-link-active" : ""}`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
