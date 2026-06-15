import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calcularSubtotalItem, calcularTotalOrdem, gerarParcelasOrdemCompra } from "@/lib/ordens-compra";
import { prisma } from "@/lib/prisma";
import { generateOrdemCompraCode } from "@/lib/utils/code-generation";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { ordemCompraSchema } from "@/lib/validators/ordem-compra";

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

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.ordemCompra.findMany({
    include: ordemCompraInclude,
    orderBy: [{ dataEmissao: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = normalizePayload((await request.json()) as Record<string, unknown>);
  const parsed = ordemCompraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: parsed.data.fornecedorId },
    select: { id: true, status: true }
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

    const numeroOrdem = await generateOrdemCompraCode();

    const ordemCompra = await prisma.ordemCompra.create({
      data: {
        numeroOrdem,
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
        criadoPorId: session.user.id,
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
      },
      include: ordemCompraInclude
    });

    return NextResponse.json(ordemCompra, { status: 201 });
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
      { message: "Nao foi possivel criar a ordem de compra.", detail: String(error) },
      { status: 409 }
    );
  }
}
