import { Prisma, PrismaClient, StatusLancamento, StatusMedicao, TipoMedicao } from "@prisma/client";
import type { MedicaoCreateInput, MedicaoPreviewInput } from "@/lib/validators/medicao";
import { canTransitionMedicao } from "@/lib/utils/medicao-status";
import { medicaoDetailInclude, medicaoListInclude, medicaoTransitionInclude } from "@/server/services/medicoes/queries";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function buildCodigoMedicao(db: DbClient) {
  const rows = await db.$queryRaw<Array<{ maxNumero: number | null }>>(
    Prisma.sql`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING("codigoMedicao" FROM 'MED-([0-9]+)$') AS INTEGER)),
        0
      ) AS "maxNumero"
      FROM "Medicao"
      WHERE "codigoMedicao" ~ '^MED-[0-9]+$'
        AND "deletedAt" IS NULL
    `
  );

  const maxNumero = Number(rows[0]?.maxNumero ?? 0);
  return `MED-${String(maxNumero + 1).padStart(3, "0")}`;
}

export async function listarMedicoes(
  db: DbClient,
  filters: {
    clienteId?: string;
    obraId?: string;
    status?: string | null;
    tipoMedicao?: string | null;
    periodoInicial?: string | null;
    periodoFinal?: string | null;
  }
) {
  const statusFilter =
    filters.status && Object.values(StatusMedicao).includes(filters.status as StatusMedicao)
      ? (filters.status as StatusMedicao)
      : undefined;

  const tipoFilter =
    filters.tipoMedicao &&
    Object.values(TipoMedicao).includes(filters.tipoMedicao as TipoMedicao)
      ? (filters.tipoMedicao as TipoMedicao)
      : undefined;

  const where: Prisma.MedicaoWhereInput = {
    deletedAt: null,
    clienteId: filters.clienteId || undefined,
    obraId: filters.obraId || undefined,
    status: statusFilter,
    tipoMedicao: tipoFilter,
    periodoInicial:
      filters.periodoInicial || filters.periodoFinal
        ? {
            gte: filters.periodoInicial ? startOfDay(filters.periodoInicial) : undefined,
            lte: filters.periodoFinal ? endOfDay(filters.periodoFinal) : undefined
          }
        : undefined
  };

  return db.medicao.findMany({ where, include: medicaoListInclude, orderBy: [{ createdAt: "desc" }] });
}

export async function buscarLancamentosElegiveis(
  db: DbClient,
  input: MedicaoPreviewInput
) {
  return db.lancamentoDiario.findMany({
    where: {
      clienteId: input.clienteId,
      obraId: input.obraId ?? undefined,
      data: {
        gte: startOfDay(input.periodoInicial),
        lte: endOfDay(input.periodoFinal)
      },
      statusValidacao: StatusLancamento.VALIDO,
      deletedAt: null,
      medicaoItens: {
        none: {
          deletedAt: null
        }
      }
    },
    include: {
      ficha: true,
      cliente: true,
      obra: true,
      servico: true,
      material: true,
      equipamento: true,
      colaborador: true
    },
    orderBy: [{ data: "asc" }, { createdAt: "asc" }]
  });
}

export function resumirLancamentos(
  items: Array<{
    quantidadeFaturada: Prisma.Decimal | string | number;
    unidadeFaturada: string;
  }>
) {
  return items.reduce(
    (acc, item) => {
      const quantidade = Number(item.quantidadeFaturada);
      acc.totalLancamentos += 1;
      acc.quantidadeTotal += quantidade;
      acc.totaisPorUnidade[item.unidadeFaturada] =
        (acc.totaisPorUnidade[item.unidadeFaturada] ?? 0) + quantidade;
      return acc;
    },
    {
      totalLancamentos: 0,
      quantidadeTotal: 0,
      totaisPorUnidade: {} as Record<string, number>
    }
  );
}

