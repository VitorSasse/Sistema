import type { PrismaClient } from "@prisma/client";
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
