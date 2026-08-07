import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { boletimDiarioProducaoSchema } from "@/lib/validators/boletim-diario-producao";
import { boletimDiarioProducaoInclude, criarBoletimDiarioProducao } from "@/server/services/execucoes/service";

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
  const empresaId = requireActiveTenantEmpresaId();
  const boletins = await prisma.boletimDiarioProducao.findMany({
    where: {
      empresaId,
      execucaoId: id
    },
    include: boletimDiarioProducaoInclude,
    orderBy: [{ dataBoletim: "desc" }]
  });

  return NextResponse.json({ items: boletins });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = boletimDiarioProducaoSchema.safeParse({
    ...payload,
    execucaoId: id
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const boletim = await criarBoletimDiarioProducao(prisma, parsed.data);
    return NextResponse.json({ item: boletim }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel criar o boletim diario.";
    const status = message === "EXECUCAO_NAO_ENCONTRADA" || message === "FRENTE_EXECUTADA_NAO_PERTENCE_EXECUCAO"
      ? 404
      : 400;

    return NextResponse.json({ message }, { status });
  }
}
