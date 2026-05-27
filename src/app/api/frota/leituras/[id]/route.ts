import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leituraEquipamentoSchema } from "@/lib/validators/frota/leitura-equipamento";
import { recalcularAcumuladoEquipamento } from "@/server/services/frota/leitura-sync";

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
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

  const existing = await prisma.leituraEquipamento.findUnique({
    where: { id },
    select: {
      id: true,
      equipamentoId: true,
      lancamentoDiarioId: true
    }
  });

  if (!existing) {
    return NextResponse.json({ message: "Leitura nao encontrada." }, { status: 404 });
  }

  const leitura = await prisma.$transaction(async (tx) => {
    const updated = await tx.leituraEquipamento.update({
      where: { id },
      data: {
        horimetroValor: parsed.data.horimetroValor ?? null,
        kmValor: parsed.data.kmValor ?? null,
        observacao: parsed.data.observacao || null,
        usuarioId: session.user.id
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
      }
    });

    if (existing.lancamentoDiarioId) {
      await tx.lancamentoDiario.update({
        where: { id: existing.lancamentoDiarioId },
        data: {
          horimetroInformado: parsed.data.horimetroValor ?? null,
          kmInformado: parsed.data.kmValor ?? null,
          observacao: parsed.data.observacao || null,
          atualizadoPorId: session.user.id
        }
      });
    }

    await recalcularAcumuladoEquipamento(tx, existing.equipamentoId);

    return updated;
  });

  return NextResponse.json(leitura);
}
