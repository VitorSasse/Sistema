import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiPermission } from "@/lib/auth-guards";
import { measurePerformanceStep } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { orcamentoSchema } from "@/lib/validators/orcamento";
import {
  criarOrcamento,
  listarOrcamentos
} from "@/server/services/orcamentos/service";
import {
  buildOrcamentoValidationErrorResponse,
  handleOrcamentoApiError,
  orcamentoTransactionOptions
} from "@/app/api/orcamentos/_utils";

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  try {
    const items = await measurePerformanceStep("listOrcamentos", () => listarOrcamentos(prisma, {
      search: searchParams.get("search"),
      clienteId: searchParams.get("clienteId"),
      obraId: searchParams.get("obraId"),
      responsavelId: searchParams.get("responsavelId"),
      tipo: searchParams.get("tipo"),
      status: searchParams.get("status"),
      dataInicial: searchParams.get("dataInicial"),
      dataFinal: searchParams.get("dataFinal")
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
  });
}

export async function POST(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos", method: "POST" }, async () => {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const payload = await measurePerformanceStep("readPayload", () => request.json());
  const parsed = await measurePerformanceStep("validation", async () => orcamentoSchema.safeParse(payload));

  if (!parsed.success) {
    return buildOrcamentoValidationErrorResponse(parsed.error);
  }

  try {
    const orcamento = await measurePerformanceStep("transaction", () => prisma.$transaction(
      (tx) =>
        criarOrcamento(tx, {
          input: parsed.data,
          userId: permission.session.user.id
        }),
      orcamentoTransactionOptions
    ));

    return NextResponse.json(orcamento, { status: 201 });
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
  });
}
