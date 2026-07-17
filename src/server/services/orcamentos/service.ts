import {
  CategoriaRecursoOrcamento,
  Prisma,
  PrismaClient,
  StatusCenarioOrcamento,
  StatusOrcamento,
  StatusPropostaComercial,
  TipoItemOrcamento,
  TipoOrcamento
} from "@prisma/client";
import { generateOrcamentoCode } from "@/lib/utils/code-generation";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { parseDateOnlyEnd, parseOptionalDateOnlyStart } from "@/lib/utils/date";
import type { OrcamentoInput } from "@/lib/validators/orcamento";
import {
  buildOrcamentoTotals,
  buildPricingSnapshot,
  calcularValorItem
} from "@/server/services/orcamentos/pricing";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const orcamentoInclude = {
  cliente: {
    select: {
      id: true,
      codigo: true,
      nome: true,
      nomeFantasia: true,
      cnpj: true,
      cpf: true,
      telefone: true,
      email: true
    }
  },
  obra: {
    select: {
      id: true,
      codigo: true,
      nome: true,
      contratoNumero: true,
      localidade: true,
      cidade: true,
      uf: true
    }
  },
  responsavel: {
    select: {
      id: true,
      nome: true,
      email: true
    }
  },
  criadoPor: {
    select: {
      id: true,
      nome: true,
      email: true
    }
  },
  formacaoPreco: true,
  cenarios: {
    orderBy: [{ ordem: "asc" as const }, { createdAt: "asc" as const }]
  },
  frentes: {
    include: {
      cenario: {
        select: {
          id: true,
          ordem: true,
          nome: true
        }
      }
    },
    orderBy: [{ ordem: "asc" as const }, { createdAt: "asc" as const }]
  },
  itens: {
    include: {
      frente: {
        select: {
          id: true,
          ordem: true,
          nome: true
        }
      },
      servico: {
        select: {
          id: true,
          codigo: true,
          tipoServico: true,
          categoria: true,
          unidadeFaturamento: true,
          status: true
        }
      },
      material: {
        select: {
          id: true,
          codigoMaterial: true,
          descricao: true,
          unidadePadrao: true,
          status: true
        }
      },
      fornecedorPreferencial: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true
        }
      },
      equipamento: {
        select: {
          id: true,
          placaOuTag: true,
          descricao: true,
          tipoRecurso: true,
          classeOperacional: true,
          capacidadeM3: true,
          unidadeCapacidade: true,
          unidadeEconomicaPadrao: true,
          caracteristicasTecnicas: true,
          status: true
        }
      }
    },
    orderBy: [{ ordem: "asc" as const }, { createdAt: "asc" as const }]
  },
  premissas: {
    orderBy: [{ tipo: "asc" as const }, { ordem: "asc" as const }, { createdAt: "asc" as const }]
  },
  propostas: {
    include: {
      cenario: {
        select: {
          id: true,
          ordem: true,
          nome: true
        }
      },
      opcionais: {
        orderBy: [{ ordem: "asc" as const }, { createdAt: "asc" as const }]
      }
    },
    orderBy: [{ revisao: "asc" as const }, { createdAt: "asc" as const }]
  }
} satisfies Prisma.OrcamentoInclude;

export const orcamentoListInclude = {
  cliente: {
    select: {
      id: true,
      codigo: true,
      nome: true,
      nomeFantasia: true
    }
  },
  obra: {
    select: {
      id: true,
      codigo: true,
      nome: true
    }
  },
  responsavel: {
    select: {
      id: true,
      nome: true
    }
  }
} satisfies Prisma.OrcamentoInclude;

export type OrcamentoDetalhe = Prisma.OrcamentoGetPayload<{
  include: typeof orcamentoInclude;
}>;

function parseDateInput(value?: string | null) {
  return parseOptionalDateOnlyStart(value);
}

function endOfDay(value?: string | null) {
  return value?.trim() ? parseDateOnlyEnd(value) : null;
}

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

const statusTransitions: Record<StatusOrcamento, StatusOrcamento[]> = {
  [StatusOrcamento.RASCUNHO]: [StatusOrcamento.EM_ELABORACAO, StatusOrcamento.ARQUIVADO],
  [StatusOrcamento.EM_ELABORACAO]: [
    StatusOrcamento.RASCUNHO,
    StatusOrcamento.EM_REVISAO,
    StatusOrcamento.ARQUIVADO
  ],
  [StatusOrcamento.EM_REVISAO]: [
    StatusOrcamento.EM_ELABORACAO,
    StatusOrcamento.PRONTO_PARA_PROPOSTA,
    StatusOrcamento.ARQUIVADO
  ],
  [StatusOrcamento.PRONTO_PARA_PROPOSTA]: [
    StatusOrcamento.EM_REVISAO,
    StatusOrcamento.PROPOSTA_EMITIDA,
    StatusOrcamento.ARQUIVADO
  ],
  [StatusOrcamento.PROPOSTA_EMITIDA]: [
    StatusOrcamento.EM_NEGOCIACAO,
    StatusOrcamento.APROVADO,
    StatusOrcamento.REPROVADO,
    StatusOrcamento.ARQUIVADO
  ],
  [StatusOrcamento.EM_NEGOCIACAO]: [
    StatusOrcamento.EM_REVISAO,
    StatusOrcamento.APROVADO,
    StatusOrcamento.REPROVADO,
    StatusOrcamento.ARQUIVADO
  ],
  [StatusOrcamento.APROVADO]: [StatusOrcamento.ARQUIVADO],
  [StatusOrcamento.REPROVADO]: [StatusOrcamento.EM_REVISAO, StatusOrcamento.ARQUIVADO],
  [StatusOrcamento.ARQUIVADO]: []
};

