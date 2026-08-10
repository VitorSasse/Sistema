import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { execucaoSchema } from "@/lib/validators/execucao";
import { atualizarCabecalhoExecucao, buscarExecucaoOperacional } from "@/server/services/execucoes/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const item = await buscarExecucaoOperacional(prisma, id);

  if (!item) {
    return NextResponse.json({ message: "Execucao nao encontrada." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = execucaoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const item = await atualizarCabecalhoExecucao(prisma, id, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar a execucao.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
