"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type SearchableMultiSelectOption = {
  value: string;
  label: string;
};

export function SearchableMultiSelect(props: {
  values: string[];
  options: SearchableMultiSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  onChange: (values: string[]) => void;
}) {
  const {
    values,
    options,
    placeholder = "Digite para buscar",
    emptyLabel = "Nenhum resultado encontrado.",
    disabled = false,
    onChange
  } = props;

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOptions = useMemo(
    () => options.filter((option) => values.includes(option.value)),
    [options, values]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedQuery) {
      return options.slice(0, 30);
    }

    return options
      .filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
      .slice(0, 30);
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

    setHighlightedIndex(0);
  }, [filteredOptions, isOpen]);

  useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  function toggleValue(value: string) {
    const nextValues = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    onChange(nextValues);
  }

  function removeValue(value: string) {
    onChange(values.filter((item) => item !== value));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

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
        toggleValue(option.value);
      }
      return;
    }

    if (event.key === "Backspace" && !query && selectedOptions.length > 0) {
      event.preventDefault();
      removeValue(selectedOptions[selectedOptions.length - 1]!.value);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        className="field-control"
        style={{
          display: "grid",
          gap: 8,
          minHeight: 46,
          paddingTop: 8,
          paddingBottom: 8,
          alignContent: "start"
        }}
      >
        {selectedOptions.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectedOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => removeValue(option.value)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid rgba(19, 94, 85, 0.16)",
                  borderRadius: 999,
                  background: "rgba(19, 94, 85, 0.08)",
                  color: "#135e55",
                  padding: "5px 10px",
                  cursor: disabled ? "default" : "pointer",
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                {option.label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}

        <input
          value={query}
          disabled={disabled}
          placeholder={selectedOptions.length > 0 ? "Buscar mais equipamentos" : placeholder}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            color: "inherit",
            padding: 0,
            margin: 0
          }}
        />
      </div>

      {isOpen && !disabled ? (
        <div
          className="surface"
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid rgba(44, 72, 90, 0.16)",
            borderRadius: 14,
            boxShadow: "0 18px 40px rgba(18, 28, 45, 0.12)",
            background: "var(--surface)"
          }}
        >
          {filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((option, index) => {
                const selected = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => toggleValue(option.value)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "18px 1fr",
                      gap: 10,
                      alignItems: "center",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      background:
                        highlightedIndex === index ? "rgba(19, 94, 85, 0.08)" : "transparent",
                      cursor: "pointer",
                      color: "#1f2f2c"
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: "1px solid rgba(44, 72, 90, 0.2)",
                        background: selected ? "rgba(19, 94, 85, 0.18)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#135e55",
                        fontSize: 11,
                        fontWeight: 800
                      }}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
              {values.length > 0 ? (
                <div
                  style={{
                    padding: "8px 12px",
                    borderTop: "1px solid rgba(44, 72, 90, 0.08)",
                    display: "flex",
                    justifyContent: "flex-end"
                  }}
                >
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onChange([])}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#135e55",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Limpar filtro
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ padding: "10px 12px", color: "#6e6457" }}>{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
