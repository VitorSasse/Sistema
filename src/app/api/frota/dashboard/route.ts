import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const [equipamentos, leiturasRecentes] = await Promise.all([
    prisma.equipamento.findMany({
      select: {
        id: true,
        status: true,
        statusOperacional: true,
        descricao: true,
        horimetroAtual: true,
        kmAtual: true,
        updatedAt: true
      }
    }),
    prisma.leituraEquipamento.findMany({
      include: {
        equipamento: {
          select: {
            descricao: true,
            placaOuTag: true
          }
        }
      },
      orderBy: [{ dataLeitura: "desc" }, { createdAt: "desc" }],
      take: 6
    })
  ]);

  const agora = Date.now();
  const seteDias = 7 * 24 * 60 * 60 * 1000;

  const resumo = {
    ativos: equipamentos.filter((item) => item.status === "ATIVO").length,
    emManutencao: equipamentos.filter((item) => item.statusOperacional === "EM_MANUTENCAO").length,
    parados: equipamentos.filter((item) => item.statusOperacional === "PARADO").length,
    semLeituraRecente: equipamentos.filter((item) => agora - item.updatedAt.getTime() > seteDias).length,
    alertas: 0,
    proximosServicos: equipamentos.filter(
      (item) =>
        item.status === "ATIVO" &&
        item.statusOperacional !== "INATIVO" &&
        (item.horimetroAtual !== null || item.kmAtual !== null)
    ).length
  };

  return NextResponse.json({
    resumo,
    leiturasRecentes
  });
}
