import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiPermission } from "@/lib/auth-guards";
import { measurePerformanceStep } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { orcamentoSchema } from "@/lib/validators/orcamento";
import {
  atualizarOrcamento,
  buscarOrcamento,
  excluirOrcamento
} from "@/server/services/orcamentos/service";
import {
  buildOrcamentoValidationErrorResponse,
  handleOrcamentoApiError,
  orcamentoTransactionOptions
} from "@/app/api/orcamentos/_utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos/[id]", method: "GET" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const orcamento = await measurePerformanceStep("loadOrcamento", () => buscarOrcamento(prisma, id));

  if (!orcamento) {
    return NextResponse.json({ message: "Orcamento nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(orcamento);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos/[id]", method: "PATCH" }, async () => {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;
  const payload = await measurePerformanceStep("readPayload", () => request.json());
  const parsed = await measurePerformanceStep("validation", async () => orcamentoSchema.safeParse(payload));

  if (!parsed.success) {
    return buildOrcamentoValidationErrorResponse(parsed.error);
  }

  try {
    const orcamento = await measurePerformanceStep("transaction", () => prisma.$transaction(
      (tx) =>
        atualizarOrcamento(tx, {
          id,
          input: parsed.data,
          userId: permission.session.user.id
        }),
      orcamentoTransactionOptions
    ));

    return NextResponse.json(orcamento);
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos/[id]", method: "DELETE" }, async () => {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;

  try {
    const orcamento = await measurePerformanceStep("transaction", () => prisma.$transaction(
      (tx) => excluirOrcamento(tx, id),
      orcamentoTransactionOptions
    ));
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
  });
}
