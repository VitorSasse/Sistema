import type { PrismaClient } from "@prisma/client";
import type { BaseEconomicaRecursoOperacional } from "@/lib/engineering-core/contracts";
import type { FormaCusteioRecursoInput } from "@/lib/validators/biblioteca-recursos";

type FormaOwner =
  | { equipamentoId: string; referenciaTecnicaId?: never }
  | { equipamentoId?: never; referenciaTecnicaId: string };

export const formaCusteioInclude = {
  unidadeCusteio: true
};

export const formaCusteioOrderBy = [
  { preferencial: "desc" as const },
  { nome: "asc" as const }
];

function parseNullableNumber(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export function normalizeFormasCusteioPayload(formas: unknown) {
  if (!Array.isArray(formas)) return [];

  return formas.map((forma) => {
    const record = forma && typeof forma === "object" ? forma as Record<string, unknown> : {};

    return {
      ...record,
      valorReferencia: parseNullableNumber(record.valorReferencia),
      preferencial: Boolean(record.preferencial),
      ativo: record.ativo !== false
    };
  });
}

export async function assertUnidadesCusteioValidas(
  db: Pick<PrismaClient, "unidadeCusteio">,
  empresaId: string,
  formas: Array<{ unidadeCusteioId: string }>
) {
  const ids = Array.from(new Set(formas.map((forma) => forma.unidadeCusteioId)));

  if (!ids.length) return;

  const unidades = await db.unidadeCusteio.findMany({
    where: {
      empresaId,
      id: { in: ids },
      ativo: true
    },
    select: { id: true }
  });

  if (unidades.length !== ids.length) {
    throw new Error("UNIDADE_CUSTEIO_INVALIDA");
  }
}

export function buildFormasCusteioNestedCreate(
  empresaId: string,
  formas: FormaCusteioRecursoInput[]
) {
  return formas.map((forma) => ({
    empresaId,
    nome: forma.nome,
    unidadeCusteioId: forma.unidadeCusteioId,
    valorReferencia: forma.valorReferencia,
    preferencial: Boolean(forma.preferencial && forma.ativo),
    ativo: forma.ativo !== false,
    observacao: forma.observacao || null
  }));
}

export function buildFormasCusteioCreateMany(
  empresaId: string,
  owner: FormaOwner,
  formas: FormaCusteioRecursoInput[]
) {
  return buildFormasCusteioNestedCreate(empresaId, formas).map((forma) => ({
    ...forma,
    equipamentoId: "equipamentoId" in owner ? owner.equipamentoId : null,
    referenciaTecnicaId: "referenciaTecnicaId" in owner ? owner.referenciaTecnicaId : null
  }));
}

export type FormaCusteioResolucaoInput = {
  id: string;
  nome: string;
  valorReferencia: unknown;
  preferencial?: boolean | null;
  ativo?: boolean | null;
  unidadeCusteio?: {
    id?: string | null;
    codigo?: string | null;
    rotulo?: string | null;
    baseEconomica?: string | null;
    sufixo?: string | null;
  } | null;
};

export type ReferenciaTecnicaCusteioResolucaoInput = {
  id?: string | null;
  nome?: string | null;
  formasCusteio?: FormaCusteioResolucaoInput[] | null;
} | null;

export type EquipamentoCusteioResolucaoInput = {
  id?: string | null;
  descricao?: string | null;
  placaOuTag?: string | null;
  classeOperacional?: string | null;
  capacidadeM3?: unknown;
  unidadeCapacidade?: string | null;
  unidadeEconomicaPadrao?: string | null;
  custoPadrao?: unknown;
  referenciaTecnicaId?: string | null;
  referenciaTecnica?: ReferenciaTecnicaCusteioResolucaoInput;
  formasCusteio?: FormaCusteioResolucaoInput[] | null;
};

export type OrigemFormaCusteioResolvida = "EQUIPAMENTO" | "REFERENCIA_TECNICA" | "LEGADO" | "MANUAL" | "PENDENTE";

export type FormaCusteioResolvida = {
  status: "RESOLVIDA" | "MULTIPLAS_FORMAS" | "SEM_CUSTO";
  origem: OrigemFormaCusteioResolvida;
  motivo: string;
  forma?: FormaCusteioResolucaoInput;
  formasDisponiveis: FormaCusteioResolucaoInput[];
  referenciaTecnicaId?: string | null;
  referenciaTecnicaNome?: string | null;
  baseEconomica?: BaseEconomicaRecursoOperacional | null;
  unidadeCusto?: string | null;
  valorReferencia?: number | null;
  valorAplicado?: number | null;
};

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function activeFormas(formas?: FormaCusteioResolucaoInput[] | null) {
  return (formas ?? []).filter((forma) => forma.ativo !== false);
}

function resolveUnidadeCusto(forma: FormaCusteioResolucaoInput) {
  const sufixo = forma.unidadeCusteio?.sufixo;
  const base = forma.unidadeCusteio?.baseEconomica;
  return sufixo || (base ? `R$/${base.toLowerCase()}` : null);
}

function resolveFormaPorPrioridade(formas: FormaCusteioResolucaoInput[], origem: OrigemFormaCusteioResolvida) {
  const preferenciais = formas.filter((forma) => forma.preferencial === true);
  if (preferenciais.length === 1) return { origem, forma: preferenciais[0], ambiguo: false };
  if (preferenciais.length > 1) return { origem, forma: undefined, ambiguo: true };
  if (formas.length === 1) return { origem, forma: formas[0], ambiguo: false };
  if (formas.length > 1) return { origem, forma: undefined, ambiguo: true };
  return { origem, forma: undefined, ambiguo: false };
}

function buildResolvedForma(
  equipamento: EquipamentoCusteioResolucaoInput,
  origem: OrigemFormaCusteioResolvida,
  forma: FormaCusteioResolucaoInput,
  formasDisponiveis: FormaCusteioResolucaoInput[]
): FormaCusteioResolvida {
  const valor = toNumberOrNull(forma.valorReferencia);
  const base = forma.unidadeCusteio?.baseEconomica
    ? forma.unidadeCusteio.baseEconomica as BaseEconomicaRecursoOperacional
    : null;

  return {
    status: "RESOLVIDA",
    origem,
    motivo: "forma resolvida",
    forma,
    formasDisponiveis,
    referenciaTecnicaId: equipamento.referenciaTecnicaId ?? equipamento.referenciaTecnica?.id ?? null,
    referenciaTecnicaNome: equipamento.referenciaTecnica?.nome ?? null,
    baseEconomica: base,
    unidadeCusto: resolveUnidadeCusto(forma),
    valorReferencia: valor,
    valorAplicado: valor
  };
}

export function resolverFormaCusteioEquipamento(
  equipamento: EquipamentoCusteioResolucaoInput | null | undefined
): FormaCusteioResolvida {
  if (!equipamento) {
    return {
      status: "SEM_CUSTO",
      origem: "PENDENTE",
      motivo: "equipamento nao informado",
      formasDisponiveis: []
    };
  }

  const formasEquipamento = activeFormas(equipamento.formasCusteio);
  const formasReferencia = activeFormas(equipamento.referenciaTecnica?.formasCusteio);
  const todasFormas = [...formasEquipamento, ...formasReferencia];
  const resolucaoEquipamento = resolveFormaPorPrioridade(formasEquipamento, "EQUIPAMENTO");

  if (resolucaoEquipamento.forma) {
    return buildResolvedForma(equipamento, "EQUIPAMENTO", resolucaoEquipamento.forma, todasFormas);
  }

  if (resolucaoEquipamento.ambiguo) {
    return {
      status: "MULTIPLAS_FORMAS",
      origem: "EQUIPAMENTO",
      motivo: "multiplas formas de custeio do equipamento sem escolha explicita",
      formasDisponiveis: todasFormas,
      referenciaTecnicaId: equipamento.referenciaTecnicaId ?? equipamento.referenciaTecnica?.id ?? null,
      referenciaTecnicaNome: equipamento.referenciaTecnica?.nome ?? null
    };
  }

  const resolucaoReferencia = resolveFormaPorPrioridade(formasReferencia, "REFERENCIA_TECNICA");

  if (resolucaoReferencia.forma) {
    return buildResolvedForma(equipamento, "REFERENCIA_TECNICA", resolucaoReferencia.forma, todasFormas);
  }

  if (resolucaoReferencia.ambiguo) {
    return {
      status: "MULTIPLAS_FORMAS",
      origem: "REFERENCIA_TECNICA",
      motivo: "multiplas formas de custeio da referencia tecnica sem escolha explicita",
      formasDisponiveis: todasFormas,
      referenciaTecnicaId: equipamento.referenciaTecnicaId ?? equipamento.referenciaTecnica?.id ?? null,
      referenciaTecnicaNome: equipamento.referenciaTecnica?.nome ?? null
    };
  }

  const valorLegado = toNumberOrNull(equipamento.custoPadrao);
  if (valorLegado !== null && valorLegado > 0 && equipamento.unidadeEconomicaPadrao) {
    const base = equipamento.unidadeEconomicaPadrao as BaseEconomicaRecursoOperacional;
    return {
      status: "RESOLVIDA",
      origem: "LEGADO",
      motivo: "campos legados do equipamento",
      formasDisponiveis: todasFormas,
      referenciaTecnicaId: equipamento.referenciaTecnicaId ?? equipamento.referenciaTecnica?.id ?? null,
      referenciaTecnicaNome: equipamento.referenciaTecnica?.nome ?? null,
      baseEconomica: base,
      unidadeCusto: `R$/${String(base).toLowerCase()}`,
      valorReferencia: valorLegado,
      valorAplicado: valorLegado
    };
  }

  return {
    status: "SEM_CUSTO",
    origem: "PENDENTE",
    motivo: "sem forma de custeio ou custo legado configurado",
    formasDisponiveis: todasFormas,
    referenciaTecnicaId: equipamento.referenciaTecnicaId ?? equipamento.referenciaTecnica?.id ?? null,
    referenciaTecnicaNome: equipamento.referenciaTecnica?.nome ?? null
  };
}

export function resolverFormaCusteioPorId(
  equipamento: EquipamentoCusteioResolucaoInput | null | undefined,
  formaId: string | null | undefined
): FormaCusteioResolvida {
  if (!formaId) return resolverFormaCusteioEquipamento(equipamento);

  const formasEquipamento = activeFormas(equipamento?.formasCusteio);
  const formasReferencia = activeFormas(equipamento?.referenciaTecnica?.formasCusteio);
  const todasFormas = [...formasEquipamento, ...formasReferencia];
  const formaEquipamento = formasEquipamento.find((forma) => forma.id === formaId);
  const formaReferencia = formasReferencia.find((forma) => forma.id === formaId);
  const forma = formaEquipamento ?? formaReferencia;

  if (!forma || !equipamento) {
    return {
      status: "SEM_CUSTO",
      origem: "PENDENTE",
      motivo: "forma de custeio nao encontrada para o equipamento",
      formasDisponiveis: todasFormas
    };
  }

  return buildResolvedForma(equipamento, formaEquipamento ? "EQUIPAMENTO" : "REFERENCIA_TECNICA", forma, todasFormas);
}