function validarTransicaoStatus(atual: StatusOrcamento, proximo: StatusOrcamento) {
  if (atual === proximo) {
    return;
  }

  if (!statusTransitions[atual].includes(proximo)) {
    throw new Error("TRANSICAO_STATUS_INVALIDA");
  }
}

async function validarReferenciasOrcamento(db: DbClient, input: OrcamentoInput) {
  const cliente = await db.cliente.findUnique({
    where: { id: input.clienteId },
    select: { id: true }
  });

  if (!cliente) {
    throw new Error("CLIENTE_NAO_ENCONTRADO");
  }

  if (input.obraId) {
    const obra = await db.obra.findUnique({
      where: { id: input.obraId },
      select: {
        id: true,
        clienteId: true
      }
    });

    if (!obra) {
      throw new Error("OBRA_NAO_ENCONTRADA");
    }

    if (obra.clienteId !== input.clienteId) {
      throw new Error("OBRA_NAO_PERTENCE_AO_CLIENTE");
    }
  }

  if (input.responsavelId) {
    const responsavel = await db.usuario.findUnique({
      where: { id: input.responsavelId },
      select: { id: true }
    });

    if (!responsavel) {
      throw new Error("RESPONSAVEL_NAO_ENCONTRADO");
    }
  }

  await validarIdsRelacionados(db, "servico", input.itens.map((item) => item.servicoId));
  await validarIdsRelacionados(db, "material", input.itens.map((item) => item.materialId));
  await validarIdsRelacionados(db, "equipamento", input.itens.map((item) => item.equipamentoId));
  await validarIdsRelacionados(db, "fornecedor", input.itens.map((item) => item.fornecedorPreferencialId));
  await validarIdsRelacionados(
    db,
    "colaborador",
    input.itens
      .filter((item) => item.categoriaRecurso === CategoriaRecursoOrcamento.EQUIPE)
      .map((item) => item.recursoReferenciaId)
  );
  await validarIdsRelacionados(
    db,
    "fornecedor",
    input.itens
      .filter((item) => item.categoriaRecurso === CategoriaRecursoOrcamento.TERCEIRO)
      .map((item) => item.recursoReferenciaId)
  );
}

async function validarIdsRelacionados(
  db: DbClient,
  entidade: "servico" | "material" | "equipamento" | "colaborador" | "fornecedor",
  ids: Array<string | null | undefined>
) {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

  if (uniqueIds.length === 0) {
    return;
  }

  let count = 0;

  if (entidade === "servico") {
    count = await db.servico.count({
      where: { id: { in: uniqueIds } }
    });
  }

  if (entidade === "material") {
    count = await db.material.count({
      where: { id: { in: uniqueIds } }
    });
  }

  if (entidade === "equipamento") {
    count = await db.equipamento.count({
      where: { id: { in: uniqueIds } }
    });
  }

  if (entidade === "colaborador") {
    count = await db.colaborador.count({
      where: { id: { in: uniqueIds } }
    });
  }

  if (entidade === "fornecedor") {
    count = await db.fornecedor.count({
      where: { id: { in: uniqueIds } }
    });
  }

  if (count !== uniqueIds.length) {
    const codeByEntity = {
      servico: "SERVICO_NAO_ENCONTRADO",
      material: "MATERIAL_NAO_ENCONTRADO",
      equipamento: "EQUIPAMENTO_NAO_ENCONTRADO",
      colaborador: "COLABORADOR_NAO_ENCONTRADO",
      fornecedor: "FORNECEDOR_NAO_ENCONTRADO"
    };

    throw new Error(codeByEntity[entidade]);
  }
}

function buildFormacaoPrecoData(input: OrcamentoInput) {
  const pricing = buildPricingSnapshot(input);
  const hasFormacaoInput = Boolean(input.formacaoPreco);
  const hasItemCost = input.itens.some(
    (item) => Number(item.valorCusto ?? item.custoUnitario) > 0
  );

  if (!hasFormacaoInput && !hasItemCost) {
    return null;
  }

  return pricing.formacaoPreco;
}

function buildCenariosInput(input: OrcamentoInput) {
  if (input.cenarios.length > 0) {
    let hasDefault = false;

    return input.cenarios.map((cenario, index) => {
      const isPadrao = cenario.isPadrao || (!hasDefault && index === 0);
      const normalized = {
        ...cenario,
        isPadrao: isPadrao && !hasDefault
      };

      if (normalized.isPadrao) {
        hasDefault = true;
      }

      return normalized;
    });
  }

  if (input.tipo !== TipoOrcamento.OPERACIONAL) {
    return [];
  }

  return [
    {
      tempId: "cenario-padrao",
      ordem: 1,
      nome: input.titulo?.trim() || "Cenario padrao",
      descricao: "Cenario criado automaticamente para manter o fluxo rapido valido.",
      metodoExecutivo: "",
      observacao: "",
      isPadrao: true,
      status: StatusCenarioOrcamento.EM_ESTUDO
    }
  ];
}

function resolveCenarioId(
  cenarioIdByRef: Map<string, string>,
  value?: { cenarioTempId?: string | null; cenarioOrdem?: number | null }
) {
  if (value?.cenarioTempId?.trim()) {
    return cenarioIdByRef.get(`temp:${value.cenarioTempId.trim()}`) ?? null;
  }

  if (value?.cenarioOrdem) {
    return cenarioIdByRef.get(`ordem:${value.cenarioOrdem}`) ?? null;
  }

  return cenarioIdByRef.get("padrao") ?? null;
}

function buildPropostasInput(input: OrcamentoInput) {
  return input.propostasComerciais;
}

