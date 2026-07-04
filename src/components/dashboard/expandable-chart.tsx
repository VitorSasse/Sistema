"use client";

import { Maximize2, X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

type ExpandableChartRender = (context: {
  height: number;
  expanded: boolean;
}) => ReactNode;

type ExpandableChartProps = {
  title: string;
  height: number;
  expandedHeight?: number;
  className?: string;
  children: ExpandableChartRender;
};

export function ExpandableChart({
  title,
  height,
  expandedHeight = 620,
  className,
  children
}: ExpandableChartProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className={`expandable-chart ${className ?? ""}`}>
        <button
          type="button"
          className="expandable-chart-trigger"
          aria-label={`Expandir grafico ${title}`}
          title="Expandir grafico"
          onClick={() => setOpen(true)}
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
        <div className="expandable-chart-content">
          {children({ height, expanded: false })}
        </div>
      </div>

      {mounted && open
        ? createPortal(
            <div
              className="expandable-chart-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setOpen(false);
                }
              }}
            >
              <section
                className="expandable-chart-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
              >
                <header className="expandable-chart-dialog-header">
                  <div>
                    <span>Visualizacao ampliada</span>
                    <h2 id={titleId}>{title}</h2>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="expandable-chart-close"
                    aria-label="Fechar grafico ampliado"
                    onClick={() => setOpen(false)}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </header>
                <div className="expandable-chart-dialog-body">
                  {children({ height: expandedHeight, expanded: true })}
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
