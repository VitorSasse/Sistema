import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fecharBoletimDiarioProducao } from "@/server/services/execucoes/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const boletim = await fecharBoletimDiarioProducao(prisma, id);
    return NextResponse.json({ item: boletim });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel fechar o boletim diario.";
    const status = message === "BOLETIM_DIARIO_NAO_ENCONTRADO" ? 404 : 400;

    return NextResponse.json({ message }, { status });
  }
}
