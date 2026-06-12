import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calcularSubtotalItem, calcularTotalOrdem, gerarParcelasOrdemCompra } from "@/lib/ordens-compra";
import { prisma } from "@/lib/prisma";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { ordemCompraSchema } from "@/lib/validators/ordem-compra";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function normalizePayload(payload: Record<string, unknown>) {
  const itens = Array.isArray(payload.itens) ? payload.itens : [];

  return {
    ...payload,
    numeroParcelas: Number(payload.numeroParcelas ?? 1),
    itens: itens.map((item) => {
      const current = item as Record<string, unknown>;

      return {
        ...current,
        quantidade: parseDecimalInput(current.quantidade),
        valorUnitario: parseDecimalInput(current.valorUnitario)
      };
    })
  };
}

const ordemCompraInclude = {
  fornecedor: true,
  criadoPor: {
    select: {
      id: true,
      nome: true
    }
  },
  itens: {
    orderBy: [{ createdAt: "asc" as const }]
  },
  parcelas: {
    orderBy: [{ numeroParcela: "asc" as const }]
  }
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = normalizePayload((await request.json()) as Record<string, unknown>);
  const parsed = ordemCompraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ordemAtual = await prisma.ordemCompra.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!ordemAtual) {
    return NextResponse.json({ message: "Ordem de compra nao encontrada." }, { status: 404 });
  }

  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: parsed.data.fornecedorId },
    select: { id: true }
  });

  if (!fornecedor) {
    return NextResponse.json({ message: "Fornecedor nao encontrado." }, { status: 404 });
  }

  const itensCalculados = parsed.data.itens.map((item) => {
    const subtotal = calcularSubtotalItem({
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario
    });

    return {
      item: item.item,
      codigo: item.codigo || null,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      subtotal
    };
  });

  const valorTotal = calcularTotalOrdem(itensCalculados);
  const dataEmissao = parseDateInput(parsed.data.dataEmissao);
  const dataBaseParcelas = parsed.data.primeiroVencimento
    ? parseDateInput(parsed.data.primeiroVencimento)
    : dataEmissao;
  const parcelas = gerarParcelasOrdemCompra({
    valorTotal,
    numeroParcelas: parsed.data.numeroParcelas,
    dataBase: dataBaseParcelas
  });

  try {
    await prisma.$transaction([
      prisma.ordemCompraItem.deleteMany({
        where: { ordemCompraId: id }
      }),
      prisma.ordemCompraParcela.deleteMany({
        where: { ordemCompraId: id }
      }),
      prisma.ordemCompra.update({
        where: { id },
        data: {
          dataEmissao,
          status: parsed.data.status,
          fornecedorId: parsed.data.fornecedorId,
          centroCustoTipo: "SETOR",
          centroCustoNome: parsed.data.centroCustoNome.trim(),
          centroCustoEquipamentoId: null,
          formaPagamento: parsed.data.formaPagamento || null,
          numeroParcelas: parsed.data.numeroParcelas,
          primeiroVencimento: dataBaseParcelas,
          observacaoFinanceira: parsed.data.observacaoFinanceira || null,
          observacao: parsed.data.observacao || null,
          valorTotal,
          itens: {
            create: itensCalculados
          },
          parcelas: {
            create: parcelas.map((parcela) => ({
              numeroParcela: parcela.numeroParcela,
              dataVencimento: parcela.dataVencimento,
              valorParcela: parcela.valorParcela
            }))
          }
        }
      })
    ]);

    const ordemCompra = await prisma.ordemCompra.findUnique({
      where: { id },
      include: ordemCompraInclude
    });

    return NextResponse.json(ordemCompra);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar a ordem de compra.", detail: String(error) },
      { status: 409 }
    );
  }
}
