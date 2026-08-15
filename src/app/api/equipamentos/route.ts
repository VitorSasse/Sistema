import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { ensureUnidadesCusteioIniciais } from "@/lib/biblioteca-recursos/unidades-custeio";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { parseOptionalDateOnlyStart } from "@/lib/utils/date";
import { equipamentoSchema } from "@/lib/validators/equipamento";

function parseNullableNumber(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function normalizePayload(payload: Record<string, unknown>) {
  const formasCusteio = Array.isArray(payload.formasCusteio)
    ? payload.formasCusteio.map((forma) => {
        const record = forma && typeof forma === "object" ? forma as Record<string, unknown> : {};
        return {
          ...record,
          valorReferencia: parseNullableNumber(record.valorReferencia),
          preferencial: Boolean(record.preferencial),
          ativo: record.ativo !== false
        };
      })
    : [];

  return {
    ...payload,
    anoFabricacao: parseNullableNumber(payload.anoFabricacao),
    capacidadeM3: parseNullableNumber(payload.capacidadeM3),
    custoPadrao: parseNullableNumber(payload.custoPadrao),
    horimetroAtual: parseNullableNumber(payload.horimetroAtual),
    kmAtual: parseNullableNumber(payload.kmAtual),
    periodicidadeManutencaoHoras: parseNullableNumber(payload.periodicidadeManutencaoHoras),
    periodicidadeManutencaoKm: parseNullableNumber(payload.periodicidadeManutencaoKm),
    formasCusteio
  };
}

const equipamentoInclude = {
  referenciaTecnica: true,
  formasCusteio: {
    include: {
      unidadeCusteio: true
    },
    orderBy: [{ preferencial: "desc" as const }, { nome: "asc" as const }]
  }
};

async function resolveReferenciaTecnica(empresaId: string, referenciaTecnicaId: string | null | undefined) {
  if (!referenciaTecnicaId) return null;

  const referencia = await prisma.referenciaTecnicaRecurso.findFirst({
    where: {
      empresaId,
      id: referenciaTecnicaId,
      ativo: true
    },
    select: {
      id: true,
      nome: true
    }
  });

  if (!referencia) {
    throw new Error("REFERENCIA_TECNICA_INVALIDA");
  }

  return referencia;
}

async function assertUnidadesCusteioValidas(empresaId: string, formas: Array<{ unidadeCusteioId: string }>) {
  const ids = Array.from(new Set(formas.map((forma) => forma.unidadeCusteioId)));

  if (!ids.length) return;

  const unidades = await prisma.unidadeCusteio.findMany({
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

function buildFormasCusteioCreate(empresaId: string, formas: any[]) {
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

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = requireActiveTenantEmpresaId();
  await ensureUnidadesCusteioIniciais(prisma, empresaId);

  const [items, unidadesCusteio, referenciasTecnicas] = await Promise.all([
    prisma.equipamento.findMany({
      include: equipamentoInclude,
      orderBy: [{ descricao: "asc" }]
    }),
    prisma.unidadeCusteio.findMany({
      where: { empresaId },
      orderBy: [{ ativo: "desc" }, { rotulo: "asc" }]
    }),
    prisma.referenciaTecnicaRecurso.findMany({
      where: { empresaId },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      include: {
        _count: {
          select: { equipamentos: true }
        }
      }
    })
  ]);

  return NextResponse.json({ items, unidadesCusteio, referenciasTecnicas });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = equipamentoSchema.safeParse(normalizePayload(payload));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data as any;
  const placaOuTag = data.placaOuTag || `REC-${randomUUID().slice(0, 8).toUpperCase()}`;
  const empresaId = requireActiveTenantEmpresaId();

  try {
    await ensureUnidadesCusteioIniciais(prisma, empresaId);
    const referenciaTecnica = await resolveReferenciaTecnica(empresaId, data.referenciaTecnicaId);
    await assertUnidadesCusteioValidas(empresaId, data.formasCusteio);

    const equipamento = await prisma.equipamento.create({
      data: {
        empresaId,
        referenciaTecnicaId: referenciaTecnica?.id ?? null,
        naturezaRecurso: data.naturezaRecurso as any,
        tipoRecurso: data.tipoRecurso as any,
        tipoControle: data.tipoControle as any,
        descricao: data.descricao,
        descricaoOperacional: data.descricaoOperacional || null,
        placaOuTag,
        classeOperacional: referenciaTecnica?.nome ?? (data.classeOperacional || null),
        complementar: Boolean(data.complementar),
        fabricante: data.fabricante || null,
        modelo: data.modelo || null,
        marcaModelo: data.marcaModelo || null,
        anoFabricacao: data.anoFabricacao ?? null,
        dataEntrada: parseOptionalDateOnlyStart(data.dataEntrada),
        capacidadeM3: data.capacidadeM3 ?? null,
        unidadeCapacidade: data.unidadeCapacidade || null,
        unidadeEconomicaPadrao: data.unidadeEconomicaPadrao || null,
        custoPadrao: data.custoPadrao ?? null,
        permitirEdicaoOrcamento: Boolean(data.permitirEdicaoOrcamento),
        caracteristicasTecnicas: data.caracteristicasTecnicas ?? undefined,
        apelido: data.apelido || null,
        observacao: data.observacao || null,
        status: data.status as any,
        statusOperacional: data.statusOperacional as any,
        horimetroAtual: data.horimetroAtual ?? null,
        kmAtual: data.kmAtual ?? null,
        periodicidadeManutencaoHoras: data.periodicidadeManutencaoHoras ?? null,
        periodicidadeManutencaoKm: data.periodicidadeManutencaoKm ?? null,
        formasCusteio: data.formasCusteio.length
          ? { create: buildFormasCusteioCreate(empresaId, data.formasCusteio) }
          : undefined
      } as any,
      include: equipamentoInclude
    });

    return NextResponse.json(equipamento, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o equipamento.", detail: String(error) },
      { status: 409 }
    );
  }
}
