import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planoManutencaoSchema } from "@/lib/validators/frota/plano-manutencao";
import { calcularProximaManutencao } from "@/server/services/frota/plano-service";

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
    periodicidadeValor: Number(payload.periodicidadeValor),
    toleranciaValor:
      payload.toleranciaValor === "" || payload.toleranciaValor === undefined
        ? 0
        : Number(payload.toleranciaValor),
    ultimaLeituraHorimetro: parseNullableNumber(payload.ultimaLeituraHorimetro),
    ultimaLeituraKm: parseNullableNumber(payload.ultimaLeituraKm),
    responsavelId: payload.responsavelId || null
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.planoManutencao.findMany({
    include: {
      equipamento: {
        select: {
          id: true,
          descricao: true,
          placaOuTag: true
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = planoManutencaoSchema.safeParse(normalizePayload(payload));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const projection = calcularProximaManutencao({
    criterioControle: parsed.data.criterioControle,
    periodicidadeValor: parsed.data.periodicidadeValor,
    ultimaExecucaoEm: parsed.data.ultimaExecucaoEm ? new Date(parsed.data.ultimaExecucaoEm) : null,
    ultimaLeituraHorimetro: parsed.data.ultimaLeituraHorimetro ?? null,
    ultimaLeituraKm: parsed.data.ultimaLeituraKm ?? null
  });

  const created = await prisma.planoManutencao.create({
    data: {
      equipamentoId: parsed.data.equipamentoId,
      titulo: parsed.data.tipoManutencao,
      tipoManutencao: parsed.data.tipoManutencao,
      criterioControle: parsed.data.criterioControle,
      periodicidadeValor: parsed.data.periodicidadeValor,
      toleranciaValor: parsed.data.toleranciaValor,
      ultimaExecucaoEm: parsed.data.ultimaExecucaoEm ? new Date(parsed.data.ultimaExecucaoEm) : null,
      ultimaLeituraHorimetro: parsed.data.ultimaLeituraHorimetro ?? null,
      ultimaLeituraKm: parsed.data.ultimaLeituraKm ?? null,
      proximaExecucaoEm: projection.proximaExecucaoEm,
      proximoHorimetro: projection.proximoHorimetro,
      proximoKm: projection.proximoKm,
      responsavelId: parsed.data.responsavelId ?? null,
      observacao: parsed.data.observacao || null,
      status: parsed.data.status
    }
  });

  return NextResponse.json(created, { status: 201 });
}
