export type OperationalResourceCalculationType = "AUTOMATICO" | "VALOR_TOTAL_MANUAL";

export type OperationalResourceQuantityOrigin = "FRENTE" | "PERSONALIZADA";

export type OperationalResourceEconomicUnit =
  | "CUSTO_FIXO"
  | "DIA"
  | "HORA"
  | "KM"
  | "M3"
  | "M2"
  | "VIAGEM"
  | "CARGA"
  | "MES"
  | "UNIDADE_PRODUZIDA"
  | "UNIDADE"
  | "VALOR_TOTAL";

export type OperationalUnit =
  | "HORA"
  | "DIA"
  | "KM"
  | "VIAGEM"
  | "SEMANA"
  | "MES"
  | "M3"
  | "M2"
  | "TON"
  | "CARGA"
  | "UN"
  | "DESCONHECIDA";

export type OperationalResourceFrontContext = {
  quantidadePrevista?: string | number | null;
  unidadeProducao?: string | null;
  prazoEstimadoDias?: string | number | null;
  prazoTeoricoDias?: string | number | null;
  prazoAdotadoDias?: string | number | null;
};

export type OperationalResourceRawInput = {
  tipoItem?: string | null;
  descricao?: string | null;
  recursoNome?: string | null;
  classeOperacional?: string | null;
  recursoReferenciaId?: string | null;
  quantidade?: string | number | null;
  quantidadeOperacional?: string | number | null;
  origemQuantidadeOperacional?: OperationalResourceQuantityOrigin | string | null;
  unidadeQuantidadeOperacional?: string | null;
  unidade?: string | null;
  unidadeEconomicaCusto?: OperationalResourceEconomicUnit | string | null;
  valorCusto?: string | number | null;
  horasDia?: string | number | null;
  horasTotais?: string | number | null;
  viagensTotais?: string | number | null;
  cargasTotais?: string | number | null;
  distanciaViagemKm?: string | number | null;
  quilometrosTotais?: string | number | null;
  capacidadePorViagem?: string | number | null;
  unidadeCapacidade?: string | null;
  mesesTotais?: string | number | null;
};

export type OperationalQuantityResolution = {
  quantidade: number;
  unidade: string;
  origem: OperationalResourceQuantityOrigin;
  origemDetalhada:
    | "FRENTE"
    | "PRAZO_FRENTE"
    | "HORAS_DERIVADAS"
    | "PLANEJAMENTO_TRANSPORTE"
    | "MESES_DERIVADOS"
    | "PERSONALIZADA"
    | "QUANTIDADE_RECURSOS"
    | "VALOR_TOTAL"
    | "DERIVADA";
};

export type NormalizedOperationalResource = {
  descricaoResolvida: string;
  quantidadeOperacionalResolvida: number;
  unidadeOperacionalResolvida: string;
  origemQuantidadeOperacional: OperationalResourceQuantityOrigin;
  origemQuantidadeOperacionalDetalhada: OperationalQuantityResolution["origemDetalhada"];
  unidadeOperacionalNormalizada: OperationalUnit;
  unidadeCapacidadeNormalizada: OperationalUnit;
  unidadeEconomica: OperationalResourceEconomicUnit;
  quantidadeRecursos: number;
  valorCusto: number;
  parametros: {
    horasDia: number;
    horasTotais: number;
    viagensTotais: number;
    cargasTotais: number;
    distanciaViagemKm: number;
    quilometrosTotais: number;
    capacidadePorViagem: number;
    mesesTotais: number;
  };
};

export function toOperationalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function trimOperationalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOperationalText(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Â³/g, "3")
    .replace(/Â²/g, "2")
    .replace(/³/g, "3")
    .replace(/²/g, "2");
}

export function normalizeOperationalUnit(value?: string | null): OperationalUnit {
  const normalized = normalizeOperationalText(value).replace(/\s+/g, "");

  if (!normalized) return "UN";
  if (normalized.includes("/h") || normalized.includes("hora") || normalized === "h") return "HORA";
  if (normalized.includes("semana")) return "SEMANA";
  if (normalized.includes("mes")) return "MES";
  if (normalized.includes("dia") || normalized.includes("diaria")) return "DIA";
  if (normalized.includes("km")) return "KM";
  if (normalized.includes("viagem")) return "VIAGEM";
  if (normalized.includes("m3")) return "M3";
  if (normalized.includes("m2")) return "M2";
  if (normalized === "t" || normalized.includes("ton")) return "TON";
  if (normalized.includes("carga")) return "CARGA";
  if (["un", "und", "unidade", "unidades", "item"].includes(normalized)) return "UN";
  return "DESCONHECIDA";
}

