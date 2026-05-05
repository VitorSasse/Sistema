import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const [clientes, obras, servicos, materiais, equipamentos, colaboradores] = await Promise.all([
    prisma.cliente.findMany({
      select: {
        id: true,
        codigo: true,
        nome: true,
        status: true
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.obra.findMany({
      select: {
        id: true,
        codigo: true,
        nome: true,
        status: true,
        clienteId: true,
        liberadaParaLancamento: true
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.servico.findMany({
      select: {
        id: true,
        codigo: true,
        tipoServico: true,
        status: true,
        exigeMaterial: true
      },
      orderBy: [{ tipoServico: "asc" }]
    }),
    prisma.material.findMany({
      select: {
        id: true,
        codigoMaterial: true,
        descricao: true,
        status: true
      },
      orderBy: [{ descricao: "asc" }]
    }),
    prisma.equipamento.findMany({
      select: {
        id: true,
        descricao: true,
        placaOuTag: true,
        status: true
      },
      orderBy: [{ descricao: "asc" }]
    }),
    prisma.colaborador.findMany({
      select: {
        id: true,
        codigo: true,
        nome: true,
        status: true
      },
      orderBy: [{ nome: "asc" }]
    })
  ]);

  return NextResponse.json({
    clientes,
    obras,
    servicos,
    materiais,
    equipamentos,
    colaboradores
  });
}
