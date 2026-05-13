export function parseDecimalInput(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return Number(value);
  }

  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  return Number(normalized);
}
