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
  width: number | "100%";
  expanded: boolean;
}) => ReactNode;

type ExpandableChartProps = {
  title: string;
  height: number;
  expandedHeight?: number;
  className?: string;
  dialogClassName?: string;
  children: ExpandableChartRender;
};

export function ExpandableChart({
  title,
  height,
  expandedHeight = 620,
  className,
  dialogClassName,
  children
}: ExpandableChartProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedReady, setExpandedReady] = useState(false);
  const [expandedSize, setExpandedSize] = useState({ width: 0, height: 0 });
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setExpandedReady(false);
      setExpandedSize({ width: 0, height: 0 });
      return;
    }

    let animationFrame = 0;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    animationFrame = window.requestAnimationFrame(() => {
      setExpandedReady(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      setExpandedReady(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !expandedReady) {
      return;
    }

    let animationFrame = 0;

    const measureViewport = () => {
      const rect = viewportRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setExpandedSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height)
      });
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureViewport);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [expandedReady, open]);

  const expandedChartHeight = Math.max(260, expandedSize.height || expandedHeight);
  const canRenderExpandedChart = expandedReady && expandedSize.width > 80 && expandedSize.height > 80;

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
          {children({ height, width: "100%", expanded: false })}
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
                className={`expandable-chart-dialog ${dialogClassName ?? ""}`}
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
                  <div ref={viewportRef} className="expandable-chart-dialog-viewport">
                    {canRenderExpandedChart
                      ? (
                          <div className="expandable-chart-dialog-render" key={`${titleId}-expanded`}>
                            {children({
                              height: expandedChartHeight,
                              width: expandedSize.width,
                              expanded: true
                            })}
                          </div>
                        )
                      : null}
                  </div>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
