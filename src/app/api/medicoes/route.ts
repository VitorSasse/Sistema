import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { measurePerformanceStep } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import {
  criarMedicao,
  listarMedicoes
} from "@/server/services/medicoes/service";
import { medicaoCreateSchema } from "@/lib/validators/medicao";

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/medicoes" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  const items = await measurePerformanceStep("listMedicoes", () => listarMedicoes(prisma, {
    clienteId: searchParams.get("clienteId") ?? undefined,
    obraId: searchParams.get("obraId") ?? undefined,
    status: searchParams.get("status"),
    tipoMedicao: searchParams.get("tipoMedicao"),
    periodoInicial: searchParams.get("periodoInicial"),
    periodoFinal: searchParams.get("periodoFinal"),
    numeroPedido: searchParams.get("numeroPedido"),
    numeroNotaFiscal: searchParams.get("numeroNotaFiscal")
  }));

  return NextResponse.json({ items });
  });
}

export async function POST(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/medicoes", method: "POST" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await measurePerformanceStep("readPayload", () => request.json());
  const parsed = await measurePerformanceStep("validation", async () => medicaoCreateSchema.safeParse({
    ...payload,
    obraId: payload.obraId || null
  }));

  if (!parsed.success) {
    const hasItemIssue = parsed.error.issues.some((issue) => issue.path[0] === "itens");
    return NextResponse.json(
      {
        message: hasItemIssue
          ? "Preencha um valor unitario valido para todos os itens da medicao."
          : "Filtros invalidos.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  if (parsed.data.periodoFinal < parsed.data.periodoInicial) {
    return NextResponse.json(
      { message: "O periodo final nao pode ser menor que o periodo inicial." },
      { status: 400 }
    );
  }

  try {
    const medicao = await measurePerformanceStep("transaction", () => prisma.$transaction((tx) =>
      criarMedicao(tx, {
        input: parsed.data,
        userId: session.user.id
      })
    ));

    return NextResponse.json(medicao, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Nao ha lancamentos validos")) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (
      error instanceof Error &&
      [
        "VALOR_UNITARIO_DUPLICADO",
        "ITEM_MEDICAO_INVALIDO",
        "VALOR_UNITARIO_OBRIGATORIO",
        "VALOR_UNITARIO_INVALIDO",
        "PERMUTA_PERCENTUAL_INVALIDA"
      ].includes(error.message)
    ) {
      const messageByCode: Record<string, string> = {
        VALOR_UNITARIO_DUPLICADO: "Ha valores unitarios duplicados no envio da medicao.",
        ITEM_MEDICAO_INVALIDO: "A lista de itens da medicao nao confere com a pre-visualizacao atual.",
        VALOR_UNITARIO_OBRIGATORIO: "Preencha o valor unitario de todos os itens antes de gerar a medicao.",
        VALOR_UNITARIO_INVALIDO: "Existe valor unitario invalido em um ou mais itens.",
        PERMUTA_PERCENTUAL_INVALIDA: "O percentual de permuta da medicao precisa estar entre 0% e 100%."
      };

      return NextResponse.json(
        { message: messageByCode[error.message] ?? "Nao foi possivel gerar a medicao." },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("CAPACIDADE_M3_NAO_CONFIGURADA:")
    ) {
      const tags = error.message.replace("CAPACIDADE_M3_NAO_CONFIGURADA:", "").trim();

      return NextResponse.json(
        {
          message: `Existem caminhoes sem capacidade m3 cadastrada para calcular a medicao por m3: ${tags}.`
        },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel gerar a medicao. Tente novamente." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel gerar a medicao.", detail: String(error) },
      { status: 500 }
    );
  }
  });
}
