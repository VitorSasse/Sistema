import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  adicionarLancamentosNaMedicao,
  buscarLancamentosElegiveisParaMedicao
} from "@/server/services/medicoes/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readCobrancaMaterial(value: string | null) {
  return value === "M3" ? "M3" : "CARGA";
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const cobrancaMaterial = request.nextUrl.searchParams.get("cobrancaMaterial");

  try {
    const data = await buscarLancamentosElegiveisParaMedicao(prisma, {
      medicaoId: id,
      cobrancaMaterial: cobrancaMaterial === null ? undefined : readCobrancaMaterial(cobrancaMaterial)
    });

    return NextResponse.json(data);
  } catch (error) {
    if (!(error instanceof Error)) {
      return NextResponse.json(
        { message: "Nao foi possivel carregar os lancamentos elegiveis." },
        { status: 400 }
      );
    }

    if (error.message === "MEDICAO_NAO_ENCONTRADA") {
      return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
    }

    if (error.message === "MEDICAO_BLOQUEADA_PARA_EDICAO") {
      return NextResponse.json(
        { message: "Esta medicao nao pode mais receber alteracoes ou novos lancamentos." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error.message || "Nao foi possivel carregar os lancamentos elegiveis." },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as {
    lancamentoIds?: string[];
    cobrancaMaterial?: "CARGA" | "M3";
  };

  try {
    const medicao = await prisma.$transaction((tx) =>
      adicionarLancamentosNaMedicao(tx, {
        medicaoId: id,
        lancamentoIds: Array.isArray(payload.lancamentoIds) ? payload.lancamentoIds : [],
        cobrancaMaterial: payload.cobrancaMaterial
      })
    );

    return NextResponse.json(medicao);
  } catch (error) {
    if (!(error instanceof Error)) {
      return NextResponse.json(
        { message: "Nao foi possivel inserir os lancamentos na medicao." },
        { status: 400 }
      );
    }

    if (error.message === "MEDICAO_NAO_ENCONTRADA") {
      return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
    }

    if (error.message === "MEDICAO_BLOQUEADA_PARA_EDICAO") {
      return NextResponse.json(
        { message: "Esta medicao nao pode mais receber alteracoes ou novos lancamentos." },
        { status: 409 }
      );
    }

    if (error.message === "NENHUM_LANCAMENTO_SELECIONADO") {
      return NextResponse.json(
        { message: "Selecione ao menos um lancamento para inserir na medicao." },
        { status: 400 }
      );
    }

    if (error.message === "LANCAMENTOS_NAO_ELEGIVEIS") {
      return NextResponse.json(
        { message: "Um ou mais lancamentos nao estao mais elegiveis para esta medicao." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error.message || "Nao foi possivel inserir os lancamentos na medicao." },
      { status: 400 }
    );
  }
}
