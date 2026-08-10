import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recursoBoletimDiarioProducaoSchema } from "@/lib/validators/boletim-diario-producao";
import { atualizarRecursoBoletimDiarioProducao, desvincularRecursoBoletimDiario } from "@/server/services/execucoes/service";

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
    await desvincularRecursoBoletimDiario(prisma, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel desvincular o fato.";
    const status = message === "RECURSO_BOLETIM_DIARIO_NAO_ENCONTRADO" ? 404 : 400;

    return NextResponse.json({ message }, { status });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
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
    const item = await atualizarRecursoBoletimDiarioProducao(prisma, id, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar o recurso.";
    const status = message === "RECURSO_BOLETIM_DIARIO_NAO_ENCONTRADO" ? 404 : 400;

    return NextResponse.json({ message }, { status });
  }
}
