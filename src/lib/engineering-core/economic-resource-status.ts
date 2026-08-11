import type {
  BaseEconomicaRecursoOperacional,
  NumeroTecnico
} from "./contracts";
import type {
  SnapshotComponenteEconomicoRecursoRealizado,
  SnapshotTecnicoEconomicoRecursoRealizado
} from "./adapters/execucao-adapter";

export type StatusEconomicoConfiguracao =
  | "CUSTO_DEFINIDO"
  | "CUSTO_PENDENTE"
  | "SEM_CUSTO"
  | "NAO_INFORMADO";

export type AvaliacaoEconomicaComponente = {
  tipo: string;
  status: StatusEconomicoConfiguracao;
  motivo: string;
  calculavel: boolean;
};

export type AvaliacaoEconomicaSnapshot = {
  status: StatusEconomicoConfiguracao;
  motivo: string;
  componentes: AvaliacaoEconomicaComponente[];
  possuiComponenteCalculavel: boolean;
};

function toNumber(value: NumeroTecnico) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBase(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function componentMetadata(componente: SnapshotComponenteEconomicoRecursoRealizado) {
  return componente.metadados ?? {};
}

function isNoCostComponent(componente: SnapshotComponenteEconomicoRecursoRealizado) {
  const statusEconomico = componentMetadata(componente).statusEconomico;
  const tipo = String(componente.tipo ?? "").toUpperCase();
  const valor = toNumber(componente.valorCusto ?? componente.custoUnitario);

  return statusEconomico === "SEM_CUSTO" || (tipo === "MATERIAL" && valor <= 0);
}

function hasDistanceForKm(
  componente: SnapshotComponenteEconomicoRecursoRealizado,
  fallback: SnapshotTecnicoEconomicoRecursoRealizado
) {
  return toNumber(
    componente.distanciaViagemKm ??
    componente.quilometrosTotais ??
    fallback.distanciaViagemKm ??
    fallback.quilometrosTotais
  ) > 0;
}

function componentBase(
  componente: SnapshotComponenteEconomicoRecursoRealizado,
  fallback: SnapshotTecnicoEconomicoRecursoRealizado
) {
  return normalizeBase(componente.baseEconomica ?? fallback.baseEconomica);
}

function snapshotComponents(
  snapshot: SnapshotTecnicoEconomicoRecursoRealizado
): SnapshotComponenteEconomicoRecursoRealizado[] {
  if (Array.isArray(snapshot.componentesEconomicos) && snapshot.componentesEconomicos.length) {
    return snapshot.componentesEconomicos;
  }

  const componentes: SnapshotComponenteEconomicoRecursoRealizado[] = [{
    tipo: snapshot.componenteEconomico ?? "TRANSPORTE",
    baseEconomica: snapshot.baseEconomica,
    valorCusto: snapshot.valorCusto,
    custoUnitario: snapshot.custoUnitario,
    unidadeCusto: snapshot.unidadeCusto,
    quantidadeOperacional: snapshot.quantidadeOperacional,
    unidadeQuantidadeOperacional: snapshot.unidadeQuantidadeOperacional,
    distanciaViagemKm: snapshot.distanciaViagemKm,
    quilometrosTotais: snapshot.quilometrosTotais,
    metadados: snapshot.metadados
  }];

  if (snapshot.materialId || snapshot.materialDescricao) {
    const materialValor = toNumber(snapshot.materialValorCusto);
    componentes.push({
      tipo: "MATERIAL",
      baseEconomica: snapshot.materialBaseEconomica,
      valorCusto: materialValor,
      custoUnitario: materialValor,
      unidadeCusto: snapshot.materialUnidadeCusto,
      quantidadeOperacional: snapshot.materialQuantidade,
      unidadeQuantidadeOperacional: snapshot.materialUnidade,
      materialId: snapshot.materialId,
      materialCodigo: snapshot.materialCodigo,
      materialDescricao: snapshot.materialDescricao,
      materialUnidade: snapshot.materialUnidade,
      metadados: {
        statusEconomico: materialValor > 0 ? "DEFINIDO" : "SEM_CUSTO"
      }
    });
  }

  return componentes;
}

export function avaliarComponenteEconomicoSnapshot(
  componente: SnapshotComponenteEconomicoRecursoRealizado,
  fallback: SnapshotTecnicoEconomicoRecursoRealizado = {}
): AvaliacaoEconomicaComponente {
  const tipo = String(componente.tipo ?? "COMPONENTE");

  if (isNoCostComponent(componente)) {
    return {
      tipo,
      status: "SEM_CUSTO",
      motivo: "sem custo economico aplicavel",
      calculavel: false
    };
  }

  const valor = toNumber(componente.valorCusto ?? componente.custoUnitario);
  const base = componentBase(componente, fallback);

  if (!base) {
    return {
      tipo,
      status: "NAO_INFORMADO",
      motivo: "base economica nao informada",
      calculavel: false
    };
  }

  if (valor <= 0) {
    return {
      tipo,
      status: "CUSTO_PENDENTE",
      motivo: "custo unitario pendente",
      calculavel: false
    };
  }

  if (base === "KM" && !hasDistanceForKm(componente, fallback)) {
    return {
      tipo,
      status: "CUSTO_PENDENTE",
      motivo: "distancia pendente",
      calculavel: false
    };
  }

  return {
    tipo,
    status: "CUSTO_DEFINIDO",
    motivo: "ok",
    calculavel: true
  };
}

export function avaliarSnapshotTecnicoEconomico(
  snapshot: SnapshotTecnicoEconomicoRecursoRealizado
): AvaliacaoEconomicaSnapshot {
  const componentes = snapshotComponents(snapshot).map((componente) =>
    avaliarComponenteEconomicoSnapshot(componente, snapshot)
  );
  const possuiComponenteCalculavel = componentes.some((componente) => componente.calculavel);

  if (possuiComponenteCalculavel) {
    return {
      status: "CUSTO_DEFINIDO",
      motivo: "ok",
      componentes,
      possuiComponenteCalculavel
    };
  }

  if (componentes.length > 0 && componentes.every((componente) => componente.status === "SEM_CUSTO")) {
    return {
      status: "SEM_CUSTO",
      motivo: "sem custo economico aplicavel",
      componentes,
      possuiComponenteCalculavel
    };
  }

  const primeiroPendente = componentes.find((componente) => componente.status === "CUSTO_PENDENTE");
  const primeiroNaoInformado = componentes.find((componente) => componente.status === "NAO_INFORMADO");
  const motivo = primeiroPendente?.motivo ?? primeiroNaoInformado?.motivo ?? "configuracao economica pendente";

  return {
    status: primeiroNaoInformado && !primeiroPendente ? "NAO_INFORMADO" : "CUSTO_PENDENTE",
    motivo,
    componentes,
    possuiComponenteCalculavel
  };
}

export function baseEconomicaNormalizada(value: unknown): BaseEconomicaRecursoOperacional | null {
  const normalized = normalizeBase(value);
  return normalized ? (normalized as BaseEconomicaRecursoOperacional) : null;
}
