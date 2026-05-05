import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { equipamentoSchema } from "@/lib/validators/equipamento";

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
    horimetroAtual: parseNullableNumber(payload.horimetroAtual),
    kmAtual: parseNullableNumber(payload.kmAtual),
    periodicidadeManutencaoHoras: parseNullableNumber(payload.periodicidadeManutencaoHoras),
    periodicidadeManutencaoKm: parseNullableNumber(payload.periodicidadeManutencaoKm)
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.equipamento.findMany({
    orderBy: [{ descricao: "asc" }]
  });

  return NextResponse.json({ items });
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

  try {
    const equipamento = await prisma.equipamento.create({
      data: {
        tipoRecurso: data.tipoRecurso as any,
        tipoControle: data.tipoControle as any,
        descricao: data.descricao,
        placaOuTag: data.placaOuTag,
        fabricante: data.fabricante || null,
        modelo: data.modelo || null,
        marcaModelo: data.marcaModelo || null,
        anoFabricacao: data.anoFabricacao ?? null,
        dataEntrada: data.dataEntrada ? new Date(data.dataEntrada) : null,
        capacidadeM3: data.capacidadeM3 ?? null,
        unidadeCapacidade: data.unidadeCapacidade || null,
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

    return NextResponse.json(equipamento, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o equipamento.", detail: String(error) },
      { status: 409 }
    );
  }
}
