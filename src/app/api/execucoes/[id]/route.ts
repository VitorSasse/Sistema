import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buscarExecucaoOperacional } from "@/server/services/execucoes/service";

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
