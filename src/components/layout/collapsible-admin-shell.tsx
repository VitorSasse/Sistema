"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

const SIDEBAR_STORAGE_KEY = "basepro-sidebar-collapsed";

type CollapsibleAdminShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

export function CollapsibleAdminShell({
  sidebar,
  children
}: CollapsibleAdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  const actionLabel = collapsed ? "Exibir menu lateral" : "Ocultar menu lateral";
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className={`admin-shell${collapsed ? " is-sidebar-collapsed" : ""}`}>
      <aside
        id="basepro-sidebar"
        className="admin-sidebar"
        aria-hidden={collapsed}
      >
        {sidebar}
      </aside>

      <button
        type="button"
        className="admin-sidebar-toggle"
        aria-controls="basepro-sidebar"
        aria-expanded={!collapsed}
        aria-label={actionLabel}
        title={actionLabel}
        onClick={toggleSidebar}
      >
        <ToggleIcon size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <div className="admin-main">{children}</div>
    </div>
  );
}
