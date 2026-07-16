import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptionalDateOnlyStart } from "@/lib/utils/date";
import { equipamentoSchema } from "@/lib/validators/equipamento";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseNullableNumber(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function normalizePayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    anoFabricacao: parseNullableNumber(payload.anoFabricacao),
    capacidadeM3: parseNullableNumber(payload.capacidadeM3),
    custoPadrao: parseNullableNumber(payload.custoPadrao),
    horimetroAtual: parseNullableNumber(payload.horimetroAtual),
    kmAtual: parseNullableNumber(payload.kmAtual),
    periodicidadeManutencaoHoras: parseNullableNumber(payload.periodicidadeManutencaoHoras),
    periodicidadeManutencaoKm: parseNullableNumber(payload.periodicidadeManutencaoKm)
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = equipamentoSchema.safeParse(normalizePayload(payload));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data as any;

  try {
    const atual = await prisma.equipamento.findUnique({
      where: { id },
      select: { placaOuTag: true }
    });

    if (!atual) {
      return NextResponse.json({ message: "Equipamento nao encontrado." }, { status: 404 });
    }

    const equipamento = await prisma.equipamento.update({
      where: { id },
      data: {
        naturezaRecurso: data.naturezaRecurso as any,
        tipoRecurso: data.tipoRecurso as any,
        tipoControle: data.tipoControle as any,
        descricao: data.descricao,
        descricaoOperacional: data.descricaoOperacional || null,
        placaOuTag: data.placaOuTag || atual.placaOuTag,
        classeOperacional: data.classeOperacional || null,
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
        periodicidadeManutencaoKm: data.periodicidadeManutencaoKm ?? null
      } as any
    });

    return NextResponse.json(equipamento);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar o equipamento.", detail: String(error) },
      { status: 409 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const mode = request.nextUrl.searchParams.get("mode");

  try {
    if (mode === "delete") {
      const equipamento = await prisma.equipamento.delete({
        where: { id }
      });

      return NextResponse.json(equipamento);
    }

    const equipamento = await prisma.equipamento.update({
      where: { id },
      data: {
        status: "INATIVO",
        statusOperacional: "INATIVO"
      }
    });

    return NextResponse.json(equipamento);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o equipamento. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o equipamento.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
