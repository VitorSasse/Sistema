import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  atualizarDadosMedicao,
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
    periodoInicial?: string | null;
    periodoFinal?: string | null;
    observacao?: string | null;
    observacaoInterna?: string | null;
    descontoValor?: number | null;
    permutaPercentual?: number | null;
    numeroPedido?: string | null;
    numeroNotaFiscal?: string | null;
  };

  try {
    const medicao = await prisma.$transaction((tx) =>
      atualizarDadosMedicao(tx, {
        id,
        periodoInicial: payload.periodoInicial?.trim() || "",
        periodoFinal: payload.periodoFinal?.trim() || "",
        observacao: payload.observacao?.trim() ? payload.observacao.trim() : null,
        observacaoInterna: payload.observacaoInterna?.trim()
          ? payload.observacaoInterna.trim()
          : null,
        descontoValor:
          payload.descontoValor == null || Number.isNaN(Number(payload.descontoValor))
            ? 0
            : Math.max(0, Number(payload.descontoValor)),
        permutaPercentual:
          payload.permutaPercentual == null || Number.isNaN(Number(payload.permutaPercentual))
            ? 0
            : Number(payload.permutaPercentual),
        numeroPedido: payload.numeroPedido?.trim() ? payload.numeroPedido.trim() : null,
        numeroNotaFiscal: payload.numeroNotaFiscal?.trim()
          ? payload.numeroNotaFiscal.trim()
          : null
      })
    );

    return NextResponse.json(medicao);
  } catch (error) {
    if (error instanceof Error && error.message === "MEDICAO_NAO_ENCONTRADA") {
      return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "MEDICAO_BLOQUEADA_PARA_EDICAO") {
      return NextResponse.json(
        { message: "Esta medicao nao pode mais ter conteudo alterado neste status." },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "PERIODO_INVALIDO") {
      return NextResponse.json(
        { message: "O periodo final nao pode ser menor que o periodo inicial." },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "PERIODO_BLOQUEADO_POS_CONCLUSAO") {
      return NextResponse.json(
        {
          message:
            "O periodo nao pode mais ser alterado porque esta medicao ja foi concluida em algum momento."
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message.startsWith("PERIODO_NAO_ABRANGE_ITENS:")) {
      const [, dataInicialItem = "", dataFinalItem = ""] = error.message.split(":");

      return NextResponse.json(
        {
          message: `O novo periodo precisa abranger todos os itens ja vinculados a esta medicao, entre ${dataInicialItem} e ${dataFinalItem}.`
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "PERMUTA_PERCENTUAL_INVALIDA") {
      return NextResponse.json(
        { message: "O percentual de permuta precisa estar entre 0% e 100%." },
        { status: 400 }
      );
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
