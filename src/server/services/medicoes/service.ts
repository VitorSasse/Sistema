import { Prisma, PrismaClient, StatusLancamento, StatusMedicao, TipoMedicao } from "@prisma/client";
import type { MedicaoCreateInput, MedicaoPreviewInput } from "@/lib/validators/medicao";
import { canEditMedicaoContent, canTransitionMedicao } from "@/lib/utils/medicao-status";
import { medicaoDetailInclude, medicaoListInclude, medicaoTransitionInclude } from "@/server/services/medicoes/queries";

type DbClient = PrismaClient | Prisma.TransactionClient;
type LancamentoElegivel = Prisma.LancamentoDiarioGetPayload<{
  include: {
    ficha: true;
    cliente: true;
    obra: true;
    servico: true;
    material: true;
    equipamento: true;
    colaborador: true;
  };
}>;

type MedicaoEditavelSnapshot = {
  id: string;
  clienteId: string;
  obraId: string | null;
  tipoMedicao: TipoMedicao;
  periodoInicial: Date;
  periodoFinal: Date;
  observacao: string | null;
  status: StatusMedicao;
  itens: Array<{
    id: string;
    tipoServico: string;
    material: string | null;
    unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO";
    valorUnitario: Prisma.Decimal;
  }>;
};

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
  const rows = await db.$queryRaw<Array<{ numero: number }>>(
    Prisma.sql`
      WITH numeros AS (
        SELECT CAST(SUBSTRING("codigoMedicao" FROM 'MED-([0-9]+)$') AS INTEGER) AS numero
        FROM "Medicao"
        WHERE "codigoMedicao" ~ '^MED-[0-9]+$'
          AND "deletedAt" IS NULL
      ),
      candidatos AS (
        SELECT 1 AS numero
        UNION
        SELECT numero + 1
        FROM numeros
      )
      SELECT COALESCE(MIN(candidatos.numero), 1) AS numero
      FROM candidatos
      LEFT JOIN numeros ON numeros.numero = candidatos.numero
      WHERE numeros.numero IS NULL
    `
  );
  const nextNumero = Number(rows[0]?.numero ?? 1);
  return `MED-${String(nextNumero).padStart(3, "0")}`;
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
    numeroPedido?: string | null;
    numeroNotaFiscal?: string | null;
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
    numeroPedido: filters.numeroPedido
      ? {
          contains: filters.numeroPedido.trim(),
          mode: "insensitive"
        }
      : undefined,
    numeroNotaFiscal: filters.numeroNotaFiscal
      ? {
          contains: filters.numeroNotaFiscal.trim(),
          mode: "insensitive"
        }
      : undefined
  };

  if (filters.periodoInicial || filters.periodoFinal) {
    const rows = await db.$queryRaw<Array<{ medicaoId: string }>>(
      Prisma.sql`
        SELECT item."medicaoId"
        FROM "MedicaoItem" item
        INNER JOIN "Medicao" medicao ON medicao.id = item."medicaoId"
        WHERE item."deletedAt" IS NULL
          AND medicao."deletedAt" IS NULL
        GROUP BY item."medicaoId"
        HAVING MAX(item."data") >= ${filters.periodoInicial ? startOfDay(filters.periodoInicial) : new Date("1900-01-01T00:00:00.000Z")}
           AND MAX(item."data") <= ${filters.periodoFinal ? endOfDay(filters.periodoFinal) : new Date("2999-12-31T23:59:59.999Z")}
      `
    );

    where.id = {
      in: rows.map((row) => row.medicaoId)
    };
  }

  return db.medicao.findMany({
    where,
    include: medicaoListInclude,
    orderBy: [{ periodoFinal: "desc" }, { createdAt: "desc" }]
  });
}

