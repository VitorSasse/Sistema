"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent
} from "react";
import { createPortal } from "react-dom";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export function SearchableSelect(props: {
  value: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const {
    value,
    options,
    placeholder = "Digite para buscar",
    emptyLabel = "Nenhum resultado encontrado.",
    disabled = false,
    onChange
  } = props;

  const selectedOption = options.find((option) => option.value === value) ?? null;
  const [query, setQuery] = useState(selectedOption?.label ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedQuery) {
      return options.slice(0, 20);
    }

    return options
      .filter((option) =>
        option.label.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      )
      .slice(0, 20);
  }, [options, query]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredOptions.length);
  }, [filteredOptions.length]);

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      return;
    }

    if (filteredOptions.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    const selectedIndex = filteredOptions.findIndex((option) => option.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredOptions, isOpen, value]);

  useEffect(() => {
    if (highlightedIndex < 0) {
      return;
    }

    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return;
    }

    function updateMenuPosition() {
      const wrapper = wrapperRef.current;

      if (!wrapper) {
        return;
      }

      const rect = wrapper.getBoundingClientRect();

      setMenuStyle({
        position: "fixed",
        zIndex: 1200,
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: 220,
        overflowY: "auto",
        border: "1px solid var(--line-strong)",
        borderRadius: 14,
        boxShadow: "var(--shadow-md)",
        background: "var(--surface)"
      });
    }

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  function handleInputChange(nextValue: string) {
    setQuery(nextValue);
    setIsOpen(true);

    if (!nextValue.trim()) {
      if (value) {
        onChange("");
      }
      return;
    }
  }

  function handleSelect(option: SearchableSelectOption) {
    setQuery(option.label);
    onChange(option.value);
    setIsOpen(false);
  }

  function handleClear() {
    setQuery("");
    onChange("");
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => {
        if (filteredOptions.length === 0) return -1;
        if (current < 0) return 0;
        return Math.min(current + 1, filteredOptions.length - 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => {
        if (filteredOptions.length === 0) return -1;
        if (current < 0) return filteredOptions.length - 1;
        return Math.max(current - 1, 0);
      });
      return;
    }

    if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
      event.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) {
        handleSelect(option);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        className="field-control"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        style={{ paddingRight: value || query ? 44 : undefined }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        onChange={(event) => handleInputChange(event.target.value)}
      />

      {!disabled && (value || query) ? (
        <button
          type="button"
          aria-label="Limpar selecao"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleClear}
          style={{
            position: "absolute",
            top: "50%",
            right: 10,
            transform: "translateY(-50%)",
            width: 24,
            height: 24,
            borderRadius: 999,
            border: "1px solid var(--line-strong)",
            background: "var(--surface-elevated)",
            color: "var(--muted)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            lineHeight: 1
          }}
        >
          x
        </button>
      ) : null}

      {isOpen && !disabled && menuStyle
        ? createPortal(
            <div className="surface" style={menuStyle}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(option)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      background:
                        option.value === value || highlightedIndex === index
                          ? "rgba(249, 115, 22, 0.16)"
                          : "transparent",
                      cursor: "pointer",
                      color: "var(--text)"
                    }}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div style={{ padding: "10px 12px", color: "var(--muted)" }}>
                  {emptyLabel}
                </div>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
