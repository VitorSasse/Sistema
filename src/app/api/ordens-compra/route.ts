import { Prisma, StatusOrdemCompra, TipoCatalogoCompra } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calcularSubtotalItem, calcularTotalOrdem, gerarParcelasOrdemCompra } from "@/lib/ordens-compra";
import { normalizarPagamentoOrdemCompra } from "@/lib/ordens-compra-pagamento";
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
  planoConta: {
    select: {
      id: true,
      classificacao: true,
      nome: true,
      tipo: true,
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
          valorPadrao: true,
          status: true
        }
      }
    },
    orderBy: [{ createdAt: "asc" as const }]
  },
  parcelas: {
    orderBy: [{ numeroParcela: "asc" as const }]
  },
  anexos: {
    orderBy: [{ createdAt: "desc" as const }]
  }
};

function parseDateQuery(value: string | null, endOfDay = false) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const date = parseDateInput(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function buildStatusFilter(statusParam: string): Prisma.OrdemCompraWhereInput["status"] | null {
  if (!statusParam || statusParam === "TODOS") {
    return null;
  }

  if (statusParam === "COMPRADA") {
    return {
      in: [
        StatusOrdemCompra.AGUARDANDO_APROVACAO,
        StatusOrdemCompra.APROVADA,
        StatusOrdemCompra.COMPRADA
      ]
    };
  }

  if (Object.values(StatusOrdemCompra).includes(statusParam as StatusOrdemCompra)) {
    return statusParam as StatusOrdemCompra;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const fornecedorId = searchParams.get("fornecedorId")?.trim() ?? "";
  const centroCustoId = searchParams.get("centroCustoId")?.trim() ?? "";
  const statusParam = searchParams.get("status")?.trim() ?? "";
  const tipoCompraParam = searchParams.get("tipoCompra")?.trim() ?? "";
  const dataInicial = parseDateQuery(searchParams.get("dataInicial"));
  const dataFinal = parseDateQuery(searchParams.get("dataFinal"), true);

  const where: Prisma.OrdemCompraWhereInput = {};

  if (fornecedorId) {
    where.fornecedorId = fornecedorId;
  }

  if (centroCustoId) {
    where.centroCustoId = centroCustoId;
  }

  const statusFilter = buildStatusFilter(statusParam);

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (
    tipoCompraParam &&
    tipoCompraParam !== "TODOS" &&
    Object.values(TipoCatalogoCompra).includes(tipoCompraParam as TipoCatalogoCompra)
  ) {
    where.tipoCompra = tipoCompraParam as TipoCatalogoCompra;
  }

  if (dataInicial || dataFinal) {
    const filtroData: Prisma.DateTimeFilter = {};

    if (dataInicial) {
      filtroData.gte = dataInicial;
    }

    if (dataFinal) {
      filtroData.lte = dataFinal;
    }

    where.dataEmissao = filtroData;
  }

  if (search) {
    where.OR = [
      { numeroOrdem: { contains: search, mode: "insensitive" } },
      { centroCustoNome: { contains: search, mode: "insensitive" } },
      { observacao: { contains: search, mode: "insensitive" } },
      { observacaoFinanceira: { contains: search, mode: "insensitive" } },
      {
        planoConta: {
          OR: [
            { classificacao: { contains: search, mode: "insensitive" } },
            { nome: { contains: search, mode: "insensitive" } }
          ]
        }
      },
      {
        fornecedor: {
          OR: [
            { razaoSocial: { contains: search, mode: "insensitive" } },
            { nomeFantasia: { contains: search, mode: "insensitive" } },
            { codigo: { contains: search, mode: "insensitive" } },
            { cnpj: { contains: search, mode: "insensitive" } }
          ]
        }
      },
      {
        itens: {
          some: {
            OR: [
              { descricao: { contains: search, mode: "insensitive" } },
              { item: { contains: search, mode: "insensitive" } },
              { codigo: { contains: search, mode: "insensitive" } }
            ]
          }
        }
      }
    ];
  }

  const items = await prisma.ordemCompra.findMany({
    where,
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

  const planoConta = await prisma.planoConta.findUnique({
    where: { id: parsed.data.planoContaId },
    select: {
      id: true,
      tipo: true
    }
  });

  if (!planoConta) {
    return NextResponse.json({ message: "Plano de conta nao encontrado." }, { status: 404 });
  }

  if (planoConta.tipo !== "DESPESA") {
    return NextResponse.json(
      { message: "A ordem de compra deve utilizar um plano de conta do tipo despesa." },
      { status: 409 }
    );
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
          valorPadrao: true,
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
    const pagamentoNormalizado = normalizarPagamentoOrdemCompra({
      formaPagamento: parsed.data.formaPagamento,
      numeroParcelas: parsed.data.numeroParcelas,
      dataEmissao,
      primeiroVencimento: parsed.data.primeiroVencimento
        ? parseDateInput(parsed.data.primeiroVencimento)
        : null
    });
    const dataBaseParcelas = pagamentoNormalizado.primeiroVencimento;
    const parcelas = gerarParcelasOrdemCompra({
      valorTotal,
      numeroParcelas: pagamentoNormalizado.numeroParcelas,
      dataBase: dataBaseParcelas
    });

    const numeroOrdem = await generateOrdemCompraCode(parsed.data.tipoCompra);

    const ordemCompra = await prisma.ordemCompra.create({
      data: {
        numeroOrdem,
        dataEmissao,
        status: parsed.data.status,
        tipoCompra: parsed.data.tipoCompra,
        fornecedorId: parsed.data.fornecedorId,
        centroCustoId: parsed.data.centroCustoId,
        planoContaId: parsed.data.planoContaId,
        centroCustoTipo: "SETOR",
        centroCustoNome: centroCusto.nome,
        centroCustoEquipamentoId: null,
        formaPagamento: parsed.data.formaPagamento || null,
        numeroParcelas: pagamentoNormalizado.numeroParcelas,
        primeiroVencimento: dataBaseParcelas,
        observacaoFinanceira: parsed.data.observacaoFinanceira || null,
        observacao: parsed.data.observacao || null,
        motivoExclusao: parsed.data.status === "CANCELADA" ? parsed.data.motivoExclusao || null : null,
        excluidaEm: parsed.data.status === "CANCELADA" ? new Date() : null,
        excluidaPorNome: parsed.data.status === "CANCELADA" ? session.user.name ?? session.user.email ?? "Usuario" : null,
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