function calcularValorOpcional(opcional: OrcamentoInput["propostasComerciais"][number]["opcionais"][number]) {
  return calcularValorItem({
    frenteTempId: "",
    frenteOrdem: null,
    tipoItem: TipoItemOrcamento.OUTRO,
    servicoId: null,
    materialId: null,
    equipamentoId: null,
    categoriaRecurso: null,
    classeOperacional: "",
    recursoReferenciaId: "",
    recursoNome: "",
    ordem: opcional.ordem,
    codigo: opcional.codigo,
    descricao: opcional.descricao,
    unidade: opcional.unidade,
    quantidade: opcional.quantidade,
    produtividade: null,
    custoUnitario: 0,
    valorUnitario: opcional.valorUnitario,
    observacao: opcional.observacao
  });
}

function getFrenteRefsDoCenario(
  input: OrcamentoInput,
  cenario: OrcamentoInput["cenarios"][number] | undefined
) {
  return new Set(
    getFrentesDoCenario(input, cenario)
      .map((frente) => frente.tempId?.trim())
      .filter(Boolean)
  );
}

function getFrentesDoCenario(
  input: OrcamentoInput,
  cenario: OrcamentoInput["cenarios"][number] | undefined
) {
  if (!cenario) {
    return input.frentes;
  }

  return input.frentes.filter((frente) => {
    if (cenario.tempId?.trim() && frente.cenarioTempId?.trim()) {
      return frente.cenarioTempId.trim() === cenario.tempId.trim();
    }

    return frente.cenarioOrdem === cenario.ordem || (!frente.cenarioTempId?.trim() && cenario.isPadrao);
  });
}

function getItensDoCenario(
  input: OrcamentoInput,
  cenario: OrcamentoInput["cenarios"][number] | undefined
) {
  const frenteRefs = getFrenteRefsDoCenario(input, cenario);

  return input.itens.filter((item) => {
    if (!item.frenteTempId?.trim()) {
      return input.tipo !== TipoOrcamento.OPERACIONAL;
    }

    return frenteRefs.has(item.frenteTempId.trim());
  });
}

export function buildPropostaTotals(
  input: OrcamentoInput,
  proposta: OrcamentoInput["propostasComerciais"][number],
  cenario: OrcamentoInput["cenarios"][number] | undefined
) {
  const itensDoCenario = getItensDoCenario(input, cenario);
  const pricing = buildPricingSnapshot(input, { cenario });
  const subtotalCenario =
    input.tipo === TipoOrcamento.OPERACIONAL
      ? pricing.totals.valorSubtotal
      : itensDoCenario.reduce((sum, item) => sum + calcularValorItem(item), 0);
  const subtotalOpcionais = proposta.opcionais.reduce(
    (sum, opcional) => sum + calcularValorOpcional(opcional),
    0
  );
  const valorSubtotal = Number((subtotalCenario + subtotalOpcionais).toFixed(2));
  const valorDesconto =
    input.tipo === TipoOrcamento.OPERACIONAL
      ? pricing.totals.valorDesconto
      : Number(input.valorDesconto ?? 0);
  const valorAcrescimo =
    input.tipo === TipoOrcamento.OPERACIONAL
      ? pricing.totals.valorAcrescimo
      : Number(input.valorAcrescimo ?? 0);

  return {
    valorSubtotal,
    valorDesconto,
    valorAcrescimo,
    valorTotal: Math.max(0, Number((valorSubtotal - valorDesconto + valorAcrescimo).toFixed(2)))
  };
}

export function buildPropostaSnapshot(
  input: OrcamentoInput,
  proposta: OrcamentoInput["propostasComerciais"][number],
  cenario: OrcamentoInput["cenarios"][number] | undefined
) {
  const frentesDoCenario = getFrentesDoCenario(input, cenario);
  const itensDoCenario = getItensDoCenario(input, cenario);
  const itensComerciais =
    input.tipo === TipoOrcamento.OPERACIONAL
      ? itensDoCenario.filter((item) =>
          item.tipoItem !== TipoItemOrcamento.RECURSO && item.exibirNoPdf !== false
        )
      : itensDoCenario.filter((item) => item.exibirNoPdf !== false);
  const opcionais = proposta.opcionais.filter((opcional) => opcional.descricao?.trim());
  const totals = buildPropostaTotals(input, proposta, cenario);

  const snapshot = {
    tipoOrcamento: input.tipo,
    statusOrcamento: input.status,
    cenario: cenario
      ? {
          ordem: cenario.ordem,
          nome: cenario.nome,
          descricao: cenario.descricao,
          metodoExecutivo: cenario.metodoExecutivo
        }
      : null,
    titulo: input.titulo ?? null,
    objeto: input.objeto ?? null,
    revisao: proposta.revisao,
    modoExibicaoValoresPdf: proposta.modoExibicaoValoresPdf,
    valorDesconto: input.valorDesconto,
    valorAcrescimo: input.valorAcrescimo,
    totals,
    frentes: frentesDoCenario.map((frente) => ({
      tempId: frente.tempId,
      ordem: frente.ordem,
      nome: frente.nome,
      descricao: frente.descricao,
      unidadeProducao: frente.unidadeProducao,
      quantidadePrevista: frente.quantidadePrevista,
      observacao: frente.observacao
    })),
    itens: itensComerciais.map((item) => ({
      frenteTempId: item.frenteTempId,
      frenteOrdem: item.frenteOrdem,
      tipoItem: item.tipoItem,
      ordem: item.ordem,
      codigo: item.codigo,
      modoPrecificacao: item.modoPrecificacao ?? "PRECO_DIRETO",
      precoCompra: item.precoCompra,
      markupPercentual: item.markupPercentual,
      precoVendaSobrescrito: item.precoVendaSobrescrito,
      fornecedorPreferencialId: item.fornecedorPreferencialId,
      exibirNoPdf: item.exibirNoPdf,
      descricao: item.descricao,
      natureza: item.tipoItem,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: calcularValorItem(item),
      observacao: item.observacao,
      observacaoComercial: item.observacaoComercial
    })),
    opcionais,
    premissasGerais: input.premissas.filter((premissa) => premissa.descricao?.trim()),
    criadoEm: new Date().toISOString()
  };

  return JSON.parse(JSON.stringify(snapshot)) as Prisma.JsonObject;
}

