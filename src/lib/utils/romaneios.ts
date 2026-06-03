export function normalizeRomaneioNumero(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function parseRomaneiosInput(value: unknown) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,|;/g)
      : [];

  const seen = new Set<string>();
  const items: string[] = [];

  for (const raw of rawValues) {
    if (typeof raw !== "string") {
      continue;
    }

    const normalized = normalizeRomaneioNumero(raw);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    items.push(normalized);
  }

  return items;
}

export function romaneiosToTextarea(
  value: Array<{ numero: string }> | string[] | null | undefined
) {
  if (!value || value.length === 0) {
    return "";
  }

  const items =
    typeof value[0] === "string"
      ? (value as string[])
      : (value as Array<{ numero: string }>).map((item) => item.numero);

  return items.join("\n");
}
