const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateOnlyParts(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day)
  };
}

export function parseDateOnlyStart(value: string) {
  const parts = parseDateOnlyParts(value);

  if (!parts) {
    const fallback = new Date(value);
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
}

export function parseDateOnlyEnd(value: string) {
  const date = parseDateOnlyStart(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function parseOptionalDateOnlyStart(value?: string | null) {
  return value?.trim() ? parseDateOnlyStart(value) : null;
}

export function parseOptionalDateOnlyEnd(value?: string | null) {
  return value?.trim() ? parseDateOnlyEnd(value) : null;
}

export function formatDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";

  if (typeof value === "string") {
    const parts = parseDateOnlyParts(value);
    if (parts) {
      return [
        parts.year,
        padDatePart(parts.month),
        padDatePart(parts.day)
      ].join("-");
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join("-");
}

export function formatDateDisplay(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : parseDateOnlyStart(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

export function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}