async function criarEstruturaOrcamento(
  db: DbClient,
  orcamentoId: string,
  input: OrcamentoInput,
  options: {
    atualizarFormacaoPreco?: boolean;
  } = {}
) {
  const propostasEmitidas = new Set(
    (
      await db.orcamentoPropostaComercial.findMany({
        where: {
          orcamentoId,
          status: StatusPropostaComercial.EMITIDA
        },
        select: {
          id: true
        }
      })
    ).map((proposta) => proposta.id)
  );
  const cenarioIdByRef = new Map<string, string>();
  const cenarioInputByRef = new Map<string, OrcamentoInput["cenarios"][number]>();
  const cenariosInput = buildCenariosInput(input);
  const pricing = buildPricingSnapshot(input);
  const memoriaRecursoByRef = new Map(
    (pricing.motorCustos?.memoria ?? []).map((memoria) => [memoria.recursoRef, memoria])
  );

  // Uma proposta emitida preserva o cenário ao qual foi vinculada. Na edição,
  // esse cenário pode ser reutilizado; desmarcá-lo antes evita conflito com o
  // índice que permite apenas um cenário padrão por orçamento.
  await db.orcamentoCenario.updateMany({
    where: {
      orcamentoId,
      isPadrao: true
    },
    data: {
      isPadrao: false
    }
  });

  for (const cenario of cenariosInput) {
    const cenarioData = {
      ordem: cenario.ordem,
      nome: cenario.nome,
      descricao: clean(cenario.descricao),
      metodoExecutivo: clean(cenario.metodoExecutivo),
      observacao: clean(cenario.observacao),
      isPadrao: cenario.isPadrao,
      status: cenario.status
    };
    const tempId = cenario.tempId?.trim();
    const updated = tempId
      ? await db.orcamentoCenario.updateMany({
          where: {
            id: tempId,
            orcamentoId
          },
          data: cenarioData
        })
      : { count: 0 };
    const saved = updated.count > 0
      ? { id: tempId! }
      : await db.orcamentoCenario.create({
          data: {
            empresaId: requireActiveTenantEmpresaId(),
            orcamentoId,
            ...cenarioData
          },
          select: {
            id: true
          }
        });

    if (cenario.tempId?.trim()) {
      cenarioIdByRef.set(`temp:${cenario.tempId.trim()}`, saved.id);
      cenarioInputByRef.set(`temp:${cenario.tempId.trim()}`, cenario);
    }

    if (!cenarioIdByRef.has(`ordem:${cenario.ordem}`)) {
      cenarioIdByRef.set(`ordem:${cenario.ordem}`, saved.id);
      cenarioInputByRef.set(`ordem:${cenario.ordem}`, cenario);
    }

    if (cenario.isPadrao || !cenarioIdByRef.has("padrao")) {
      cenarioIdByRef.set("padrao", saved.id);
      cenarioInputByRef.set("padrao", cenario);
    }
  }

  const frenteIdByRef = new Map<string, string>();

  for (const frente of input.frentes) {
    const cenarioId = resolveCenarioId(cenarioIdByRef, frente);

    const created = await db.orcamentoFrente.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId,
        cenarioId,
        ordem: frente.ordem,
        nome: frente.nome,
        descricao: clean(frente.descricao),
        metodoExecutivo: clean(frente.metodoExecutivo),
        unidadeProducao: clean(frente.unidadeProducao),
        quantidadePrevista: frente.quantidadePrevista ?? null,
        produtividadeDia: frente.produtividadeDia ?? null,
        prazoEstimadoDias: frente.prazoEstimadoDias ?? null,
        prazoTeoricoDias: frente.prazoTeoricoDias ?? null,
        prazoAdotadoDias: frente.prazoAdotadoDias ?? null,
        origemPrazo: frente.origemPrazo ?? "AUTOMATICO",
        modoCusto: frente.modoCusto,
        custoManual: frente.custoManual,
        observacao: clean(frente.observacao)
      },
      select: {
        id: true
      }
    });

    if (frente.tempId?.trim()) {
      frenteIdByRef.set(`temp:${frente.tempId.trim()}`, created.id);
    }

    if (!frenteIdByRef.has(`ordem:${frente.ordem}`)) {
      frenteIdByRef.set(`ordem:${frente.ordem}`, created.id);
    }
  }

  const formacaoPreco = buildFormacaoPrecoData(input);

  if (options.atualizarFormacaoPreco && formacaoPreco) {
    await db.orcamentoFormacaoPreco.upsert({
      where: {
        orcamentoId
      },
      update: formacaoPreco,
      create: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId,
        ...formacaoPreco
      }
    });
  } else if (options.atualizarFormacaoPreco) {
    await db.orcamentoFormacaoPreco.deleteMany({
      where: { orcamentoId }
    });
  } else if (formacaoPreco) {
    await db.orcamentoFormacaoPreco.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId,
        ...formacaoPreco
      }
    });
  }

  for (const item of input.itens) {
    const frenteId = resolveFrenteId(frenteIdByRef, item);
    const itemRef = item.tempId?.trim() || `${item.frenteTempId?.trim() || `ordem:${item.frenteOrdem ?? 0}`}:item:${item.ordem}`;
    const memoriaRecurso = memoriaRecursoByRef.get(itemRef);
    const transportePorKm = item.unidadeEconomicaCusto === "KM";

    await db.orcamentoItem.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId,
        frenteId,
        tipoItem: item.tipoItem,
        servicoId: item.servicoId || null,
        materialId: item.materialId || null,
        equipamentoId: item.equipamentoId || null,
        categoriaRecurso: item.categoriaRecurso ?? null,
        classeOperacional: clean(item.classeOperacional),
        recursoReferenciaId: clean(item.recursoReferenciaId),
        recursoNome: clean(item.recursoNome),
        modoPrecificacao: item.modoPrecificacao ?? "PRECO_DIRETO",
        precoCompra: item.precoCompra ?? null,
        markupPercentual: item.markupPercentual ?? null,
        precoVendaSobrescrito: Boolean(item.precoVendaSobrescrito),
        fornecedorPreferencialId: item.fornecedorPreferencialId || null,
        exibirNoPdf: item.exibirNoPdf !== false,
        observacaoComercial: clean(item.observacaoComercial),
        ordem: item.ordem,
        codigo: clean(item.codigo),
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        quantidadeOperacional:
          item.tipoItem === TipoItemOrcamento.RECURSO
            ? memoriaRecurso?.quantidadeOperacional ?? item.quantidadeOperacional ?? null
            : null,
        origemQuantidadeOperacional: item.origemQuantidadeOperacional ?? "FRENTE",
        produtividade: item.produtividade ?? null,
        custoUnitario: item.custoUnitario,
        tipoCalculoRecurso: item.tipoCalculoRecurso ?? "AUTOMATICO",
        unidadeEconomicaCusto: item.unidadeEconomicaCusto ?? null,
        valorCusto: item.valorCusto ?? item.custoUnitario,
        horasDia: item.horasDia ?? null,
        horasTotais: item.horasTotais ?? null,
        viagensDia: item.viagensDia ?? null,
        viagensTotais: item.viagensTotais ?? null,
        distanciaViagemKm: item.distanciaViagemKm ?? null,
        quilometrosTotais: item.quilometrosTotais ?? null,
        capacidadePorViagem: item.capacidadePorViagem ?? null,
        unidadeCapacidade: clean(item.unidadeCapacidade),
        caracteristicasRecursoSnapshot: item.caracteristicasRecursoSnapshot
          ? (item.caracteristicasRecursoSnapshot as Prisma.InputJsonValue)
          : undefined,
        camposTecnicosPersonalizados: item.camposTecnicosPersonalizados ?? [],
        viagensTeoricas: transportePorKm ? memoriaRecurso?.viagensTeoricas ?? 0 : null,
        viagensOperacionais: transportePorKm ? memoriaRecurso?.viagensOperacionais ?? 0 : null,
        custoPorViagem: transportePorKm ? memoriaRecurso?.custoPorViagem ?? 0 : null,
        cargasTotais: item.cargasTotais ?? null,
        mesesTotais: item.mesesTotais ?? null,
        diasTrabalhadosMes: item.diasTrabalhadosMes ?? 22,
        custoTotalCalculado: memoriaRecurso?.custoTotal ?? item.custoTotalCalculado ?? 0,
        memoriaCalculo: memoriaRecurso ? JSON.stringify(memoriaRecurso) : clean(item.memoriaCalculo),
        valorUnitario: item.valorUnitario,
        valorTotal: calcularValorItem(item),
        observacao: clean(item.observacao)
      }
    });
  }

  for (const premissa of input.premissas) {
    await db.orcamentoPremissa.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId,
        cenarioId: null,
        tipo: premissa.tipo,
        ordem: premissa.ordem,
        titulo: clean(premissa.titulo),
        descricao: premissa.descricao
      }
    });
  }

  const propostasInput = buildPropostasInput(input);

  for (const proposta of propostasInput) {
    if (proposta.tempId?.trim() && propostasEmitidas.has(proposta.tempId.trim())) {
      continue;
    }

    const cenarioId = resolveCenarioId(cenarioIdByRef, proposta);
    const cenarioInput =
      proposta.cenarioTempId?.trim()
        ? cenarioInputByRef.get(`temp:${proposta.cenarioTempId.trim()}`)
        : proposta.cenarioOrdem
          ? cenarioInputByRef.get(`ordem:${proposta.cenarioOrdem}`)
          : cenarioInputByRef.get("padrao");
    const codigo = clean(proposta.codigo) ?? `PROP-${String(proposta.revisao + 1).padStart(3, "0")}`;
    const totals = buildPropostaTotals(input, proposta, cenarioInput);
    const statusPersistido =
      proposta.status === StatusPropostaComercial.EMITIDA
        ? StatusPropostaComercial.RASCUNHO
        : proposta.status;

    const created = await db.orcamentoPropostaComercial.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId,
        cenarioId,
        codigo,
        revisao: proposta.revisao,
        titulo: clean(proposta.titulo),
        status: statusPersistido,
        modoExibicaoValoresPdf: proposta.modoExibicaoValoresPdf,
        condicoesComerciais: clean(proposta.condicoesComerciais),
        observacao: clean(proposta.observacao),
        valorSubtotal: totals.valorSubtotal,
        valorDesconto: totals.valorDesconto,
        valorAcrescimo: totals.valorAcrescimo,
        valorTotal: totals.valorTotal,
        // Rascunhos tambem registram a fotografia comercial vigente. Ao emitir,
        // esse snapshot deixa de ser recriado e passa a ser historico imutavel.
        snapshotJson: buildPropostaSnapshot(input, proposta, cenarioInput),
        emitidaEm: null
      },
      select: {
        id: true
      }
    });

    for (const opcional of proposta.opcionais) {
      await db.orcamentoPropostaOpcional.create({
        data: {
          empresaId: requireActiveTenantEmpresaId(),
          propostaId: created.id,
          ordem: opcional.ordem,
          codigo: clean(opcional.codigo),
          descricao: opcional.descricao,
          unidade: opcional.unidade,
          quantidade: opcional.quantidade,
          valorUnitario: opcional.valorUnitario,
          valorTotal: calcularValorOpcional(opcional),
          condicoes: clean(opcional.condicoes),
          observacao: clean(opcional.observacao)
        }
      });
    }
  }
}