export async function criarMedicao(
  db: DbClient,
  params: {
    input: MedicaoCreateInput;
    userId: string;
  }
) {
  const { input, userId } = params;
  const periodoInicial = startOfDay(input.periodoInicial);
  const periodoFinal = endOfDay(input.periodoFinal);
  const eligibleItems = await buscarLancamentosElegiveis(db, input);

  if (eligibleItems.length === 0) {
    throw new Error("Nao ha lancamentos validos para gerar a medicao nesse filtro.");
  }

  const valorPorLancamento = new Map(
    input.itens.map((item) => [item.lancamentoId, item.valorUnitario])
  );
  const eligibleIds = new Set(eligibleItems.map((item) => item.id));

  if (valorPorLancamento.size !== input.itens.length) {
    throw new Error("VALOR_UNITARIO_DUPLICADO");
  }

  if (input.itens.some((item) => !eligibleIds.has(item.lancamentoId))) {
    throw new Error("ITEM_MEDICAO_INVALIDO");
  }

  if (eligibleItems.some((item) => !valorPorLancamento.has(item.id))) {
    throw new Error("VALOR_UNITARIO_OBRIGATORIO");
  }

  const itensMedicao = eligibleItems.map((item) => {
    const valorUnitario = valorPorLancamento.get(item.id);

    if (valorUnitario === undefined || Number.isNaN(valorUnitario) || valorUnitario < 0) {
      throw new Error("VALOR_UNITARIO_INVALIDO");
    }

    return {
      item,
      valorUnitario,
      valorTotalItem: Number(item.quantidadeFaturada) * valorUnitario
    };
  });

  const valorTotal = itensMedicao.reduce((acc, current) => acc + current.valorTotalItem, 0);

  const now = new Date();
  let created: { id: string } | null = null;
  let createError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const codigoMedicao = await buildCodigoMedicao(db);
      created = await db.medicao.create({
        data: {
          codigoMedicao,
          tipoMedicao: input.tipoMedicao,
          clienteId: input.clienteId,
          obraId: input.obraId ?? null,
          periodoInicial,
          periodoFinal,
          observacao: input.observacao || null,
          valorTotal,
          fechadoPorId: userId,
          fechadoEm: now,
          status: "EM_ABERTO"
        }
      });
      createError = null;
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        createError = error;
        continue;
      }

      throw error;
    }
  }

  if (!created || createError) {
    throw createError ?? new Error("CODIGO_MEDICAO_NAO_GERADO");
  }

  for (const medicaoItem of itensMedicao) {
    await db.medicaoItem.create({
      data: {
        medicaoId: created.id,
        lancamentoId: medicaoItem.item.id,
        data: medicaoItem.item.data,
        ficha: medicaoItem.item.ficha.numero,
        placaOuTag: medicaoItem.item.equipamento.placaOuTag,
        tipoServico: medicaoItem.item.servico.tipoServico,
        material: medicaoItem.item.material?.descricao ?? null,
        unidadeFaturada: medicaoItem.item.unidadeFaturada,
        quantidadeFaturada: medicaoItem.item.quantidadeFaturada,
        valorUnitario: medicaoItem.valorUnitario,
        valorTotalItem: medicaoItem.valorTotalItem,
        origem: medicaoItem.item.origem
      }
    });

    await db.lancamentoDiario.update({
      where: { id: medicaoItem.item.id },
      data: { statusValidacao: "MEDIDO" }
    });
  }

  return db.medicao.findUniqueOrThrow({
    where: { id: created.id },
    include: medicaoListInclude
  });
}

export async function buscarDetalheMedicao(db: DbClient, id: string) {
  return db.medicao.findFirst({
    where: {
      id,
      deletedAt: null
    },
    include: medicaoDetailInclude
  });
}