export function areOperationalUnitsCompatible(
  left?: string | null,
  right?: string | null
) {
  const leftUnit = normalizeOperationalUnit(left);
  const rightUnit = normalizeOperationalUnit(right);

  if (leftUnit === "DESCONHECIDA" || rightUnit === "DESCONHECIDA") return false;
  if (leftUnit === rightUnit) return true;

  return false;
}

export function resolveOperationalResourceDescription(item: OperationalResourceRawInput) {
  return (
    trimOperationalText(item.descricao) ||
    trimOperationalText(item.recursoNome) ||
    trimOperationalText(item.classeOperacional) ||
    trimOperationalText(item.recursoReferenciaId)
  );
}

function getPrazoUtilizadoFrente(frente?: OperationalResourceFrontContext | null) {
  return (
    toOperationalNumber(frente?.prazoAdotadoDias) ||
    toOperationalNumber(frente?.prazoEstimadoDias) ||
    toOperationalNumber(frente?.prazoTeoricoDias)
  );
}

function getViagensOperacionaisDerivadas(
  item: OperationalResourceRawInput,
  frente?: OperationalResourceFrontContext | null
) {
  const viagensInformadas =
    toOperationalNumber(item.viagensTotais) || toOperationalNumber(item.cargasTotais);

  if (viagensInformadas > 0) {
    return viagensInformadas;
  }

  const quantidade =
    toOperationalNumber(item.quantidadeOperacional) ||
    toOperationalNumber(frente?.quantidadePrevista);
  const capacidade = toOperationalNumber(item.capacidadePorViagem);

  if (quantidade > 0 && capacidade > 0) {
    return Math.ceil(quantidade / capacidade);
  }

  return 0;
}

export function resolveOperationalQuantity(
  item: OperationalResourceRawInput,
  frente?: OperationalResourceFrontContext | null
): OperationalQuantityResolution {
  const origem =
    item.origemQuantidadeOperacional === "PERSONALIZADA" ? "PERSONALIZADA" : "FRENTE";

  if (origem === "PERSONALIZADA") {
    return {
      quantidade: Math.max(0, toOperationalNumber(item.quantidadeOperacional)),
      unidade: trimOperationalText(item.unidadeQuantidadeOperacional),
      origem,
      origemDetalhada: "PERSONALIZADA"
    };
  }

  const quantidadeFrente = toOperationalNumber(frente?.quantidadePrevista);
  const prazoUtilizado = getPrazoUtilizadoFrente(frente);
  const unidadeFrente = trimOperationalText(frente?.unidadeProducao) || trimOperationalText(item.unidade);
  const base = (trimOperationalText(item.unidadeEconomicaCusto) || "CUSTO_FIXO") as OperationalResourceEconomicUnit;

  switch (base) {
    case "DIA":
      return { quantidade: prazoUtilizado, unidade: "dias", origem, origemDetalhada: "PRAZO_FRENTE" };
    case "HORA": {
      const horas =
        toOperationalNumber(item.horasTotais) ||
        (prazoUtilizado > 0 ? prazoUtilizado * (toOperationalNumber(item.horasDia) || 8) : 0);
      return { quantidade: horas, unidade: "h", origem, origemDetalhada: "HORAS_DERIVADAS" };
    }
    case "KM": {
      const quilometros =
        toOperationalNumber(item.quilometrosTotais) ||
        getViagensOperacionaisDerivadas(item, frente) * toOperationalNumber(item.distanciaViagemKm);
      return { quantidade: quilometros, unidade: "km", origem, origemDetalhada: "PLANEJAMENTO_TRANSPORTE" };
    }
    case "VIAGEM":
      return {
        quantidade: getViagensOperacionaisDerivadas(item, frente),
        unidade: "viagens",
        origem,
        origemDetalhada: "PLANEJAMENTO_TRANSPORTE"
      };
    case "CARGA":
      return {
        quantidade: toOperationalNumber(item.cargasTotais),
        unidade: "cargas",
        origem,
        origemDetalhada: "PLANEJAMENTO_TRANSPORTE"
      };
    case "MES": {
      const meses =
        toOperationalNumber(item.mesesTotais) ||
        (unidadeFrente.toLowerCase().includes("mes") ? quantidadeFrente : 0);
      return { quantidade: meses, unidade: "meses", origem, origemDetalhada: "MESES_DERIVADOS" };
    }
    case "M3":
      return { quantidade: quantidadeFrente, unidade: "m3", origem, origemDetalhada: "FRENTE" };
    case "M2":
      return { quantidade: quantidadeFrente, unidade: "m2", origem, origemDetalhada: "FRENTE" };
    case "UNIDADE_PRODUZIDA":
      return {
        quantidade: quantidadeFrente,
        unidade: unidadeFrente || "unidade",
        origem,
        origemDetalhada: "FRENTE"
      };
    case "UNIDADE":
      return {
        quantidade: toOperationalNumber(item.quantidade),
        unidade: "unidades",
        origem,
        origemDetalhada: "QUANTIDADE_RECURSOS"
      };
    case "VALOR_TOTAL":
      return { quantidade: 1, unidade: "valor total", origem, origemDetalhada: "VALOR_TOTAL" };
    case "CUSTO_FIXO":
    default:
      return {
        quantidade: toOperationalNumber(item.quantidade),
        unidade: "recursos",
        origem,
        origemDetalhada: "QUANTIDADE_RECURSOS"
      };
  }
}