function resolveFrenteId(
  frenteIdByRef: Map<string, string>,
  item: OrcamentoInput["itens"][number]
) {
  if (item.frenteTempId?.trim()) {
    const frenteId = frenteIdByRef.get(`temp:${item.frenteTempId.trim()}`);

    if (!frenteId) {
      throw new Error("FRENTE_NAO_ENCONTRADA");
    }

    return frenteId;
  }

  if (item.frenteOrdem) {
    const frenteId = frenteIdByRef.get(`ordem:${item.frenteOrdem}`);

    if (!frenteId) {
      throw new Error("FRENTE_NAO_ENCONTRADA");
    }

    return frenteId;
  }

  return null;
}

function buildOrcamentoData(input: OrcamentoInput, userId: string) {
  const dataOrcamento = parseDateInput(input.dataOrcamento);

  if (!dataOrcamento) {
    throw new Error("DATA_ORCAMENTO_INVALIDA");
  }

  return {
    tipo: input.tipo,
    status: input.status,
    clienteId: input.clienteId,
    obraId: input.obraId || null,
    responsavelId: input.responsavelId || null,
    dataOrcamento,
    validadeAte: parseDateInput(input.validadeAte),
    titulo: clean(input.titulo),
    objeto: clean(input.objeto),
    observacaoInterna: clean(input.observacaoInterna),
    observacaoCliente: clean(input.observacaoCliente),
    criadoPorId: userId,
    ...buildOrcamentoTotals(input)
  };
}

