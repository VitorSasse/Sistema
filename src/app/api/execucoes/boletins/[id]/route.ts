import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { excluirBoletimDiarioProducao } from "@/server/services/execucoes/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const item = await excluirBoletimDiarioProducao(prisma, id);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel excluir o boletim.";
    const status = message === "BOLETIM_DIARIO_NAO_ENCONTRADO" ? 404 : 400;

    return NextResponse.json({ message }, { status });
  }
}
