import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiPermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { orcamentoSchema } from "@/lib/validators/orcamento";
import {
  atualizarOrcamento,
  buscarOrcamento,
  excluirOrcamento
} from "@/server/services/orcamentos/service";
import {
  handleOrcamentoApiError,
  orcamentoTransactionOptions
} from "@/app/api/orcamentos/_utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const orcamento = await buscarOrcamento(prisma, id);

  if (!orcamento) {
    return NextResponse.json({ message: "Orcamento nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(orcamento);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = orcamentoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const orcamento = await prisma.$transaction(
      (tx) =>
        atualizarOrcamento(tx, {
          id,
          input: parsed.data,
          userId: permission.session.user.id
        }),
      orcamentoTransactionOptions
    );

    return NextResponse.json(orcamento);
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;

  try {
    const orcamento = await prisma.$transaction(
      (tx) => excluirOrcamento(tx, id),
      orcamentoTransactionOptions
    );
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
}
