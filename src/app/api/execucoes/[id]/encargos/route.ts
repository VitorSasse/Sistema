import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { salvarEncargosEconomicosExecucaoSchema } from "@/lib/validators/execucao-encargos";
import { salvarEncargosEconomicosExecucao } from "@/server/services/execucoes/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = salvarEncargosEconomicosExecucaoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const item = await salvarEncargosEconomicosExecucao(prisma, id, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel salvar os encargos economicos.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
