"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Crown,
  Database,
  ShieldCheck,
  Truck,
  WalletCards,
  type LucideIcon
} from "lucide-react";

type NavigationItem = {
  href: Route;
  label: string;
};

type NavigationGroup = {
  label: string;
  description: string;
  items: NavigationItem[];
  icon?: string;
};

type AdminNavProps = {
  groups: NavigationGroup[];
};

const iconByGroup: Record<string, LucideIcon> = {
  dashboard: BarChart3,
  master: Crown,
  cadastros: Database,
  operacao: ClipboardList,
  financeiro: WalletCards,
  frota: Truck,
  seguranca: ShieldCheck
};

function isRouteMatch(pathname: string, href: Route) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ groups }: AdminNavProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const activeHref = useMemo(() => {
    return groups
      .flatMap((group) => group.items)
      .filter((item) => isRouteMatch(pathname, item.href))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  }, [groups, pathname]);

  useEffect(() => {
    setOpenGroups((current) => {
      const nextState = { ...current };

      for (const group of groups) {
        const hasActiveItem = group.items.some((item) => item.href === activeHref);

        if (nextState[group.label] !== undefined) {
          if (hasActiveItem) {
            nextState[group.label] = true;
          }

          continue;
        }

        nextState[group.label] = hasActiveItem;
      }

      return nextState;
    });
  }, [activeHref, groups]);

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
            <span className="admin-nav-group-trigger-heading">
              <span className={`admin-nav-group-icon${group.icon ? ` is-${group.icon}` : ""}`} aria-hidden="true">
                {(() => {
                  const Icon = group.icon ? iconByGroup[group.icon] : null;
                  return Icon ? <Icon size={18} strokeWidth={2.2} /> : <span className="admin-nav-group-icon-shape" />;
                })()}
              </span>
              <span className="admin-nav-group-trigger-label">{group.label}</span>
            </span>
            <ChevronDown
              className={`admin-nav-group-trigger-icon${openGroups[group.label] ? " is-open" : ""}`}
              size={16}
              aria-hidden="true"
            />
          </button>

          <div className={`admin-nav-group-links${openGroups[group.label] ? " is-open" : ""}`}>
            {group.items.map((item) => {
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link${isActive ? " admin-nav-link-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
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
