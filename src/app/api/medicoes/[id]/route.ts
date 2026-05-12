import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  atualizarObservacaoMedicao,
  buscarDetalheMedicao,
  excluirMedicao
} from "@/server/services/medicoes/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  const medicao = await buscarDetalheMedicao(prisma, id);

  if (!medicao) {
    return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
  }

  return NextResponse.json(medicao);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as {
    observacao?: string | null;
    observacaoInterna?: string | null;
    descontoValor?: number | null;
  };

  try {
    const medicao = await prisma.$transaction((tx) =>
      atualizarObservacaoMedicao(tx, {
        id,
        observacao: payload.observacao?.trim() ? payload.observacao.trim() : null,
        observacaoInterna: payload.observacaoInterna?.trim()
          ? payload.observacaoInterna.trim()
          : null,
        descontoValor:
          payload.descontoValor == null || Number.isNaN(Number(payload.descontoValor))
            ? 0
            : Math.max(0, Number(payload.descontoValor))
      })
    );

    return NextResponse.json(medicao);
  } catch (error) {
    if (error instanceof Error && error.message === "MEDICAO_NAO_ENCONTRADA") {
      return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar os dados da medicao." },
      { status: 400 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const medicao = await prisma.$transaction((tx) =>
      excluirMedicao(tx, { id })
    );

    return NextResponse.json(medicao);
  } catch (error) {
    if (!(error instanceof Error)) {
      return NextResponse.json(
        { message: "Nao foi possivel excluir a medicao." },
        { status: 500 }
      );
    }

    if (error.message === "MEDICAO_NAO_ENCONTRADA") {
      return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
    }

    if (error.message === "MEDICAO_MENSAL_NAO_PODE_EXCLUIR") {
      return NextResponse.json(
        { message: "Medicoes do tipo MENSAL nao podem ser excluidas." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel excluir a medicao." },
      { status: 500 }
    );
  }
}
