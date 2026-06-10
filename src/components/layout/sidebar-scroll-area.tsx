"use client";

import { useRef, type ReactNode, type WheelEvent } from "react";

type PropriedadesAreaRolagemLateral = {
  children: ReactNode;
};

export function SidebarScrollArea({ children }: PropriedadesAreaRolagemLateral) {
  const referenciaContainer = useRef<HTMLDivElement | null>(null);

  function lidarComRolagem(evento: WheelEvent<HTMLDivElement>) {
    const elemento = referenciaContainer.current;

    if (!elemento) {
      return;
    }

    if (elemento.scrollHeight <= elemento.clientHeight) {
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }

    elemento.scrollTop += evento.deltaY;
    evento.preventDefault();
    evento.stopPropagation();
  }

  return (
    <div ref={referenciaContainer} className="admin-sidebar-scroll" onWheel={lidarComRolagem}>
      {children}
    </div>
  );
}
