import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { atualizarValorItemMedicao } from "@/server/services/medicoes/service";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id, itemId } = await context.params;
  const payload = (await request.json()) as {
    valorUnitario?: number;
    quantidadeFaturada?: number;
    unidadeFaturada?: "CARGA" | "HORA" | "M3" | "DIARIA";
  };
  const valorUnitario = Number(payload.valorUnitario);
  const quantidadeFaturada =
    payload.quantidadeFaturada === undefined
      ? undefined
      : parseDecimalInput(payload.quantidadeFaturada);
  const unidadeFaturada = payload.unidadeFaturada;

  if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
    return NextResponse.json(
      { message: "Valor unitario invalido." },
      { status: 400 }
    );
  }

  if (
    quantidadeFaturada !== undefined &&
    (!Number.isFinite(quantidadeFaturada) || quantidadeFaturada < 0)
  ) {
    return NextResponse.json(
      { message: "Quantidade faturada invalida." },
      { status: 400 }
    );
  }

  if (
    unidadeFaturada &&
    unidadeFaturada !== "CARGA" &&
    unidadeFaturada !== "HORA" &&
    unidadeFaturada !== "M3" &&
    unidadeFaturada !== "DIARIA"
  ) {
    return NextResponse.json(
      { message: "Unidade faturada invalida." },
      { status: 400 }
    );
  }

  try {
    const medicao = await prisma.$transaction((tx) =>
      atualizarValorItemMedicao(tx, {
        medicaoId: id,
        itemId,
        valorUnitario,
        quantidadeFaturada,
        unidadeFaturada
      })
    );

    return NextResponse.json(medicao);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.message === "ITEM_MEDICAO_NAO_ENCONTRADO"
            ? "Item da medicao nao encontrado."
            : "Nao foi possivel atualizar o valor do item."
      },
      { status: 400 }
    );
  }
}