export async function buscarLancamentosElegiveis(
  db: DbClient,
  input: MedicaoPreviewInput
) {
  const items = await db.lancamentoDiario.findMany({
    where: {
      clienteId: input.clienteId,
      obraId: input.obraId ?? undefined,
      data: {
        gte: startOfDay(input.periodoInicial),
        lte: endOfDay(input.periodoFinal)
      },
      statusValidacao: {
        in: [StatusLancamento.NAO_MEDIDO, StatusLancamento.VALIDO]
      },
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
    orderBy: [{ data: "desc" }, { createdAt: "desc" }]
  });

  return normalizeLancamentosParaMedicao(items, input.cobrancaMaterial);
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

function shouldConvertLancamentoToM3(
  item: Pick<LancamentoElegivel, "materialId" | "unidadeFaturada" | "equipamento">
) {
  return (
    item.materialId !== null &&
    item.unidadeFaturada === "CARGA" &&
    (item.equipamento.tipoRecurso === "CAMINHAO" ||
      item.equipamento.tipoRecurso === "CARRETA")
  );
}

function normalizeLancamentosParaMedicao(
  items: LancamentoElegivel[],
  cobrancaMaterial: MedicaoPreviewInput["cobrancaMaterial"]
) {
  if (cobrancaMaterial !== "M3") {
    return items;
  }

  const semCapacidade = items
    .filter((item) => shouldConvertLancamentoToM3(item))
    .filter((item) => Number(item.equipamento.capacidadeM3 ?? 0) <= 0);

  if (semCapacidade.length > 0) {
    const tags = Array.from(
      new Set(semCapacidade.map((item) => item.equipamento.placaOuTag))
    ).join(", ");

    throw new Error(`CAPACIDADE_M3_NAO_CONFIGURADA:${tags}`);
  }

  return items.map((item) => {
    if (!shouldConvertLancamentoToM3(item)) {
      return item;
    }

    const quantidadeFaturada = Number(item.quantidadeFaturada);
    const capacidadeM3 = Number(item.equipamento.capacidadeM3 ?? 0);

    return {
      ...item,
      quantidadeFaturada: new Prisma.Decimal(quantidadeFaturada * capacidadeM3),
      unidadeFaturada: "M3" as const
    };
  });
}

function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateLabel(value: Date) {
  const [year, month, day] = toInputDate(value).split("-");
  return `${day}/${month}/${year}`;
}

function inferCobrancaMaterialFromMedicao(
  medicao: Pick<MedicaoEditavelSnapshot, "itens">
): MedicaoPreviewInput["cobrancaMaterial"] {
  return medicao.itens.some(
    (item) => item.material !== null && item.unidadeFaturada === "M3"
  )
    ? "M3"
    : "CARGA";
}

async function buscarMedicaoEditavel(db: DbClient, id: string) {
  const medicao = await db.medicao.findFirst({
    where: {
      id,
      deletedAt: null
    },
    select: {
      id: true,
      clienteId: true,
      obraId: true,
      tipoMedicao: true,
      periodoInicial: true,
      periodoFinal: true,
      observacao: true,
      status: true,
      itens: {
        where: {
          deletedAt: null
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          tipoServico: true,
          material: true,
          unidadeFaturada: true,
          valorUnitario: true
        }
      }
    }
  });

  if (!medicao) {
    throw new Error("MEDICAO_NAO_ENCONTRADA");
  }

  if (!canEditMedicaoContent(medicao.status)) {
    throw new Error("MEDICAO_BLOQUEADA_PARA_EDICAO");
  }

  return medicao as MedicaoEditavelSnapshot;
}

function sugerirValorUnitarioParaLancamento(
  item: LancamentoElegivel,
  referencias: MedicaoEditavelSnapshot["itens"]
) {
  const material = item.material?.descricao ?? null;
  const referenciaExata = referencias.find(
    (referencia) =>
      referencia.tipoServico === item.servico.tipoServico &&
      referencia.material === material &&
      referencia.unidadeFaturada === item.unidadeFaturada
  );

  if (referenciaExata) {
    return Number(referenciaExata.valorUnitario);
  }

  const referenciaParcial = referencias.find(
    (referencia) =>
      referencia.tipoServico === item.servico.tipoServico &&
      referencia.unidadeFaturada === item.unidadeFaturada
  );

  if (referenciaParcial) {
    return Number(referenciaParcial.valorUnitario);
  }

  if (item.servico.faturamentoFechado && item.servico.valorFechadoPadrao !== null) {
    return Number(item.servico.valorFechadoPadrao);
  }

  return 0;
}

export async function buscarLancamentosElegiveisParaMedicao(
  db: DbClient,
  params: {
    medicaoId: string;
    cobrancaMaterial?: MedicaoPreviewInput["cobrancaMaterial"];
  }
) {
  const medicao = await buscarMedicaoEditavel(db, params.medicaoId);
  const cobrancaMaterial =
    params.cobrancaMaterial ?? inferCobrancaMaterialFromMedicao(medicao);
  const items = await buscarLancamentosElegiveis(db, {
    periodoInicial: toInputDate(medicao.periodoInicial),
    periodoFinal: toInputDate(medicao.periodoFinal),
    clienteId: medicao.clienteId,
    obraId: medicao.obraId,
    tipoMedicao: medicao.tipoMedicao,
    cobrancaMaterial,
    observacao: medicao.observacao ?? ""
  });

  return {
    cobrancaMaterial,
    items,
    resumo: resumirLancamentos(items)
  };
}

export async function adicionarLancamentosNaMedicao(
  db: DbClient,
  params: {
    medicaoId: string;
    lancamentoIds: string[];
    cobrancaMaterial?: MedicaoPreviewInput["cobrancaMaterial"];
  }
) {
  if (params.lancamentoIds.length === 0) {
    throw new Error("NENHUM_LANCAMENTO_SELECIONADO");
  }

  const medicao = await buscarMedicaoEditavel(db, params.medicaoId);
  const { items } = await buscarLancamentosElegiveisParaMedicao(db, {
    medicaoId: params.medicaoId,
    cobrancaMaterial: params.cobrancaMaterial
  });
  const selectedIds = new Set(params.lancamentoIds);
  const itensSelecionados = items.filter((item) => selectedIds.has(item.id));

  if (itensSelecionados.length !== selectedIds.size) {
    throw new Error("LANCAMENTOS_NAO_ELEGIVEIS");
  }

  const novosItens = itensSelecionados.map((item) => {
    const valorUnitario = sugerirValorUnitarioParaLancamento(item, medicao.itens);
    const valorTotalItem = Number(item.quantidadeFaturada) * valorUnitario;

    return {
      medicaoId: medicao.id,
      lancamentoId: item.id,
      data: item.data,
      ficha: item.ficha.numero,
      placaOuTag: item.equipamento.placaOuTag,
      tipoServico: item.servico.tipoServico,
      material: item.material?.descricao ?? null,
      unidadeFaturada: item.unidadeFaturada,
      quantidadeFaturada: item.quantidadeFaturada,
      m3SeAplicavel: item.unidadeFaturada === "M3" ? item.quantidadeFaturada : null,
      valorUnitario,
      valorTotalItem,
      origem: item.origem
    };
  });

  const valorTotalAdicionado = novosItens.reduce(
    (acc, item) => acc + Number(item.valorTotalItem),
    0
  );

  await db.medicaoItem.createMany({
    data: novosItens
  });

  await db.lancamentoDiario.updateMany({
    where: {
      id: {
        in: itensSelecionados.map((item) => item.id)
      }
    },
    data: {
      statusValidacao: StatusLancamento.MEDIDO
    }
  });

  await db.medicao.update({
    where: { id: medicao.id },
    data: {
      valorTotal: {
        increment: valorTotalAdicionado
      }
    }
  });

  return buscarDetalheMedicao(db, medicao.id);
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
          fechadoPorId: null,
          fechadoEm: null,
          status: "CRIADA"
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

  await db.medicaoItem.createMany({
    data: itensMedicao.map((medicaoItem) => ({
      medicaoId: created.id,
      lancamentoId: medicaoItem.item.id,
      data: medicaoItem.item.data,
      ficha: medicaoItem.item.ficha.numero,
      placaOuTag: medicaoItem.item.equipamento.placaOuTag,
      tipoServico: medicaoItem.item.servico.tipoServico,
      material: medicaoItem.item.material?.descricao ?? null,
      unidadeFaturada: medicaoItem.item.unidadeFaturada,
      quantidadeFaturada: medicaoItem.item.quantidadeFaturada,
      m3SeAplicavel:
        medicaoItem.item.unidadeFaturada === "M3"
          ? medicaoItem.item.quantidadeFaturada
          : null,
      valorUnitario: medicaoItem.valorUnitario,
      valorTotalItem: medicaoItem.valorTotalItem,
      origem: medicaoItem.item.origem
    }))
  });

  await db.lancamentoDiario.updateMany({
    where: {
      id: {
        in: itensMedicao.map((medicaoItem) => medicaoItem.item.id)
      }
    },
    data: { statusValidacao: "MEDIDO" }
  });

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
    unidadeFaturada?: "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO";
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
    },
    select: {
      id: true,
      lancamentoId: true,
      quantidadeFaturada: true,
      unidadeFaturada: true,
      valorTotalItem: true,
      medicao: {
        select: {
          status: true
        }
      }
    }
  });

  if (!item) {
    throw new Error("ITEM_MEDICAO_NAO_ENCONTRADO");
  }

  if (!canEditMedicaoContent(item.medicao.status)) {
    throw new Error("MEDICAO_BLOQUEADA_PARA_EDICAO");
  }

  const quantidadeFaturada = params.quantidadeFaturada ?? Number(item.quantidadeFaturada);
  const valorTotalItem = quantidadeFaturada * params.valorUnitario;
  const deltaValorTotal = Number((valorTotalItem - Number(item.valorTotalItem)).toFixed(2));

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

  await db.medicao.update({
    where: { id: params.medicaoId },
    data: {
      valorTotal: {
        increment: deltaValorTotal
      }
    }
  });

  return buscarDetalheMedicao(db, params.medicaoId);
}

