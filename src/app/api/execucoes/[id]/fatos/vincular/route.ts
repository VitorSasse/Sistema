import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vincularFatosOperacionaisExecucao } from "@/server/services/execucoes/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const vincularFatosSchema = z.object({
  frenteExecutadaId: z.string().uuid(),
  fatosIds: z.array(z.string().uuid()).min(1),
  observacao: z.string().trim().max(700).optional().nullable()
});

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = vincularFatosSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const items = await vincularFatosOperacionaisExecucao(prisma, {
      execucaoId: id,
      frenteExecutadaId: parsed.data.frenteExecutadaId,
      fatosIds: parsed.data.fatosIds,
      observacao: parsed.data.observacao
    });

    return NextResponse.json({ items }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel vincular os fatos operacionais.";
    const status = message === "EXECUCAO_NAO_ENCONTRADA" ? 404 : 400;

    return NextResponse.json({ message }, { status });
  }
}
