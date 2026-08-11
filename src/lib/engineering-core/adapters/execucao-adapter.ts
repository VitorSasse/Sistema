import type {
  BaseEconomicaRecursoOperacional,
  EntradaNucleoEngenharia,
  NumeroTecnico,
  RecursoOperacionalNucleoInput,
  TipoCalculoRecursoOperacional
} from "../contracts";

export type SnapshotTecnicoEconomicoRecursoRealizado = {
  categoria?: string | null;
  classeOperacional?: string | null;
  descricaoTecnica?: string | null;
  custoUnitario?: NumeroTecnico;
  unidadeCusto?: string | null;
  tipoCalculo?: TipoCalculoRecursoOperacional | null;
  baseEconomica?: BaseEconomicaRecursoOperacional | null;
  valorCusto?: NumeroTecnico;
  quantidadeOperacional?: NumeroTecnico;
  unidadeQuantidadeOperacional?: string | null;
  capacidadePorViagem?: NumeroTecnico;
  unidadeCapacidade?: string | null;
  distanciaViagemKm?: NumeroTecnico;
  quilometrosTotais?: NumeroTecnico;
  viagensTotais?: NumeroTecnico;
  cargasTotais?: NumeroTecnico;
  mesesTotais?: NumeroTecnico;
  horasDia?: NumeroTecnico;
  horasTotais?: NumeroTecnico;
  diasTrabalhadosMes?: NumeroTecnico;
  componenteEconomico?: string | null;
  componentesEconomicos?: SnapshotComponenteEconomicoRecursoRealizado[] | null;
  materialId?: string | null;
  materialCodigo?: string | null;
  materialDescricao?: string | null;
  materialUnidade?: string | null;
  materialQuantidade?: NumeroTecnico;
  materialBaseEconomica?: BaseEconomicaRecursoOperacional | null;
  materialValorCusto?: NumeroTecnico;
  materialUnidadeCusto?: string | null;
  metadados?: Record<string, string | number | boolean | null> | null;
};

export type SnapshotComponenteEconomicoRecursoRealizado = {
  id?: string | null;
  tipo: "TRANSPORTE" | "MATERIAL" | string;
  nome?: string | null;
  categoria?: string | null;
  classeOperacional?: string | null;
  baseEconomica?: BaseEconomicaRecursoOperacional | null;
  valorCusto?: NumeroTecnico;
  custoUnitario?: NumeroTecnico;
  unidadeCusto?: string | null;
  quantidadeOperacional?: NumeroTecnico;
  unidadeQuantidadeOperacional?: string | null;
  capacidadePorViagem?: NumeroTecnico;
  unidadeCapacidade?: string | null;
  distanciaViagemKm?: NumeroTecnico;
  quilometrosTotais?: NumeroTecnico;
  viagensTotais?: NumeroTecnico;
  cargasTotais?: NumeroTecnico;
  mesesTotais?: NumeroTecnico;
  horasDia?: NumeroTecnico;
  horasTotais?: NumeroTecnico;
  diasTrabalhadosMes?: NumeroTecnico;
  materialId?: string | null;
  materialCodigo?: string | null;
  materialDescricao?: string | null;
  materialUnidade?: string | null;
  metadados?: Record<string, string | number | boolean | null> | null;
};

export type RecursoRealizado = {
  id: string;
  recursoId?: string | null;
  origemRegistroTipo?: string | null;
  origemRegistroId?: string | null;
  nome: string;
  quantidadeRealizada: NumeroTecnico;
  unidadeRealizada: string;
  quantidadeRecursos?: NumeroTecnico;
  snapshotTecnicoEconomico: SnapshotTecnicoEconomicoRecursoRealizado;
};

export type UnidadeExecutada = {
  id: string;
  nome: string;
  descricaoTecnica?: string | null;
  quantidadeExecutada: NumeroTecnico;
  unidade: string;
  receitaRealizada: NumeroTecnico;
  recursos: RecursoRealizado[];
};