export async function atualizarDadosMedicao(
  db: DbClient,
  params: {
    id: string;
    periodoInicial: string;
    periodoFinal: string;
    observacao: string | null;
    observacaoInterna: string | null;
    descontoValor: number;
    numeroPedido: string | null;
    numeroNotaFiscal: string | null;
  }
) {
  const medicao = await db.medicao.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    select: {
      id: true,
      status: true,
      periodoInicial: true,
      periodoFinal: true,
      itens: {
        where: {
          deletedAt: null
        },
        select: {
          data: true
        }
      }
    }
  });

  if (!medicao) {
    throw new Error("MEDICAO_NAO_ENCONTRADA");
  }

  if (!canEditMedicaoContent(medicao.status)) {
    throw new Error("MEDICAO_BLOQUEADA_PARA_EDICAO");
  }

  const periodoInicial = startOfDay(
    params.periodoInicial || toInputDate(medicao.periodoInicial)
  );
  const periodoFinal = endOfDay(
    params.periodoFinal || toInputDate(medicao.periodoFinal)
  );

  if (periodoFinal.getTime() < periodoInicial.getTime()) {
    throw new Error("PERIODO_INVALIDO");
  }

  if (medicao.itens.length > 0) {
    const menorDataItem = medicao.itens.reduce((current, item) =>
      item.data.getTime() < current.getTime() ? item.data : current
    , medicao.itens[0]!.data);
    const maiorDataItem = medicao.itens.reduce((current, item) =>
      item.data.getTime() > current.getTime() ? item.data : current
    , medicao.itens[0]!.data);

    if (
      periodoInicial.getTime() > menorDataItem.getTime() ||
      periodoFinal.getTime() < maiorDataItem.getTime()
    ) {
      throw new Error(
        `PERIODO_NAO_ABRANGE_ITENS:${formatDateLabel(menorDataItem)}:${formatDateLabel(maiorDataItem)}`
      );
    }
  }

  await db.medicao.update({
    where: { id: params.id },
    data: {
      periodoInicial,
      periodoFinal,
      observacao: params.observacao,
      observacaoInterna: params.observacaoInterna,
      descontoValor: params.descontoValor,
      numeroPedido: params.numeroPedido,
      numeroNotaFiscal: params.numeroNotaFiscal
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
    justificativaCancelamento?: string | null;
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

  if (params.status === "CANCELADA" && !params.justificativaCancelamento?.trim()) {
    throw new Error("JUSTIFICATIVA_CANCELAMENTO_OBRIGATORIA");
  }

  const now = new Date();

  if (params.status === "CANCELADA") {
    if (medicao.itens.length > 0) {
      await db.medicaoItem.updateMany({
        where: {
          medicaoId: medicao.id,
          deletedAt: null
        },
        data: {
          deletedAt: now
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
          statusValidacao: StatusLancamento.NAO_MEDIDO
        }
      });
    }
  }

  return db.medicao.update({
    where: { id: params.id },
    data: {
      status: params.status,
      justificativaCancelamento:
        params.status === "CANCELADA"
          ? params.justificativaCancelamento?.trim() ?? null
          : medicao.justificativaCancelamento,
      enviadaAoClienteEm:
        params.status === "ENVIADA_AO_CLIENTE"
          ? medicao.enviadaAoClienteEm ?? now
          : medicao.enviadaAoClienteEm,
      enviadaParaFaturamentoEm:
        params.status === "ENVIADA_PARA_FATURAMENTO"
          ? medicao.enviadaParaFaturamentoEm ?? now
          : medicao.enviadaParaFaturamentoEm,
      fechadoPorId:
        params.status === "CONCLUIDA"
          ? medicao.fechadoPorId ?? params.userId
          : medicao.fechadoPorId,
      fechadoEm:
        params.status === "CONCLUIDA"
          ? medicao.fechadoEm ?? now
          : medicao.fechadoEm,
      canceladaEm:
        params.status === "CANCELADA"
          ? medicao.canceladaEm ?? now
          : medicao.canceladaEm
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
        statusValidacao: StatusLancamento.NAO_MEDIDO
      }
    });
  }

  return db.medicao.update({
    where: { id: medicao.id },
    data: {
      deletedAt,
      codigoMedicao: `ARQ-${medicao.codigoMedicao}-${medicao.id.slice(0, 8)}`
    },
    include: medicaoListInclude
  });
}
