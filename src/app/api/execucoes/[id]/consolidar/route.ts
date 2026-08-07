import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consolidarExecucaoPorBoletins } from "@/server/services/execucoes/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const item = await consolidarExecucaoPorBoletins(prisma, id);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel consolidar a execucao.";
    const status = message === "EXECUCAO_NAO_ENCONTRADA" ? 404 : 400;

    return NextResponse.json({ message }, { status });
  }
}
