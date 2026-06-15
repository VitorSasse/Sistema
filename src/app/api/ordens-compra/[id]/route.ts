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
  centroCusto: {
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true
    }
  },
  criadoPor: {
    select: {
      id: true,
      nome: true
    }
  },
  itens: {
    include: {
      catalogoCompra: {
        select: {
          id: true,
          codigo: true,
          tipo: true,
          descricao: true,
          unidadePadrao: true,
          status: true
        }
      }
    },
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

  const centroCusto = await prisma.centroCustoCompra.findUnique({
    where: { id: parsed.data.centroCustoId },
    select: {
      id: true,
      nome: true,
      status: true
    }
  });

  if (!centroCusto) {
    return NextResponse.json({ message: "Centro de custo nao encontrado." }, { status: 404 });
  }

  const catalogoIds = parsed.data.itens
    .map((item) => item.catalogoCompraId || null)
    .filter((value): value is string => Boolean(value));

  const catalogos = catalogoIds.length
    ? await prisma.catalogoCompra.findMany({
        where: {
          id: { in: catalogoIds }
        },
        select: {
          id: true,
          codigo: true,
          tipo: true,
          descricao: true,
          unidadePadrao: true,
          status: true
        }
      })
    : [];

  const catalogoMap = new Map(catalogos.map((item) => [item.id, item]));

  try {
    const itensCalculados = parsed.data.itens.map((item) => {
      const catalogo = item.catalogoCompraId ? catalogoMap.get(item.catalogoCompraId) : null;

      if (item.catalogoCompraId && !catalogo) {
        throw new Error(`CATALOGO_NAO_ENCONTRADO:${item.catalogoCompraId}`);
      }

      if (catalogo && catalogo.tipo !== parsed.data.tipoCompra) {
        throw new Error(`TIPO_CATALOGO_INVALIDO:${catalogo.id}`);
      }

      const subtotal = calcularSubtotalItem({
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario
      });

      return {
        catalogoCompraId: catalogo?.id ?? null,
        tipoItem: parsed.data.tipoCompra,
        item: item.item,
        codigo: catalogo?.codigo ?? (item.codigo || null),
        descricao: catalogo?.descricao ?? item.descricao,
        unidade: catalogo?.unidadePadrao ?? item.unidade,
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
          tipoCompra: parsed.data.tipoCompra,
          fornecedorId: parsed.data.fornecedorId,
          centroCustoId: parsed.data.centroCustoId,
          centroCustoTipo: "SETOR",
          centroCustoNome: centroCusto.nome,
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
    if (error instanceof Error && error.message.startsWith("CATALOGO_NAO_ENCONTRADO")) {
      return NextResponse.json(
        { message: "Um dos itens selecionados no catalogo nao foi encontrado." },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.startsWith("TIPO_CATALOGO_INVALIDO")) {
      return NextResponse.json(
        { message: "Existe item selecionado com tipo diferente do tipo da compra." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar a ordem de compra.", detail: String(error) },
      { status: 409 }
    );
  }
}
