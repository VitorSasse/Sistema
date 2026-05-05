import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const entidade = request.nextUrl.searchParams.get("entidade");
  const entidadeId = request.nextUrl.searchParams.get("entidadeId");

  const items = await prisma.historicoAlteracao.findMany({
    where: {
      entidade: entidade || undefined,
      entidadeId: entidadeId || undefined
    },
    include: {
      usuario: {
        select: {
          nome: true,
          email: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return NextResponse.json({ items });
}