export async function atualizarValorItemMedicao(
  db: DbClient,
  params: {
    medicaoId: string;
    itemId: string;
    valorUnitario: number;
    quantidadeFaturada?: number;
    unidadeFaturada?: "CARGA" | "HORA" | "M3" | "DIARIA";
  }
) {
  const item = await db.medicaoItem.findFirst({
    where: {
      id: params.itemId,
      medicaoId: params.medicaoId,
      deletedAt: null,
      medicao: {
        deletedAt: null
      }
    }
  });

  if (!item) {
    throw new Error("ITEM_MEDICAO_NAO_ENCONTRADO");
  }

  const quantidadeFaturada = params.quantidadeFaturada ?? Number(item.quantidadeFaturada);
  const valorTotalItem = quantidadeFaturada * params.valorUnitario;

  await db.medicaoItem.update({
    where: { id: item.id },
    data: {
      quantidadeFaturada,
      unidadeFaturada: params.unidadeFaturada ?? item.unidadeFaturada,
      valorUnitario: params.valorUnitario,
      valorTotalItem
    }
  });

  await db.lancamentoDiario.update({
    where: { id: item.lancamentoId },
    data: {
      quantidadeFaturada,
      unidadeFaturada: params.unidadeFaturada ?? item.unidadeFaturada
    }
  });

  const itens = await db.medicaoItem.findMany({
    where: {
      medicaoId: params.medicaoId,
      deletedAt: null
    },
    select: { valorTotalItem: true }
  });

  const valorTotal = itens.reduce((acc, current) => acc + Number(current.valorTotalItem), 0);

  await db.medicao.update({
    where: { id: params.medicaoId },
    data: { valorTotal }
  });

  return buscarDetalheMedicao(db, params.medicaoId);
}

export async function atualizarObservacaoMedicao(
  db: DbClient,
  params: {
    id: string;
    observacao: string | null;
    observacaoInterna: string | null;
    descontoValor: number;
  }
) {
  const medicao = await db.medicao.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!medicao) {
    throw new Error("MEDICAO_NAO_ENCONTRADA");
  }

  await db.medicao.update({
    where: { id: params.id },
    data: {
      observacao: params.observacao,
      observacaoInterna: params.observacaoInterna,
      descontoValor: params.descontoValor
    }
  });

  return buscarDetalheMedicao(db, params.id);
}

export async function atualizarStatusMedicao(
  db: DbClient,
  params: {
    id: string;
    status: StatusMedicao;
    userId: string;
  }
) {
  const medicao = await db.medicao.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    include: medicaoTransitionInclude
  });

  if (!medicao) {
    throw new Error("MEDICAO_NAO_ENCONTRADA");
  }

  if (!canTransitionMedicao(medicao, params.status)) {
    throw new Error("TRANSICAO_INVALIDA");
  }

  const now = new Date();

  return db.medicao.update({
    where: { id: params.id },
    data: {
      status: params.status,
      enviadaAoClienteEm:
        params.status === "ENVIADA_AO_CLIENTE"
          ? medicao.enviadaAoClienteEm ?? now
          : medicao.enviadaAoClienteEm,
      enviadaParaFaturamentoEm:
        params.status === "ENVIADA_PARA_FATURAMENTO"
          ? medicao.enviadaParaFaturamentoEm ?? now
          : medicao.enviadaParaFaturamentoEm,
      fechadoPorId: medicao.fechadoPorId ?? params.userId,
      fechadoEm:
        params.status === "CONCLUIDA"
          ? medicao.fechadoEm ?? now
          : medicao.fechadoEm
    },
    include: medicaoListInclude
  });
}

export async function excluirMedicao(
  db: DbClient,
  params: {
    id: string;
  }
) {
  const medicao = await db.medicao.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    include: {
      itens: {
        where: {
          deletedAt: null
        },
        select: {
          id: true,
          lancamentoId: true
        }
      }
    }
  });

  if (!medicao) {
    throw new Error("MEDICAO_NAO_ENCONTRADA");
  }

  if (medicao.tipoMedicao === TipoMedicao.MENSAL) {
    throw new Error("MEDICAO_MENSAL_NAO_PODE_EXCLUIR");
  }

  const deletedAt = new Date();

  if (medicao.itens.length > 0) {
    await db.medicaoItem.updateMany({
      where: {
        medicaoId: medicao.id,
        deletedAt: null
      },
      data: {
        deletedAt
      }
    });

    await db.lancamentoDiario.updateMany({
      where: {
        id: {
          in: medicao.itens.map((item) => item.lancamentoId)
        },
        deletedAt: null,
        statusValidacao: StatusLancamento.MEDIDO
      },
      data: {
        statusValidacao: StatusLancamento.VALIDO
      }
    });
  }

  return db.medicao.update({
    where: { id: medicao.id },
    data: {
      deletedAt
    },
    include: medicaoListInclude
  });
}