export function normalizeOperationalResource(
  item: OperationalResourceRawInput,
  frente?: OperationalResourceFrontContext | null
): NormalizedOperationalResource {
  const quantidade = resolveOperationalQuantity(item, frente);
  const unidadeEconomica = (trimOperationalText(item.unidadeEconomicaCusto) ||
    "CUSTO_FIXO") as OperationalResourceEconomicUnit;
  const unidadeOperacionalResolvida = quantidade.unidade || trimOperationalText(item.unidadeQuantidadeOperacional);

  return {
    descricaoResolvida: resolveOperationalResourceDescription(item),
    quantidadeOperacionalResolvida: quantidade.quantidade,
    unidadeOperacionalResolvida,
    origemQuantidadeOperacional: quantidade.origem,
    origemQuantidadeOperacionalDetalhada: quantidade.origemDetalhada,
    unidadeOperacionalNormalizada: normalizeOperationalUnit(unidadeOperacionalResolvida),
    unidadeCapacidadeNormalizada: normalizeOperationalUnit(trimOperationalText(item.unidadeCapacidade)),
    unidadeEconomica,
    quantidadeRecursos: Math.max(0, toOperationalNumber(item.quantidade)),
    valorCusto: Math.max(0, toOperationalNumber(item.valorCusto)),
    parametros: {
      horasDia: Math.max(0, toOperationalNumber(item.horasDia)),
      horasTotais: Math.max(0, toOperationalNumber(item.horasTotais)),
      viagensTotais: Math.max(0, toOperationalNumber(item.viagensTotais)),
      cargasTotais: Math.max(0, toOperationalNumber(item.cargasTotais)),
      distanciaViagemKm: Math.max(0, toOperationalNumber(item.distanciaViagemKm)),
      quilometrosTotais: Math.max(0, toOperationalNumber(item.quilometrosTotais)),
      capacidadePorViagem: Math.max(0, toOperationalNumber(item.capacidadePorViagem)),
      mesesTotais: Math.max(0, toOperationalNumber(item.mesesTotais))
    }
  };
}

export function validateTransportCapacityCompatibility(params: {
  unidadeOperacional?: string | null;
  unidadeCapacidade?: string | null;
}) {
  const unidadeOperacional = normalizeOperationalUnit(params.unidadeOperacional);
  const unidadeCapacidade = normalizeOperationalUnit(params.unidadeCapacidade);

  if (unidadeOperacional === "KM" || unidadeOperacional === "VIAGEM") {
    return { valid: true, unidadeOperacional, unidadeCapacidade };
  }

  if (!params.unidadeCapacidade?.trim()) {
    return { valid: true, unidadeOperacional, unidadeCapacidade };
  }

  return {
    valid: areOperationalUnitsCompatible(params.unidadeOperacional, params.unidadeCapacidade),
    unidadeOperacional,
    unidadeCapacidade
  };
}
