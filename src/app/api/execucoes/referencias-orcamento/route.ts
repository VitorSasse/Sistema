import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listarReferenciasOrcamentoExecucao } from "@/server/services/execucoes/service";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const data = await listarReferenciasOrcamentoExecucao(prisma, {
      clienteId: searchParams.get("clienteId"),
      obraId: searchParams.get("obraId"),
      orcamentoId: searchParams.get("orcamentoId")
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel carregar referencias de orcamento.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
