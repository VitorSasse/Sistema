import { NextRequest, NextResponse } from "next/server";
import { validateApiPermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { duplicarOrcamento } from "@/server/services/orcamentos/service";
import {
  handleOrcamentoApiError,
  orcamentoTransactionOptions
} from "@/app/api/orcamentos/_utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: NextRequest, context: RouteContext) {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;

  try {
    const orcamento = await prisma.$transaction(
      (tx) =>
        duplicarOrcamento(tx, {
          id,
          userId: permission.session.user.id
        }),
      orcamentoTransactionOptions
    );

    return NextResponse.json(orcamento, { status: 201 });
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
}