export type EntradaExecucao = {
  execucaoId: string;
  nomeTecnico: string;
  unidades: UnidadeExecutada[];
  metadados?: Record<string, string | number | boolean | null> | null;
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeUnit(value?: string | null) {
  const normalized = normalizeText(value).replace(/\s+/g, "");

  if (normalized.includes("carga")) return "CARGA";
  if (normalized.includes("viagem")) return "VIAGEM";
  if (normalized.includes("hora") || normalized === "h") return "HORA";
  if (normalized.includes("dia") || normalized.includes("diaria")) return "DIA";
  if (normalized.includes("km")) return "KM";
  if (normalized.includes("m3")) return "M3";
  if (normalized.includes("m2")) return "M2";
  if (normalized.includes("mes")) return "MES";
  return "UNIDADE";
}

function inferBaseEconomica(
  unidadeRealizada: string,
  snapshot: SnapshotTecnicoEconomicoRecursoRealizado
): BaseEconomicaRecursoOperacional {
  if (snapshot.baseEconomica) {
    return snapshot.baseEconomica;
  }

  const unidade = normalizeUnit(unidadeRealizada);
  if (unidade === "CARGA") return "CARGA";
  if (unidade === "VIAGEM") return "VIAGEM";
  if (unidade === "HORA") return "HORA";
  if (unidade === "DIA") return "DIA";
  if (unidade === "KM") return "KM";
  if (unidade === "M3") return "M3";
  if (unidade === "M2") return "M2";
  if (unidade === "MES") return "MES";
  return "UNIDADE";
}

function toNumber(value: NumeroTecnico) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function componentId(value: string | null | undefined, defaultSlug: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || defaultSlug;
}

function calcularQuantidadeMaterialDerivada(
  recurso: RecursoRealizado,
  snapshot: SnapshotTecnicoEconomicoRecursoRealizado
) {
  const quantidadeInformada = toNumber(snapshot.materialQuantidade);
  if (quantidadeInformada > 0) return quantidadeInformada;

  const capacidade = toNumber(snapshot.capacidadePorViagem);
  const unidadeRealizada = normalizeUnit(snapshot.unidadeQuantidadeOperacional ?? recurso.unidadeRealizada);
  if (capacidade > 0 && (unidadeRealizada === "CARGA" || unidadeRealizada === "VIAGEM")) {
    return toNumber(snapshot.quantidadeOperacional ?? recurso.quantidadeRealizada) * capacidade;
  }

  return 0;
}

function buildComponentesEconomicos(
  recurso: RecursoRealizado
): SnapshotComponenteEconomicoRecursoRealizado[] {
  const snapshot = recurso.snapshotTecnicoEconomico;
  if (Array.isArray(snapshot.componentesEconomicos) && snapshot.componentesEconomicos.length) {
    return snapshot.componentesEconomicos;
  }

  const componentes: SnapshotComponenteEconomicoRecursoRealizado[] = [{
    tipo: snapshot.componenteEconomico ?? "TRANSPORTE",
    nome: recurso.nome,
    categoria: snapshot.categoria,
    classeOperacional: snapshot.classeOperacional,
    baseEconomica: snapshot.baseEconomica,
    valorCusto: snapshot.valorCusto,
    custoUnitario: snapshot.custoUnitario,
    unidadeCusto: snapshot.unidadeCusto,
    quantidadeOperacional: snapshot.quantidadeOperacional,
    unidadeQuantidadeOperacional: snapshot.unidadeQuantidadeOperacional,
    capacidadePorViagem: snapshot.capacidadePorViagem,
    unidadeCapacidade: snapshot.unidadeCapacidade,
    distanciaViagemKm: snapshot.distanciaViagemKm,
    quilometrosTotais: snapshot.quilometrosTotais,
    viagensTotais: snapshot.viagensTotais,
    cargasTotais: snapshot.cargasTotais,
    mesesTotais: snapshot.mesesTotais,
    horasDia: snapshot.horasDia,
    horasTotais: snapshot.horasTotais,
    diasTrabalhadosMes: snapshot.diasTrabalhadosMes,
    metadados: snapshot.metadados
  }];

  const materialValorCusto = toNumber(snapshot.materialValorCusto);
  if (snapshot.materialId && materialValorCusto > 0) {
    componentes.push({
      tipo: "MATERIAL",
      nome: snapshot.materialDescricao ?? "Material",
      categoria: "MATERIAL",
      classeOperacional: snapshot.materialDescricao,
      baseEconomica: snapshot.materialBaseEconomica ?? normalizeUnit(snapshot.materialUnidade) as BaseEconomicaRecursoOperacional,
      valorCusto: materialValorCusto,
      custoUnitario: materialValorCusto,
      unidadeCusto: snapshot.materialUnidadeCusto ?? (snapshot.materialUnidade ? `R$/${snapshot.materialUnidade}` : null),
      quantidadeOperacional: calcularQuantidadeMaterialDerivada(recurso, snapshot),
      unidadeQuantidadeOperacional: snapshot.materialUnidade ?? snapshot.unidadeCapacidade ?? null,
      materialId: snapshot.materialId,
      materialCodigo: snapshot.materialCodigo,
      materialDescricao: snapshot.materialDescricao,
      materialUnidade: snapshot.materialUnidade,
      metadados: {
        materialId: snapshot.materialId ?? null,
        materialCodigo: snapshot.materialCodigo ?? null,
        materialDescricao: snapshot.materialDescricao ?? null,
        materialUnidade: snapshot.materialUnidade ?? null,
        quantidadeMaterialDerivada: !snapshot.materialQuantidade
      }
    });
  }

  return componentes;
}

function adaptarComponenteEconomico(
  recurso: RecursoRealizado,
  unidadeOperacionalId: string,
  componente: SnapshotComponenteEconomicoRecursoRealizado,
  index: number
): RecursoOperacionalNucleoInput {
  const snapshot = recurso.snapshotTecnicoEconomico;
  const tipoComponente = componente.tipo || snapshot.componenteEconomico || "TRANSPORTE";
  const quantidadeOperacional = componente.quantidadeOperacional ?? snapshot.quantidadeOperacional ?? recurso.quantidadeRealizada;
  const baseEconomica = componente.baseEconomica ?? inferBaseEconomica(recurso.unidadeRealizada, snapshot);
  const unidadeQuantidadeOriginal = componente.unidadeQuantidadeOperacional ?? snapshot.unidadeQuantidadeOperacional ?? recurso.unidadeRealizada;
  const unidadeRealizada = normalizeUnit(unidadeQuantidadeOriginal);
  const unidadeQuantidadeOperacional =
    baseEconomica === "KM" && unidadeRealizada === "CARGA"
      ? "viagem"
      : unidadeQuantidadeOriginal;
  const unidadeOperacionalNormalizada = normalizeUnit(unidadeQuantidadeOperacional);
  const quantidadeRealizada = quantidadeOperacional;
  const quantidadeRecursos = recurso.quantidadeRecursos ?? 1;
  const suffix = componentId(componente.id ?? tipoComponente, `componente-${index + 1}`);
  const recursoId = index === 0 && buildComponentesEconomicos(recurso).length === 1
    ? recurso.id
    : `${recurso.id}:${suffix}`;

  const adapted: RecursoOperacionalNucleoInput = {
    id: recursoId,
    unidadeOperacionalId,
    nomeTecnico: componente.nome ?? recurso.nome,
    descricaoTecnica: componente.nome ?? snapshot.descricaoTecnica ?? recurso.nome,
    categoria: componente.categoria ?? snapshot.categoria ?? null,
    classeOperacional: componente.classeOperacional ?? snapshot.classeOperacional ?? null,
    referenciaTecnicaId: recurso.recursoId ?? null,
    quantidadeRecursos,
    quantidadeOperacional: quantidadeRealizada,
    origemQuantidadeOperacional: "PERSONALIZADA",
    unidadeQuantidadeOperacional,
    custoUnitario: componente.custoUnitario ?? componente.valorCusto ?? snapshot.custoUnitario ?? snapshot.valorCusto ?? 0,
    unidadeCusto: componente.unidadeCusto ?? snapshot.unidadeCusto ?? null,
    tipoCalculo: snapshot.tipoCalculo ?? "AUTOMATICO",
    baseEconomica,
    valorCusto: componente.valorCusto ?? componente.custoUnitario ?? snapshot.valorCusto ?? snapshot.custoUnitario ?? 0,
    capacidadePorViagem: componente.capacidadePorViagem ?? snapshot.capacidadePorViagem,
    unidadeCapacidade: componente.unidadeCapacidade ?? snapshot.unidadeCapacidade ?? null,
    distanciaViagemKm: componente.distanciaViagemKm ?? snapshot.distanciaViagemKm,
    quilometrosTotais: componente.quilometrosTotais ?? snapshot.quilometrosTotais,
    viagensTotais: componente.viagensTotais ?? snapshot.viagensTotais,
    cargasTotais: componente.cargasTotais ?? snapshot.cargasTotais,
    mesesTotais: componente.mesesTotais ?? snapshot.mesesTotais,
    horasDia: componente.horasDia ?? snapshot.horasDia,
    horasTotais: componente.horasTotais ?? snapshot.horasTotais,
    diasTrabalhadosMes: componente.diasTrabalhadosMes ?? snapshot.diasTrabalhadosMes,
    origem: recurso.recursoId ? "SNAPSHOT" : "INFORMADO",
    metadados: {
      origem: recurso.recursoId ? "BIBLIOTECA_RECURSOS" : "RECURSO_PROVISORIO",
      recursoRealizadoId: recurso.id,
      recursoBoletimId: recurso.id,
      componenteEconomico: tipoComponente,
      unidadeRealizada: recurso.unidadeRealizada,
      unidadeQuantidadeOperacionalOriginal: unidadeQuantidadeOriginal,
      origemRegistroTipo: recurso.origemRegistroTipo ?? null,
      origemRegistroId: recurso.origemRegistroId ?? null,
      materialId: componente.materialId ?? snapshot.materialId ?? null,
      materialCodigo: componente.materialCodigo ?? snapshot.materialCodigo ?? null,
      materialDescricao: componente.materialDescricao ?? snapshot.materialDescricao ?? null,
      materialUnidade: componente.materialUnidade ?? snapshot.materialUnidade ?? null,
      ...(snapshot.metadados ?? {}),
      ...(componente.metadados ?? {})
    }
  };

  if (baseEconomica === "HORA" || unidadeOperacionalNormalizada === "HORA") {
    adapted.horasTotais = snapshot.horasTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "CARGA" || unidadeRealizada === "CARGA") {
    adapted.cargasTotais = snapshot.cargasTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "VIAGEM" || unidadeOperacionalNormalizada === "VIAGEM") {
    adapted.viagensTotais = snapshot.viagensTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "KM" && unidadeOperacionalNormalizada === "KM") {
    adapted.quilometrosTotais = snapshot.quilometrosTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "MES" || unidadeOperacionalNormalizada === "MES") {
    adapted.mesesTotais = snapshot.mesesTotais ?? quantidadeRealizada;
  }

  return adapted;
}

function adaptarRecursoRealizado(
  recurso: RecursoRealizado,
  unidadeOperacionalId: string
): RecursoOperacionalNucleoInput[] {
  return buildComponentesEconomicos(recurso).map((componente, index) =>
    adaptarComponenteEconomico(recurso, unidadeOperacionalId, componente, index)
  );
}

export function adaptarExecucaoParaEntradaNucleo(input: EntradaExecucao): EntradaNucleoEngenharia {
  return {
    contextoDeCalculo: "EXECUCAO",
    analiseId: input.execucaoId,
    nomeTecnico: input.nomeTecnico,
    metadados: {
      origem: "EXECUCAO",
      ...(input.metadados ?? {})
    },
    unidades: input.unidades.map((unidade) => ({
      id: unidade.id,
      nome: unidade.nome,
      descricaoTecnica: unidade.descricaoTecnica,
      quantidade: unidade.quantidadeExecutada,
      unidade: unidade.unidade,
      receita: unidade.receitaRealizada,
      modoCusto: "AUTO",
      recursos: unidade.recursos.flatMap((recurso) => adaptarRecursoRealizado(recurso, unidade.id)),
      metadados: {
        origem: "EXECUCAO",
        receitaRealizada: Number(unidade.receitaRealizada ?? 0)
      }
    }))
  };
}
