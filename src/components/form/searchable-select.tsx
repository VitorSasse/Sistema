"use client";

import { useEffect, useMemo, useState } from "react";

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

  function handleInputChange(nextValue: string) {
    setQuery(nextValue);
    setIsOpen(true);

    if (!nextValue.trim()) {
      onChange("");
      return;
    }

    if (selectedOption && nextValue !== selectedOption.label) {
      onChange("");
    }
  }

  function handleSelect(option: SearchableSelectOption) {
    setQuery(option.label);
    onChange(option.value);
    setIsOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        className="field-control"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => handleInputChange(event.target.value)}
      />

      {isOpen && !disabled ? (
        <div
          className="surface"
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: "auto",
            border: "1px solid rgba(44, 72, 90, 0.16)",
            borderRadius: 14,
            boxShadow: "0 18px 40px rgba(18, 28, 45, 0.12)"
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: option.value === value ? "rgba(19, 94, 85, 0.08)" : "transparent",
                  cursor: "pointer",
                  color: "#1f2f2c"
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div style={{ padding: "10px 12px", color: "#6e6457" }}>{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
