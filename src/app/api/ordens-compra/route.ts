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
  centroCustoEquipamento: {
    select: {
      id: true,
      placaOuTag: true,
      descricao: true
    }
  },
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

  let centroCustoNome = parsed.data.centroCustoNome;

  if (parsed.data.centroCustoTipo === "EQUIPAMENTO") {
    const equipamentoId = parsed.data.centroCustoEquipamentoId || null;

    if (!equipamentoId) {
      return NextResponse.json(
        { message: "Selecione o equipamento do centro de custo." },
        { status: 400 }
      );
    }

    const equipamento = await prisma.equipamento.findUnique({
      where: { id: equipamentoId },
      select: {
        id: true,
        placaOuTag: true,
        descricao: true
      }
    });

    if (!equipamento) {
      return NextResponse.json(
        { message: "Equipamento do centro de custo nao encontrado." },
        { status: 404 }
      );
    }

    centroCustoNome = `${equipamento.placaOuTag} - ${equipamento.descricao}`;
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
    const numeroOrdem = await generateOrdemCompraCode();

    const ordemCompra = await prisma.ordemCompra.create({
      data: {
        numeroOrdem,
        dataEmissao,
        status: parsed.data.status,
        fornecedorId: parsed.data.fornecedorId,
        centroCustoTipo: parsed.data.centroCustoTipo,
        centroCustoNome,
        centroCustoEquipamentoId:
          parsed.data.centroCustoTipo === "EQUIPAMENTO"
            ? parsed.data.centroCustoEquipamentoId || null
            : null,
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
    return NextResponse.json(
      { message: "Nao foi possivel criar a ordem de compra.", detail: String(error) },
      { status: 409 }
    );
  }
}