export async function validarCodigoOrcamentoDisponivel(
  db: DbClient,
  codigo: string,
  orcamentoIdAtual?: string
) {
  const existente = await db.orcamento.findFirst({
    where: {
      codigo,
      ...(orcamentoIdAtual
        ? {
            id: {
              not: orcamentoIdAtual
            }
          }
        : {})
    },
    select: {
      id: true
    }
  });

  if (existente) {
    throw new Error("CODIGO_ORCAMENTO_DUPLICADO");
  }
}

export async function listarOrcamentos(
  db: DbClient,
  filters: {
    search?: string | null;
    clienteId?: string | null;
    obraId?: string | null;
    responsavelId?: string | null;
    tipo?: string | null;
    status?: string | null;
    dataInicial?: string | null;
    dataFinal?: string | null;
  }
) {
  const status =
    filters.status &&
    filters.status !== "TODOS" &&
    Object.values(StatusOrcamento).includes(filters.status as StatusOrcamento)
      ? (filters.status as StatusOrcamento)
      : null;
  const where: Prisma.OrcamentoWhereInput =
    status === StatusOrcamento.ARQUIVADO ? {} : { deletedAt: null };

  if (filters.clienteId) {
    where.clienteId = filters.clienteId;
  }

  if (filters.obraId) {
    where.obraId = filters.obraId;
  }

  if (filters.responsavelId) {
    where.responsavelId = filters.responsavelId;
  }

  if (
    filters.tipo &&
    filters.tipo !== "TODOS" &&
    Object.values(TipoOrcamento).includes(filters.tipo as TipoOrcamento)
  ) {
    where.tipo = filters.tipo as TipoOrcamento;
  }

  if (status) {
    where.status = status;
  }

  const dataInicial = parseDateInput(filters.dataInicial);
  const dataFinal = endOfDay(filters.dataFinal);

  if (dataInicial || dataFinal) {
    where.dataOrcamento = {
      gte: dataInicial ?? undefined,
      lte: dataFinal ?? undefined
    };
  }

  const search = filters.search?.trim();

  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: "insensitive" } },
      { titulo: { contains: search, mode: "insensitive" } },
      { objeto: { contains: search, mode: "insensitive" } },
      {
        cliente: {
          OR: [
            { nome: { contains: search, mode: "insensitive" } },
            { nomeFantasia: { contains: search, mode: "insensitive" } },
            { codigo: { contains: search, mode: "insensitive" } },
            { cnpj: { contains: search, mode: "insensitive" } }
          ]
        }
      },
      {
        obra: {
          OR: [
            { nome: { contains: search, mode: "insensitive" } },
            { codigo: { contains: search, mode: "insensitive" } },
            { contratoNumero: { contains: search, mode: "insensitive" } }
          ]
        }
      },
      {
        itens: {
          some: {
            OR: [
              { descricao: { contains: search, mode: "insensitive" } },
              { codigo: { contains: search, mode: "insensitive" } }
            ]
          }
        }
      }
    ];
  }

  return db.orcamento.findMany({
    where,
    include: orcamentoListInclude,
    orderBy: [{ dataOrcamento: "desc" }, { createdAt: "desc" }]
  });
}

export async function buscarOrcamento(db: DbClient, id: string) {
  return db.orcamento.findFirst({
    where: {
      id
    },
    include: orcamentoInclude
  });
}

export async function criarOrcamento(
  db: DbClient,
  params: {
    input: OrcamentoInput;
    userId: string;
    codigo?: string;
  }
) {
  await validarReferenciasOrcamento(db, params.input);
  const codigo = clean(params.codigo) ?? (await generateOrcamentoCode(db));

  await validarCodigoOrcamentoDisponivel(db, codigo);

  const orcamento = await db.orcamento.create({
    data: {
      empresaId: requireActiveTenantEmpresaId(),
      codigo,
      ...buildOrcamentoData(params.input, params.userId)
    },
    select: {
      id: true
    }
  });

  await criarEstruturaOrcamento(db, orcamento.id, params.input);

  return buscarOrcamento(db, orcamento.id);
}

