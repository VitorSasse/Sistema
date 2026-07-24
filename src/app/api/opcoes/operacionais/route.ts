import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const [clientes, obras, servicos, materiais, equipamentos, colaboradores, fornecedores] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        status: { in: ["ATIVO", "PROSPECTO"] }
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        status: true,
        cadastroCompleto: true
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.obra.findMany({
      where: {
        status: { in: ["ATIVO", "PROVISORIA"] }
      },
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
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        codigo: true,
        tipoServico: true,
        status: true,
        natureza: true,
        usarEmOrcamentos: true,
        usarEmFichas: true,
        usarEmMedicoes: true,
        usarEmFaturamento: true,
        exigeMaterial: true,
        servicoTecnico: true,
        faturamentoFechado: true,
        valorFechadoPadrao: true,
        unidadeApontamento: true,
        unidadeFaturamento: true
      },
      orderBy: [{ tipoServico: "asc" }]
    }),
    prisma.material.findMany({
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        codigoMaterial: true,
        descricao: true,
        unidadePadrao: true,
        status: true
      },
      orderBy: [{ descricao: "asc" }]
    }),
    prisma.equipamento.findMany({
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        descricao: true,
        placaOuTag: true,
        naturezaRecurso: true,
        tipoRecurso: true,
        classeOperacional: true,
        descricaoOperacional: true,
        capacidadeM3: true,
        unidadeCapacidade: true,
        unidadeEconomicaPadrao: true,
        custoPadrao: true,
        permitirEdicaoOrcamento: true,
        caracteristicasTecnicas: true,
        status: true
      },
      orderBy: [{ descricao: "asc" }]
    }),
    prisma.colaborador.findMany({
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        status: true
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.fornecedor.findMany({
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        codigo: true,
        razaoSocial: true,
        nomeFantasia: true,
        status: true
      },
      orderBy: [{ razaoSocial: "asc" }]
    })
  ]);

  return NextResponse.json({
    clientes,
    obras,
    servicos,
    materiais,
    equipamentos,
    colaboradores,
    fornecedores
  });
}
