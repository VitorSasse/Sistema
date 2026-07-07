import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiPermission } from "@/lib/auth-guards";
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
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  try {
    const items = await listarOrcamentos(prisma, {
      search: searchParams.get("search"),
      clienteId: searchParams.get("clienteId"),
      obraId: searchParams.get("obraId"),
      responsavelId: searchParams.get("responsavelId"),
      tipo: searchParams.get("tipo"),
      status: searchParams.get("status"),
      dataInicial: searchParams.get("dataInicial"),
      dataFinal: searchParams.get("dataFinal")
    });

    return NextResponse.json({ items });
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const payload = await request.json();
  const parsed = orcamentoSchema.safeParse(payload);

  if (!parsed.success) {
    return buildOrcamentoValidationErrorResponse(parsed.error);
  }

  try {
    const orcamento = await prisma.$transaction(
      (tx) =>
        criarOrcamento(tx, {
          input: parsed.data,
          userId: permission.session.user.id
        }),
      orcamentoTransactionOptions
    );

    return NextResponse.json(orcamento, { status: 201 });
  } catch (error) {
    return handleOrcamentoApiError(error);
  }
}