export async function atualizarOrcamento(
  db: DbClient,
  params: {
    id: string;
    input: OrcamentoInput;
    userId: string;
    codigo?: string;
  }
) {
  const atual = await db.orcamento.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    select: {
      id: true,
      codigo: true,
      criadoPorId: true,
      status: true
    }
  });

  if (!atual) {
    throw new Error("ORCAMENTO_NAO_ENCONTRADO");
  }

  await validarReferenciasOrcamento(db, params.input);
  validarTransicaoStatus(atual.status, params.input.status);
  const codigo = clean(params.codigo) ?? atual.codigo;

  await validarCodigoOrcamentoDisponivel(db, codigo, atual.id);

  await db.orcamentoPropostaComercial.deleteMany({
    where: {
      orcamentoId: params.id,
      status: {
        not: StatusPropostaComercial.EMITIDA
      }
    }
  });
  await db.orcamentoItem.deleteMany({
    where: { orcamentoId: params.id }
  });
  await db.orcamentoPremissa.deleteMany({
    where: { orcamentoId: params.id }
  });
  await db.orcamentoFrente.deleteMany({
    where: { orcamentoId: params.id }
  });
  await db.orcamentoCenario.deleteMany({
    where: {
      orcamentoId: params.id,
      propostas: {
        none: {
          status: StatusPropostaComercial.EMITIDA
        }
      }
    }
  });

  await db.orcamento.update({
    where: { id: params.id },
    data: {
      codigo,
      ...buildOrcamentoData(params.input, params.userId),
      criadoPorId: atual.criadoPorId
    }
  });

  await criarEstruturaOrcamento(db, params.id, params.input, {
    atualizarFormacaoPreco: true
  });

  return buscarOrcamento(db, params.id);
}

export async function excluirOrcamento(db: DbClient, id: string) {
  const atual = await db.orcamento.findFirst({
    where: {
      id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!atual) {
    throw new Error("ORCAMENTO_NAO_ENCONTRADO");
  }

  return db.orcamento.update({
    where: { id },
    data: {
      status: StatusOrcamento.ARQUIVADO,
      deletedAt: new Date()
    },
    include: orcamentoInclude
  });
}

export async function duplicarOrcamento(
  db: DbClient,
  params: {
    id: string;
    userId: string;
  }
) {
  const origem = await buscarOrcamento(db, params.id);

  if (!origem) {
    throw new Error("ORCAMENTO_NAO_ENCONTRADO");
  }

  const novo = await db.orcamento.create({
    data: {
      empresaId: requireActiveTenantEmpresaId(),
      codigo: await generateOrcamentoCode(db),
      tipo: origem.tipo,
      status: StatusOrcamento.RASCUNHO,
      clienteId: origem.clienteId,
      obraId: origem.obraId,
      responsavelId: origem.responsavelId,
      dataOrcamento: new Date(),
      validadeAte: origem.validadeAte,
      titulo: origem.titulo ? `Copia de ${origem.titulo}` : `Copia de ${origem.codigo}`,
      objeto: origem.objeto,
      observacaoInterna: origem.observacaoInterna,
      observacaoCliente: origem.observacaoCliente,
      valorSubtotal: origem.valorSubtotal,
      valorDesconto: origem.valorDesconto,
      valorAcrescimo: origem.valorAcrescimo,
      valorTotal: origem.valorTotal,
      criadoPorId: params.userId
    },
    select: {
      id: true
    }
  });

  const cenarioIdMap = new Map<string, string>();

  for (const cenario of origem.cenarios) {
    const created = await db.orcamentoCenario.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId: novo.id,
        ordem: cenario.ordem,
        nome: cenario.nome,
        descricao: cenario.descricao,
        metodoExecutivo: cenario.metodoExecutivo,
        observacao: cenario.observacao,
        isPadrao: cenario.isPadrao,
        status: StatusCenarioOrcamento.EM_ESTUDO
      },
      select: {
        id: true
      }
    });

    cenarioIdMap.set(cenario.id, created.id);
  }

  const frenteIdMap = new Map<string, string>();

  for (const frente of origem.frentes) {
    const created = await db.orcamentoFrente.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId: novo.id,
        cenarioId: frente.cenarioId ? cenarioIdMap.get(frente.cenarioId) ?? null : null,
        ordem: frente.ordem,
        nome: frente.nome,
        descricao: frente.descricao,
        metodoExecutivo: frente.metodoExecutivo,
        unidadeProducao: frente.unidadeProducao,
        quantidadePrevista: frente.quantidadePrevista,
        produtividadeDia: frente.produtividadeDia,
        prazoEstimadoDias: frente.prazoEstimadoDias,
        prazoTeoricoDias: frente.prazoTeoricoDias,
        prazoAdotadoDias: frente.prazoAdotadoDias,
        origemPrazo: frente.origemPrazo,
        modoCusto: frente.modoCusto,
        custoManual: frente.custoManual,
        observacao: frente.observacao
      },
      select: {
        id: true
      }
    });

    frenteIdMap.set(frente.id, created.id);
  }

  if (origem.formacaoPreco) {
    await db.orcamentoFormacaoPreco.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId: novo.id,
        modoCusto: origem.formacaoPreco.modoCusto,
        custoDireto: origem.formacaoPreco.custoDireto,
        custoIndireto: origem.formacaoPreco.custoIndireto,
        impostosPercentual: origem.formacaoPreco.impostosPercentual,
        impostosValor: origem.formacaoPreco.impostosValor,
        margemPercentual: origem.formacaoPreco.margemPercentual,
        margemValor: origem.formacaoPreco.margemValor,
        precoSugerido: origem.formacaoPreco.precoSugerido,
        ajusteComercial: origem.formacaoPreco.ajusteComercial,
        precoFinal: origem.formacaoPreco.precoFinal,
        observacao: origem.formacaoPreco.observacao
      }
    });
  }

  for (const item of origem.itens) {
    await db.orcamentoItem.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId: novo.id,
        frenteId: item.frenteId ? frenteIdMap.get(item.frenteId) ?? null : null,
        tipoItem: item.tipoItem,
        servicoId: item.servicoId,
        materialId: item.materialId,
        equipamentoId: item.equipamentoId,
        categoriaRecurso: item.categoriaRecurso,
        classeOperacional: item.classeOperacional,
        recursoReferenciaId: item.recursoReferenciaId,
        recursoNome: item.recursoNome,
        ordem: item.ordem,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        quantidadeOperacional: item.quantidadeOperacional,
        origemQuantidadeOperacional: item.origemQuantidadeOperacional,
        produtividade: item.produtividade,
        custoUnitario: item.custoUnitario,
        tipoCalculoRecurso: item.tipoCalculoRecurso,
        unidadeEconomicaCusto: item.unidadeEconomicaCusto,
        valorCusto: item.valorCusto,
        horasDia: item.horasDia,
        horasTotais: item.horasTotais,
        viagensDia: item.viagensDia,
        viagensTotais: item.viagensTotais,
        distanciaViagemKm: item.distanciaViagemKm,
        quilometrosTotais: item.quilometrosTotais,
        capacidadePorViagem: item.capacidadePorViagem,
        unidadeCapacidade: item.unidadeCapacidade,
        caracteristicasRecursoSnapshot: item.caracteristicasRecursoSnapshot
          ? (item.caracteristicasRecursoSnapshot as Prisma.InputJsonValue)
          : undefined,
        camposTecnicosPersonalizados: item.camposTecnicosPersonalizados,
        viagensTeoricas: item.viagensTeoricas,
        viagensOperacionais: item.viagensOperacionais,
        custoPorViagem: item.custoPorViagem,
        cargasTotais: item.cargasTotais,
        mesesTotais: item.mesesTotais,
        diasTrabalhadosMes: item.diasTrabalhadosMes,
        custoTotalCalculado: item.custoTotalCalculado,
        memoriaCalculo: item.memoriaCalculo,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        observacao: item.observacao
      }
    });
  }

  for (const premissa of origem.premissas) {
    await db.orcamentoPremissa.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId: novo.id,
        cenarioId: premissa.cenarioId ? cenarioIdMap.get(premissa.cenarioId) ?? null : null,
        tipo: premissa.tipo,
        ordem: premissa.ordem,
        titulo: premissa.titulo,
        descricao: premissa.descricao
      }
    });
  }

  for (const proposta of origem.propostas) {
    const propostaCriada = await db.orcamentoPropostaComercial.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId: novo.id,
        cenarioId: proposta.cenarioId ? cenarioIdMap.get(proposta.cenarioId) ?? null : null,
        codigo: proposta.codigo,
        revisao: proposta.revisao,
        titulo: proposta.titulo,
        status: StatusPropostaComercial.RASCUNHO,
        modoExibicaoValoresPdf: proposta.modoExibicaoValoresPdf,
        condicoesComerciais: proposta.condicoesComerciais,
        observacao: proposta.observacao,
        valorSubtotal: proposta.valorSubtotal,
        valorDesconto: proposta.valorDesconto,
        valorAcrescimo: proposta.valorAcrescimo,
        valorTotal: proposta.valorTotal
      },
      select: {
        id: true
      }
    });

    for (const opcional of proposta.opcionais) {
      await db.orcamentoPropostaOpcional.create({
        data: {
          empresaId: requireActiveTenantEmpresaId(),
          propostaId: propostaCriada.id,
          ordem: opcional.ordem,
          codigo: opcional.codigo,
          descricao: opcional.descricao,
          unidade: opcional.unidade,
          quantidade: opcional.quantidade,
          valorUnitario: opcional.valorUnitario,
          valorTotal: opcional.valorTotal,
          condicoes: opcional.condicoes,
          observacao: opcional.observacao
        }
      });
    }
  }

  return buscarOrcamento(db, novo.id);
}

