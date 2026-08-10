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
  metadados?: Record<string, string | number | boolean | null> | null;
};

export type RecursoRealizado = {
  id: string;
  recursoId?: string | null;
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

function adaptarRecursoRealizado(
  recurso: RecursoRealizado,
  unidadeOperacionalId: string
): RecursoOperacionalNucleoInput {
  const snapshot = recurso.snapshotTecnicoEconomico;
  const quantidadeOperacional = snapshot.quantidadeOperacional ?? recurso.quantidadeRealizada;
  const unidadeQuantidadeOperacional = snapshot.unidadeQuantidadeOperacional ?? recurso.unidadeRealizada;
  const unidadeRealizada = normalizeUnit(unidadeQuantidadeOperacional);
  const baseEconomica = inferBaseEconomica(recurso.unidadeRealizada, snapshot);
  const quantidadeRealizada = quantidadeOperacional;
  const quantidadeRecursos = recurso.quantidadeRecursos ?? 1;

  const adapted: RecursoOperacionalNucleoInput = {
    id: recurso.id,
    unidadeOperacionalId,
    nomeTecnico: recurso.nome,
    descricaoTecnica: snapshot.descricaoTecnica ?? recurso.nome,
    categoria: snapshot.categoria ?? null,
    classeOperacional: snapshot.classeOperacional ?? null,
    referenciaTecnicaId: recurso.recursoId ?? null,
    quantidadeRecursos,
    quantidadeOperacional: quantidadeRealizada,
    origemQuantidadeOperacional: "PERSONALIZADA",
    unidadeQuantidadeOperacional,
    custoUnitario: snapshot.custoUnitario ?? snapshot.valorCusto ?? 0,
    unidadeCusto: snapshot.unidadeCusto ?? null,
    tipoCalculo: snapshot.tipoCalculo ?? "AUTOMATICO",
    baseEconomica,
    valorCusto: snapshot.valorCusto ?? snapshot.custoUnitario ?? 0,
    capacidadePorViagem: snapshot.capacidadePorViagem,
    unidadeCapacidade: snapshot.unidadeCapacidade ?? null,
    distanciaViagemKm: snapshot.distanciaViagemKm,
    quilometrosTotais: snapshot.quilometrosTotais,
    viagensTotais: snapshot.viagensTotais,
    cargasTotais: snapshot.cargasTotais,
    mesesTotais: snapshot.mesesTotais,
    horasDia: snapshot.horasDia,
    horasTotais: snapshot.horasTotais,
    diasTrabalhadosMes: snapshot.diasTrabalhadosMes,
    origem: recurso.recursoId ? "SNAPSHOT" : "INFORMADO",
    metadados: {
      origem: recurso.recursoId ? "BIBLIOTECA_RECURSOS" : "RECURSO_PROVISORIO",
      unidadeRealizada: recurso.unidadeRealizada,
      ...(snapshot.metadados ?? {})
    }
  };

  if (baseEconomica === "HORA" || unidadeRealizada === "HORA") {
    adapted.horasTotais = snapshot.horasTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "CARGA" || unidadeRealizada === "CARGA") {
    adapted.cargasTotais = snapshot.cargasTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "VIAGEM" || unidadeRealizada === "VIAGEM") {
    adapted.viagensTotais = snapshot.viagensTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "KM" && unidadeRealizada === "KM") {
    adapted.quilometrosTotais = snapshot.quilometrosTotais ?? quantidadeRealizada;
  }

  if (baseEconomica === "MES" || unidadeRealizada === "MES") {
    adapted.mesesTotais = snapshot.mesesTotais ?? quantidadeRealizada;
  }

  return adapted;
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
      recursos: unidade.recursos.map((recurso) => adaptarRecursoRealizado(recurso, unidade.id)),
      metadados: {
        origem: "EXECUCAO",
        receitaRealizada: Number(unidade.receitaRealizada ?? 0)
      }
    }))
  };
}
