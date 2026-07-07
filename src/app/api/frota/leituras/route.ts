import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyEnd, parseDateOnlyStart } from "@/lib/utils/date";
import { leituraEquipamentoSchema } from "@/lib/validators/frota/leitura-equipamento";
import { recalcularAcumuladoEquipamento } from "@/server/services/frota/leitura-sync";

function parseNullableNumber(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const equipamentoId = searchParams.get("equipamentoId");
  const dataInicial = searchParams.get("dataInicial");
  const dataFinal = searchParams.get("dataFinal");
  const origem = searchParams.get("origem");

  const items = await prisma.leituraEquipamento.findMany({
    where: {
      ...(equipamentoId ? { equipamentoId } : {}),
      ...(origem ? { origem: origem as never } : {}),
      ...(dataInicial || dataFinal
        ? {
            dataLeitura: {
              ...(dataInicial ? { gte: parseDateOnlyStart(dataInicial) } : {}),
              ...(dataFinal ? { lte: parseDateOnlyEnd(dataFinal) } : {})
            }
          }
        : {})
    },
    include: {
      equipamento: {
        select: {
          id: true,
          descricao: true,
          placaOuTag: true
        }
      },
      usuario: {
        select: {
          id: true,
          nome: true
        }
      }
    },
    orderBy: [{ dataLeitura: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = leituraEquipamentoSchema.safeParse({
    ...payload,
    horimetroValor: parseNullableNumber(payload.horimetroValor),
    kmValor: parseNullableNumber(payload.kmValor)
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const equipamento = await prisma.equipamento.findUnique({
    where: { id: parsed.data.equipamentoId },
    select: {
      id: true,
      descricao: true,
      horimetroAtual: true,
      kmAtual: true,
      status: true
    }
  });

  if (!equipamento || equipamento.status !== "ATIVO") {
    return NextResponse.json(
      { message: "Equipamento nao encontrado ou inativo." },
      { status: 404 }
    );
  }

  const leitura = await prisma.$transaction(async (tx) => {
    const created = await tx.leituraEquipamento.create({
      data: {
        equipamentoId: parsed.data.equipamentoId,
        dataLeitura: parseDateOnlyStart(parsed.data.dataLeitura),
        horimetroValor: parsed.data.horimetroValor ?? null,
        kmValor: parsed.data.kmValor ?? null,
        origem: parsed.data.origem,
        observacao: parsed.data.observacao || null,
        usuarioId: session.user.id
      },
      include: {
        equipamento: {
          select: {
            descricao: true
          }
        },
        usuario: {
          select: {
            nome: true
          }
        }
      }
    });

    await recalcularAcumuladoEquipamento(tx, parsed.data.equipamentoId);

    return created;
  });

  return NextResponse.json(leitura, { status: 201 });
}
