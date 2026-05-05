import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leituraEquipamentoSchema } from "@/lib/validators/frota/leitura-equipamento";

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
              ...(dataInicial ? { gte: new Date(dataInicial) } : {}),
              ...(dataFinal ? { lte: new Date(dataFinal) } : {})
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

  if (
    parsed.data.horimetroValor !== null &&
    equipamento.horimetroAtual !== null &&
    Number(parsed.data.horimetroValor) < Number(equipamento.horimetroAtual)
  ) {
    return NextResponse.json(
      { message: "Leitura de horimetro inconsistente. O valor nao pode regredir." },
      { status: 409 }
    );
  }

  if (
    parsed.data.kmValor !== null &&
    equipamento.kmAtual !== null &&
    Number(parsed.data.kmValor) < Number(equipamento.kmAtual)
  ) {
    return NextResponse.json(
      { message: "Leitura de quilometragem inconsistente. O valor nao pode regredir." },
      { status: 409 }
    );
  }

  const leitura = await prisma.$transaction(async (tx) => {
    const created = await tx.leituraEquipamento.create({
      data: {
        equipamentoId: parsed.data.equipamentoId,
        dataLeitura: new Date(parsed.data.dataLeitura),
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

    await tx.equipamento.update({
      where: { id: parsed.data.equipamentoId },
      data: {
        horimetroAtual: parsed.data.horimetroValor ?? equipamento.horimetroAtual,
        kmAtual: parsed.data.kmValor ?? equipamento.kmAtual
      }
    });

    return created;
  });

  return NextResponse.json(leitura, { status: 201 });
}
