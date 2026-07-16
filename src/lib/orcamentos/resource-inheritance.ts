export const CAMPOS_TECNICOS_RECURSO = [
  "capacidadePorViagem",
  "unidadeCapacidade",
  "unidadeEconomicaCusto",
  "valorCusto"
] as const;

export type CampoTecnicoRecurso = (typeof CAMPOS_TECNICOS_RECURSO)[number];

export type CaracteristicasRecursoMestre = {
  id: string;
  capacidadeM3?: string | number | null;
  unidadeCapacidade?: string | null;
  unidadeEconomicaPadrao?: string | null;
  custoPadrao?: string | number | null;
  permitirEdicaoOrcamento?: boolean;
  naturezaRecurso?: string | null;
  tipoRecurso?: string | null;
  classeOperacional?: string | null;
  descricaoOperacional?: string | null;
  caracteristicasTecnicas?: Record<string, unknown> | null;
};

export type SnapshotCaracteristicasRecurso = {
  versao: 1;
  origem: "CADASTRO_MESTRE";
  recursoId: string;
  herdados: {
    capacidadePorViagem: number | null;
    unidadeCapacidade: string | null;
    unidadeEconomicaCusto: string | null;
    valorCusto: number | null;
    permitirEdicaoOrcamento: boolean;
    naturezaRecurso: string | null;
    tipoRecurso: string | null;
    classeOperacional: string | null;
    descricaoOperacional: string | null;
    caracteristicasTecnicas: Record<string, unknown> | null;
  };
};

function numberOrNull(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function cloneTechnicalCharacteristics(value: Record<string, unknown> | null | undefined) {
  return value ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>) : null;
}

export function criarSnapshotCaracteristicasRecurso(
  recurso: CaracteristicasRecursoMestre
): SnapshotCaracteristicasRecurso {
  return {
    versao: 1,
    origem: "CADASTRO_MESTRE",
    recursoId: recurso.id,
    herdados: {
      capacidadePorViagem: numberOrNull(recurso.capacidadeM3),
      unidadeCapacidade: textOrNull(recurso.unidadeCapacidade),
      unidadeEconomicaCusto: textOrNull(recurso.unidadeEconomicaPadrao),
      valorCusto: numberOrNull(recurso.custoPadrao),
      permitirEdicaoOrcamento: recurso.permitirEdicaoOrcamento !== false,
      naturezaRecurso: textOrNull(recurso.naturezaRecurso),
      tipoRecurso: textOrNull(recurso.tipoRecurso),
      classeOperacional: textOrNull(recurso.classeOperacional),
      descricaoOperacional: textOrNull(recurso.descricaoOperacional),
      caracteristicasTecnicas: cloneTechnicalCharacteristics(recurso.caracteristicasTecnicas)
    }
  };
}

export function valoresEfetivosDaHeranca(snapshot: SnapshotCaracteristicasRecurso) {
  return {
    capacidadePorViagem:
      snapshot.herdados.capacidadePorViagem === null
        ? ""
        : String(snapshot.herdados.capacidadePorViagem),
    unidadeCapacidade: snapshot.herdados.unidadeCapacidade ?? "",
    unidadeEconomicaCusto: snapshot.herdados.unidadeEconomicaCusto ?? "",
    valorCusto: snapshot.herdados.valorCusto === null || snapshot.herdados.valorCusto === undefined
      ? ""
      : String(snapshot.herdados.valorCusto),
    permitirEdicaoOrcamento: snapshot.herdados.permitirEdicaoOrcamento !== false
  };
}

export function normalizarSnapshotCaracteristicasRecurso(
  value: unknown
): SnapshotCaracteristicasRecurso | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Partial<SnapshotCaracteristicasRecurso>;
  if (
    snapshot.versao !== 1 ||
    snapshot.origem !== "CADASTRO_MESTRE" ||
    typeof snapshot.recursoId !== "string" ||
    !snapshot.herdados ||
    typeof snapshot.herdados !== "object"
  ) {
    return null;
  }

  return snapshot as SnapshotCaracteristicasRecurso;
}

export function personalizarCampoTecnico(
  campos: readonly string[],
  campo: CampoTecnicoRecurso
) {
  return campos.includes(campo) ? [...campos] : [...campos, campo];
}

export function campoTecnicoHerdado(
  snapshot: SnapshotCaracteristicasRecurso | null,
  camposPersonalizados: readonly string[],
  campo: CampoTecnicoRecurso
) {
  if (!snapshot || camposPersonalizados.includes(campo)) {
    return false;
  }

  return snapshot.herdados[campo] !== null && snapshot.herdados[campo] !== undefined;
}
