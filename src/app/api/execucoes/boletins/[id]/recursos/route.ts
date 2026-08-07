import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recursoBoletimDiarioProducaoSchema } from "@/lib/validators/boletim-diario-producao";
import { adicionarRecursoBoletimDiarioProducao } from "@/server/services/execucoes/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = recursoBoletimDiarioProducaoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const item = await adicionarRecursoBoletimDiarioProducao(prisma, id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel adicionar o recurso ao boletim.";
    const status = message === "BOLETIM_DIARIO_NAO_ENCONTRADO" ? 404 : 400;

    return NextResponse.json({ message }, { status });
  }
}
