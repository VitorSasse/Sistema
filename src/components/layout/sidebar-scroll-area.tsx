"use client";

import { useRef, type ReactNode, type WheelEvent } from "react";

type SidebarScrollAreaProps = {
  children: ReactNode;
};

export function SidebarScrollArea({ children }: SidebarScrollAreaProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (element.scrollHeight <= element.clientHeight) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    element.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div ref={ref} className="admin-sidebar-scroll" onWheel={handleWheel}>
      {children}
    </div>
  );
}