export async function evoluirOrcamentoParaOperacional(db: DbClient, id: string) {
  const origem = await buscarOrcamento(db, id);

  if (!origem) {
    throw new Error("ORCAMENTO_NAO_ENCONTRADO");
  }

  if (origem.tipo === TipoOrcamento.OPERACIONAL) {
    return origem;
  }

  if (origem.status === StatusOrcamento.ARQUIVADO) {
    throw new Error("ORCAMENTO_ARQUIVADO");
  }

  const primeiraFrente =
    origem.frentes[0] ??
    (await db.orcamentoFrente.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        orcamentoId: id,
        ordem: 1,
        nome: "Frente operacional",
        descricao: origem.objeto,
        metodoExecutivo: null,
        unidadeProducao: null,
        quantidadePrevista: null,
        produtividadeDia: null,
        prazoEstimadoDias: null,
        custoManual: 0,
        observacao: "Frente criada automaticamente na evolucao comercial para operacional."
      }
    }));

  const itens = await db.orcamentoItem.findMany({
    where: { orcamentoId: id },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }]
  });

  for (const [index, item] of itens.entries()) {
    await db.orcamentoItem.update({
      where: { id: item.id },
      data: {
        frenteId: item.frenteId ?? primeiraFrente.id,
        tipoItem:
          item.tipoItem === TipoItemOrcamento.COMERCIAL
            ? index === 0
              ? TipoItemOrcamento.SERVICO_PRINCIPAL
              : TipoItemOrcamento.SERVICO_AUXILIAR
            : item.tipoItem
      }
    });
  }

  await db.orcamento.update({
    where: { id },
    data: {
      tipo: TipoOrcamento.OPERACIONAL,
      status:
        origem.status === StatusOrcamento.RASCUNHO
          ? StatusOrcamento.EM_ELABORACAO
          : origem.status
    }
  });

  return buscarOrcamento(db, id);
}
