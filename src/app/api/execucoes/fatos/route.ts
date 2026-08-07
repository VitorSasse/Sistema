import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listarFatosOperacionaisExistentes } from "@/server/services/execucoes/service";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const items = await listarFatosOperacionaisExistentes(prisma, {
      execucaoId: searchParams.get("execucaoId"),
      obraId: searchParams.get("obraId"),
      dataInicio: searchParams.get("dataInicio"),
      dataFim: searchParams.get("dataFim"),
      recursoId: searchParams.get("recursoId"),
      servicoId: searchParams.get("servicoId")
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel listar os fatos operacionais.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
