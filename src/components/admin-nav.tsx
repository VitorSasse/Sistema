"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((current) => {
      const nextState = { ...current };

      for (const group of groups) {
        if (nextState[group.label] !== undefined) {
          continue;
        }

        nextState[group.label] = group.items.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
        );
      }

      return nextState;
    });
  }, [groups, pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label]
    }));
  }

  return (
    <nav className="admin-nav">
      {groups.map((group) => (
        <section key={group.label} className="admin-nav-group">
          <button
            type="button"
            className="admin-nav-group-trigger"
            onClick={() => toggleGroup(group.label)}
            aria-expanded={openGroups[group.label] ?? false}
          >
            <span className="admin-nav-group-trigger-label">{group.label}</span>
            <span className={`admin-nav-group-trigger-icon${openGroups[group.label] ? " is-open" : ""}`}>
              ‹
            </span>
          </button>

          <div className={`admin-nav-group-links${openGroups[group.label] ? " is-open" : ""}`}>
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
