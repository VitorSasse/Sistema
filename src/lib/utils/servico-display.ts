function normalizeServico(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function formatServicoDisplay(value: string) {
  const normalized = normalizeServico(value);

  if (!normalized) {
    return "-";
  }

  if (normalized === "SERVICO_DIARIA" || normalized === "DIARIA") {
    return "DIARIA";
  }

  if (
    normalized.includes("CARGA") ||
    normalized === "ENTREGA_MATERIAL" ||
    normalized === "TRANSPORTE_MAQUINAS"
  ) {
    return "CARGA";
  }

  return normalized
    .replace(/^SERVICO_/, "")
    .replace(/_/g, " ")
    .trim();
}
