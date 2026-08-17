import {
  EstadoEncargosExecucao,
  FormaCalculoEncargoExecucao,
  OrigemExecucao,
  OrigemEncargoExecucao,
  OrigemFatoBoletimDiario,
  OrigemReferenciaPrevistaExecucao,
  Prisma,
  StatusBoletimDiarioProducao,
  StatusLancamento
} from "@prisma/client";
import {
  adaptarExecucaoParaEntradaNucleo,
  adaptarOrcamentoParaEntradaNucleo,
  avaliarSnapshotTecnicoEconomico,
  executarNucleoComMotorAtual,
  type EntradaExecucao,
  type ResultadoNucleoEngenharia,
  type SnapshotTecnicoEconomicoRecursoRealizado
} from "@/lib/engineering-core";
import {
  boletimDiarioProducaoSchema,
  recursoBoletimDiarioProducaoSchema,
  type BoletimDiarioProducaoInput,
  type RecursoBoletimDiarioProducaoInput
} from "@/lib/validators/boletim-diario-producao";
import { execucaoSchema, type ExecucaoInput } from "@/lib/validators/execucao";
import {
  salvarEncargosEconomicosExecucaoSchema,
  type SalvarEncargosEconomicosExecucaoInput
} from "@/lib/validators/execucao-encargos";
import {
  resolverFormaCusteioEquipamento,
  type EquipamentoCusteioResolucaoInput,
  type FormaCusteioResolvida
} from "@/lib/biblioteca-recursos/formas-custeio";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { parseDateOnlyEnd, parseDateOnlyStart } from "@/lib/utils/date";
import { registrarReferenciaPrevistaExecucao } from "./comparativo";

type DbClient = {
  execucao: {
    create: (args: Prisma.ExecucaoCreateArgs) => Promise<unknown>;
    findFirst: (args: Prisma.ExecucaoFindFirstArgs) => Promise<unknown>;
    findMany: (args: Prisma.ExecucaoFindManyArgs) => Promise<unknown>;
    update: (args: Prisma.ExecucaoUpdateArgs) => Promise<unknown>;
  };
  frenteExecutada: {
    create?: (args: Prisma.FrenteExecutadaCreateArgs) => Promise<unknown>;
    deleteMany: (args: Prisma.FrenteExecutadaDeleteManyArgs) => Promise<unknown>;
    update?: (args: Prisma.FrenteExecutadaUpdateArgs) => Promise<unknown>;
  };
  resultadoExecucao: {
    create: (args: Prisma.ResultadoExecucaoCreateArgs) => Promise<unknown>;
  };
  boletimDiarioProducao: {
    create: (args: Prisma.BoletimDiarioProducaoCreateArgs) => Promise<unknown>;
    findFirst: (args: Prisma.BoletimDiarioProducaoFindFirstArgs) => Promise<unknown>;
    update: (args: Prisma.BoletimDiarioProducaoUpdateArgs) => Promise<unknown>;
    delete?: (args: Prisma.BoletimDiarioProducaoDeleteArgs) => Promise<unknown>;
  };
  recursoBoletimDiario: {
    create: (args: Prisma.RecursoBoletimDiarioCreateArgs) => Promise<unknown>;
    findFirst?: (args: Prisma.RecursoBoletimDiarioFindFirstArgs) => Promise<unknown>;
    findMany?: (args: Prisma.RecursoBoletimDiarioFindManyArgs) => Promise<unknown>;
    update?: (args: Prisma.RecursoBoletimDiarioUpdateArgs) => Promise<unknown>;
    delete?: (args: Prisma.RecursoBoletimDiarioDeleteArgs) => Promise<unknown>;
  };
  encargoEconomicoExecucao?: {
    deleteMany: (args: Prisma.EncargoEconomicoExecucaoDeleteManyArgs) => Promise<unknown>;
    createMany: (args: Prisma.EncargoEconomicoExecucaoCreateManyArgs) => Promise<unknown>;
  };
  lancamentoDiario?: {
    findMany: (args: Prisma.LancamentoDiarioFindManyArgs) => Promise<unknown>;
  };
  orcamento?: {
    findFirst: (args: Prisma.OrcamentoFindFirstArgs) => Promise<unknown>;
    findMany?: (args: Prisma.OrcamentoFindManyArgs) => Promise<unknown>;
  };
  execucaoReferenciaPrevista?: {
    upsert: (args: Prisma.ExecucaoReferenciaPrevistaUpsertArgs) => Promise<unknown>;
  };
};

export const EXECUCAO_RESULTADO_NUCLEO_VERSAO = "engineering-core-v1";

type PersistedRecursoRealizado = {
  id: string;
  recursoId?: string | null;
  nomeSnapshot: string;
  quantidadeRealizada: unknown;
  unidadeRealizada: string;
  quantidadeRecursos?: unknown;
  snapshotTecnicoEconomico: unknown;
};

type PersistedFrenteExecutada = {
  id: string;
  nome?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  quantidadeExecutada: unknown;
  receitaRealizada: unknown;
  motivoVariacaoReceita?: string | null;
  recursos?: PersistedRecursoRealizado[];
};

type PersistedExecucao = {
  id: string;
  descricao?: string | null;
  empresaId: string;
  clienteId?: string | null;
  obraId?: string | null;
  origem?: unknown;
  status?: unknown;
  orcamentoOrigemId?: string | null;
  propostaOrigemId?: string | null;
  cenarioOrigemId?: string | null;
  estadoEncargos?: EstadoEncargosExecucao | string | null;
  frentes?: PersistedFrenteExecutada[];
  resultados?: unknown[];
  encargosEconomicos?: PersistedEncargoEconomicoExecucao[];
};

type PersistedEncargoEconomicoExecucao = {
  id: string;
  tipo: string;
  descricao: string;
  formaCalculo: FormaCalculoEncargoExecucao | string;
  percentual?: unknown;
  valorInformado?: unknown;
  observacao?: string | null;
  origem: OrigemEncargoExecucao | string;
};

type PersistedRecursoBoletimDiario = {
  id: string;
  frenteExecutadaId: string;
  recursoId?: string | null;
  nomeSnapshot: string;
  quantidadeRealizada: unknown;
  unidadeRealizada: string;
  quantidadeRecursos?: unknown;
  origem: OrigemFatoBoletimDiario;
  origemRegistroTipo?: string | null;
  origemRegistroId?: string | null;
  origemRegistroData?: Date | null;
  editavel?: boolean;
  snapshotTecnicoEconomico: unknown;
};

type PersistedBoletimDiario = {
  id: string;
  empresaId: string;
  execucaoId: string;
  dataBoletim: Date;
  status: StatusBoletimDiarioProducao;
  recursos?: PersistedRecursoBoletimDiario[];
};

type PersistedExecucaoComBoletins = PersistedExecucao & {
  boletins?: PersistedBoletimDiario[];
};

export const execucaoInclude = {
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
  orcamentoOrigem: {
    select: {
      id: true,
      codigo: true,
      titulo: true
    }
  },
  propostaOrigem: {
    select: {
      id: true,
      codigo: true,
      revisao: true,
      status: true
    }
  },
  cenarioOrigem: {
    select: {
      id: true,
      ordem: true,
      nome: true
    }
  },
  frentes: {
    include: {
      recursos: {
        include: {
          recurso: {
            select: {
              id: true,
              placaOuTag: true,
              descricao: true,
              tipoRecurso: true,
              classeOperacional: true
            }
          }
        },
        orderBy: [{ createdAt: "asc" as const }]
      }
    },
    orderBy: [{ createdAt: "asc" as const }]
  },
  resultados: {
    orderBy: [{ createdAt: "desc" as const }]
  },
  encargosEconomicos: {
    orderBy: [{ createdAt: "asc" as const }]
  }
} satisfies Prisma.ExecucaoInclude;

export const boletimDiarioProducaoInclude = {
  recursos: {
    include: {
      frenteExecutada: {
        select: {
          id: true,
          nome: true,
          execucaoId: true
        }
      },
      recurso: {
        select: {
          id: true,
          placaOuTag: true,
          descricao: true,
          tipoRecurso: true,
          classeOperacional: true
        }
      }
    },
    orderBy: [{ createdAt: "asc" as const }]
  },
  execucao: {
    include: {
      frentes: {
        include: {
          recursos: {
            orderBy: [{ createdAt: "asc" as const }]
          }
        },
        orderBy: [{ createdAt: "asc" as const }]
      },
      boletins: {
        where: {
          status: {
            in: [
              StatusBoletimDiarioProducao.ABERTO,
              StatusBoletimDiarioProducao.FECHADO
            ]
          }
        },
        include: {
          recursos: {
            orderBy: [{ createdAt: "asc" as const }]
          }
        },
        orderBy: [{ dataBoletim: "asc" as const }]
      },
      resultados: {
        orderBy: [{ createdAt: "desc" as const }]
      },
      encargosEconomicos: {
        orderBy: [{ createdAt: "asc" as const }]
      }
    }
  }
} satisfies Prisma.BoletimDiarioProducaoInclude;

export const execucaoOperacionalInclude = {
  ...execucaoInclude,
  boletins: {
    include: {
      recursos: {
        include: {
          recurso: {
            select: {
              id: true,
              placaOuTag: true,
              descricao: true,
              tipoRecurso: true,
              classeOperacional: true
            }
          }
        },
        orderBy: [{ createdAt: "asc" as const }]
      }
    },
    orderBy: [{ dataBoletim: "desc" as const }]
  },
  referenciaPrevista: true,
  encargosEconomicos: {
    orderBy: [{ createdAt: "asc" as const }]
  }
} satisfies Prisma.ExecucaoInclude;

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumeroTecnico(value: unknown): string | number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return null;
}

function toSnapshotTecnicoEconomico(value: unknown): SnapshotTecnicoEconomicoRecursoRealizado {
  return typeof value === "object" && value !== null
    ? (value as SnapshotTecnicoEconomicoRecursoRealizado)
    : {};
}

function adaptarEncargosEconomicosExecucao(encargos?: PersistedEncargoEconomicoExecucao[]) {
  return (encargos ?? []).map((encargo) => ({
    id: encargo.id,
    tipo: encargo.tipo,
    descricao: encargo.descricao,
    formaCalculo: encargo.formaCalculo as FormaCalculoEncargoExecucao,
    percentual: encargo.percentual === null || encargo.percentual === undefined ? undefined : toNumber(encargo.percentual),
    valorInformado: encargo.valorInformado === null || encargo.valorInformado === undefined ? undefined : toNumber(encargo.valorInformado),
    observacao: encargo.observacao ?? null,
    origem: encargo.origem as OrigemEncargoExecucao
  }));
}

function recursoTemCustoPendente(recurso: { snapshotTecnicoEconomico: unknown }) {
  const snapshot = toSnapshotTecnicoEconomico(recurso.snapshotTecnicoEconomico);
  const avaliacao = avaliarSnapshotTecnicoEconomico(snapshot);

  return avaliacao.status === "CUSTO_PENDENTE" || avaliacao.status === "NAO_INFORMADO";
}

function validarCustosDefinidos(recursos: Array<{ snapshotTecnicoEconomico: unknown }>) {
  if (recursos.some(recursoTemCustoPendente)) {
    throw new Error("EXISTEM_RECURSOS_COM_CUSTO_PENDENTE");
  }
}

function requireLancamentoDiarioDelegate(db: DbClient) {
  if (!db.lancamentoDiario) {
    throw new Error("FONTE_LANCAMENTO_DIARIO_NAO_DISPONIVEL");
  }

  return db.lancamentoDiario;
}

function requireRecursoBoletimReadDelegate(db: DbClient) {
  if (!db.recursoBoletimDiario.findFirst || !db.recursoBoletimDiario.findMany) {
    throw new Error("RECURSO_BOLETIM_DIARIO_CONSULTA_NAO_DISPONIVEL");
  }

  return {
    findFirst: db.recursoBoletimDiario.findFirst,
    findMany: db.recursoBoletimDiario.findMany
  };
}

function requireRecursoBoletimDeleteDelegate(db: DbClient) {
  if (!db.recursoBoletimDiario.delete) {
    throw new Error("RECURSO_BOLETIM_DIARIO_REMOCAO_NAO_DISPONIVEL");
  }

  return db.recursoBoletimDiario.delete;
}

function requireRecursoBoletimUpdateDelegate(db: DbClient) {
  if (!db.recursoBoletimDiario.update) {
    throw new Error("RECURSO_BOLETIM_DIARIO_ATUALIZACAO_NAO_DISPONIVEL");
  }

  return db.recursoBoletimDiario.update;
}

function requireEncargoEconomicoDelegate(db: DbClient) {
  if (!db.encargoEconomicoExecucao) {
    throw new Error("ENCARGO_ECONOMICO_EXECUCAO_NAO_DISPONIVEL");
  }

  return db.encargoEconomicoExecucao;
}

function requireFrenteExecutadaUpdateDelegate(db: DbClient) {
  if (!db.frenteExecutada.update) {
    throw new Error("FRENTE_EXECUTADA_ATUALIZACAO_NAO_DISPONIVEL");
  }

  return db.frenteExecutada.update;
}

function requireFrenteExecutadaCreateDelegate(db: DbClient) {
  if (!db.frenteExecutada.create) {
    throw new Error("FRENTE_EXECUTADA_CRIACAO_NAO_DISPONIVEL");
  }

  return db.frenteExecutada.create;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function enumToUnit(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function inferOrigemFato(unidade: string) {
  const normalized = unidade.toLowerCase();
  return normalized.includes("hora") || normalized === "h" || normalized.includes("diaria")
    ? OrigemFatoBoletimDiario.APONTAMENTO
    : OrigemFatoBoletimDiario.PRODUCAO;
}

function inferBaseEconomicaFromUnidade(value: unknown) {
  const normalized = String(value ?? "").toUpperCase();

  if (normalized.includes("HORA")) return "HORA";
  if (normalized.includes("DIARIA") || normalized.includes("DIA")) return "DIA";
  if (normalized.includes("CARGA")) return "CARGA";
  if (normalized.includes("M3")) return "M3";
  if (normalized.includes("KM")) return "KM";
  return "UNIDADE";
}

function unidadeCustoFromBase(base: string) {
  const suffix: Record<string, string> = {
    HORA: "h",
    DIA: "dia",
    CARGA: "carga",
    VIAGEM: "viagem",
    KM: "km",
    M3: "m3",
    M2: "m2",
    MES: "mes",
    CUSTO_FIXO: "",
    UNIDADE: "un"
  };

  return base === "CUSTO_FIXO" ? "R$" : `R$/${suffix[base] ?? "un"}`;
}

function buildFormaCusteioSnapshotFields(
  equipamento: EquipamentoCusteioResolucaoInput,
  resolucao: FormaCusteioResolvida
) {
  const valorAplicado = resolucao.valorAplicado ?? 0;

  return {
    equipamentoId: equipamento.id ?? null,
    referenciaTecnicaRecursoId: resolucao.referenciaTecnicaId ?? equipamento.referenciaTecnicaId ?? equipamento.referenciaTecnica?.id ?? null,
    referenciaTecnicaNome: resolucao.referenciaTecnicaNome ?? equipamento.referenciaTecnica?.nome ?? null,
    formaCusteioRecursoId: resolucao.forma?.id ?? null,
    formaCusteioNome: resolucao.forma?.nome ?? null,
    origemFormaCusteio: resolucao.origem,
    baseEconomica: resolucao.baseEconomica,
    valorCusto: valorAplicado,
    custoUnitario: valorAplicado,
    unidadeCusto: resolucao.unidadeCusto,
    valorReferenciaCusteio: resolucao.valorReferencia ?? null,
    valorAplicadoCusteio: resolucao.valorAplicado ?? null
  };
}

function buildFrentesCreate(input: ExecucaoInput, empresaId: string) {
  return input.frentes.filter((frente) =>
    Boolean(
      frente.nome?.trim() ||
      frente.descricao?.trim() ||
      frente.unidade?.trim() ||
      frente.quantidadeExecutada !== null && frente.quantidadeExecutada !== undefined ||
      frente.receitaRealizada !== null && frente.receitaRealizada !== undefined ||
      frente.motivoVariacaoReceita?.trim() ||
      frente.recursos.length
    )
  ).map((frente) => ({
    empresaId,
    nome: clean(frente.nome),
    descricao: clean(frente.descricao),
    unidade: clean(frente.unidade),
    quantidadeExecutada: frente.quantidadeExecutada ?? null,
    receitaRealizada: frente.receitaRealizada ?? null,
    motivoVariacaoReceita: clean(frente.motivoVariacaoReceita),
    recursos: {
      create: frente.recursos.map((recurso) => ({
        empresaId,
        recursoId: recurso.recursoId || null,
        nomeSnapshot: recurso.nomeSnapshot,
        quantidadeRealizada: recurso.quantidadeRealizada,
        unidadeRealizada: recurso.unidadeRealizada,
        quantidadeRecursos: recurso.quantidadeRecursos ?? null,
        snapshotTecnicoEconomico: recurso.snapshotTecnicoEconomico as Prisma.InputJsonValue
      }))
    }
  }));
}

function buildRecursosBoletimCreate(input: BoletimDiarioProducaoInput, empresaId: string) {
  return input.recursos.map((recurso) => ({
    empresaId,
    execucaoId: input.execucaoId,
    frenteExecutadaId: recurso.frenteExecutadaId,
    recursoId: recurso.recursoId || null,
    nomeSnapshot: recurso.nomeSnapshot,
    quantidadeRealizada: recurso.quantidadeRealizada,
    unidadeRealizada: recurso.unidadeRealizada,
    quantidadeRecursos: recurso.quantidadeRecursos ?? null,
    origem: recurso.origem,
    origemRegistroTipo: clean(recurso.origemRegistroTipo),
    origemRegistroId: clean(recurso.origemRegistroId),
    origemRegistroData: recurso.origemRegistroData ?? null,
    editavel: recurso.editavel ?? true,
    snapshotTecnicoEconomico: recurso.snapshotTecnicoEconomico as Prisma.InputJsonValue,
    observacao: clean(recurso.observacao)
  }));
}

function buildExecucaoData(input: ExecucaoInput, empresaId: string) {
  return {
    empresaId,
    clienteId: input.clienteId || null,
    obraId: input.obraId || null,
    descricao: clean(input.descricao),
    origem: input.origem,
    status: input.status,
    dataInicio: input.dataInicio ?? null,
    dataFim: input.dataFim ?? null,
    observacoes: clean(input.observacoes),
    orcamentoOrigemId: input.orcamentoOrigemId || null,
    propostaOrigemId: input.propostaOrigemId || null,
    cenarioOrigemId: input.cenarioOrigemId || null
  };
}

function requireOrcamentoDelegate(db: DbClient) {
  if (!db.orcamento) {
    throw new Error("ORCAMENTO_DELEGATE_INDISPONIVEL");
  }

  return db.orcamento;
}

function requireReferenciaPrevistaDelegate(db: DbClient) {
  if (!db.execucaoReferenciaPrevista) {
    throw new Error("REFERENCIA_PREVISTA_DELEGATE_INDISPONIVEL");
  }

  return db.execucaoReferenciaPrevista;
}

function valorPrevistoFrente(frente: { itens?: Array<Record<string, unknown>> }) {
  return (frente.itens ?? []).reduce((total, item) => {
    if (item.tipoItem === "RECURSO") return total;
    if (item.formaApresentacaoComercial === "PRECO_UNITARIO_REFERENCIAL") return total;
    return total + toNumber(item.valorTotal);
  }, 0);
}

function mapOrcamentoItemParaReferencia(item: Record<string, unknown>, frenteExecutadaId: string) {
  return {
    tempId: String(item.id ?? ""),
    localId: String(item.id ?? ""),
    frenteTempId: frenteExecutadaId,
    ordem: toNumber(item.ordem),
    tipoItem: typeof item.tipoItem === "string" ? item.tipoItem : null,
    categoriaRecurso: typeof item.categoriaRecurso === "string" ? item.categoriaRecurso : null,
    descricao: typeof item.descricao === "string" ? item.descricao : null,
    recursoNome: typeof item.recursoNome === "string" ? item.recursoNome : null,
    classeOperacional: typeof item.classeOperacional === "string" ? item.classeOperacional : null,
    recursoReferenciaId: typeof item.recursoReferenciaId === "string" ? item.recursoReferenciaId : null,
    quantidade: toNumeroTecnico(item.quantidade),
    quantidadeOperacional: toNumeroTecnico(item.quantidadeOperacional),
    origemQuantidadeOperacional: typeof item.origemQuantidadeOperacional === "string" ? item.origemQuantidadeOperacional : null,
    unidadeQuantidadeOperacional: typeof item.unidadeQuantidadeOperacional === "string" ? item.unidadeQuantidadeOperacional : null,
    custoUnitario: toNumeroTecnico(item.custoUnitario),
    unidade: typeof item.unidade === "string" ? item.unidade : null,
    tipoCalculoRecurso: typeof item.tipoCalculoRecurso === "string" ? item.tipoCalculoRecurso : null,
    unidadeEconomicaCusto: typeof item.unidadeEconomicaCusto === "string" ? item.unidadeEconomicaCusto : null,
    valorCusto: toNumeroTecnico(item.valorCusto),
    horasDia: toNumeroTecnico(item.horasDia),
    horasTotais: toNumeroTecnico(item.horasTotais),
    viagensDia: toNumeroTecnico(item.viagensDia),
    viagensTotais: toNumeroTecnico(item.viagensTotais),
    distanciaViagemKm: toNumeroTecnico(item.distanciaViagemKm),
    quilometrosTotais: toNumeroTecnico(item.quilometrosTotais),
    capacidadePorViagem: toNumeroTecnico(item.capacidadePorViagem),
    unidadeCapacidade: typeof item.unidadeCapacidade === "string" ? item.unidadeCapacidade : null,
    cargasTotais: toNumeroTecnico(item.cargasTotais),
    mesesTotais: toNumeroTecnico(item.mesesTotais),
    diasTrabalhadosMes: toNumeroTecnico(item.diasTrabalhadosMes)
  };
}

type OrcamentoReferenciaFrente = Record<string, unknown> & {
  id: string;
  itens?: Array<Record<string, unknown>>;
  receitaPrevista: number;
};

type OrcamentoReferenciaExecucao = {
  input: ExecucaoInput;
  orcamento: Record<string, unknown>;
  frentes: OrcamentoReferenciaFrente[];
};

async function resolverReferenciaOrcamentoExecucao(
  db: DbClient,
  input: ExecucaoInput,
  empresaId: string
): Promise<OrcamentoReferenciaExecucao | null> {
  if (input.origem !== OrigemExecucao.ORCAMENTO) {
    return null;
  }

  const orcamentoId = input.orcamentoOrigemId;
  const frenteIds = Array.from(new Set([
    ...(input.frenteOrigemIds ?? []),
    ...(input.frenteOrigemId ? [input.frenteOrigemId] : [])
  ]));

  if (!orcamentoId || !frenteIds.length) {
    throw new Error("REFERENCIA_ORCAMENTO_INCOMPLETA");
  }

  const orcamento = await requireOrcamentoDelegate(db).findFirst({
    where: {
      id: orcamentoId,
      empresaId,
      deletedAt: null,
      ...(input.clienteId ? { clienteId: input.clienteId } : {}),
      ...(input.obraId ? { obraId: input.obraId } : {})
    },
    select: {
      id: true,
      codigo: true,
      titulo: true,
      clienteId: true,
      obraId: true,
      frentes: {
        where: {
          id: {
            in: frenteIds
          }
        },
        select: {
          id: true,
          cenarioId: true,
          ordem: true,
          natureza: true,
          nome: true,
          descricao: true,
          unidadeProducao: true,
          quantidadePrevista: true,
          produtividadeDia: true,
          prazoEstimadoDias: true,
          prazoTeoricoDias: true,
          prazoAdotadoDias: true,
          origemPrazo: true,
          modoCusto: true,
          custoManual: true,
          itens: {
            orderBy: [{ ordem: "asc" }],
            select: {
              id: true,
              ordem: true,
              tipoItem: true,
              formaApresentacaoComercial: true,
              categoriaRecurso: true,
              descricao: true,
              recursoNome: true,
              classeOperacional: true,
              recursoReferenciaId: true,
              quantidade: true,
              quantidadeOperacional: true,
              origemQuantidadeOperacional: true,
              unidadeQuantidadeOperacional: true,
              custoUnitario: true,
              unidade: true,
              tipoCalculoRecurso: true,
              unidadeEconomicaCusto: true,
              valorCusto: true,
              horasDia: true,
              horasTotais: true,
              viagensDia: true,
              viagensTotais: true,
              distanciaViagemKm: true,
              quilometrosTotais: true,
              capacidadePorViagem: true,
              unidadeCapacidade: true,
              cargasTotais: true,
              mesesTotais: true,
              diasTrabalhadosMes: true,
              valorTotal: true
            }
          }
        }
      }
    }
  }) as (Record<string, unknown> & { frentes?: Array<Record<string, unknown> & { itens?: Array<Record<string, unknown>> }> }) | null;

  if (!orcamento) {
    throw new Error("ORCAMENTO_REFERENCIA_NAO_ENCONTRADO");
  }

  const frentes = orcamento.frentes ?? [];

  if (frentes.length !== frenteIds.length) {
    throw new Error("FRENTE_ORCAMENTO_NAO_ENCONTRADA");
  }

  const frentesOrdenadas: OrcamentoReferenciaFrente[] = frenteIds.map((id) => {
    const frente = frentes.find((item) => item.id === id);
    if (!frente) {
      throw new Error("FRENTE_ORCAMENTO_NAO_ENCONTRADA");
    }

    return {
      ...frente,
      id: String(frente.id ?? ""),
      receitaPrevista: valorPrevistoFrente(frente)
    };
  });
  const descricao = clean(input.descricao) ?? String(orcamento.titulo ?? orcamento.codigo ?? frentesOrdenadas[0]?.nome ?? "Execucao vinculada a orcamento");

  return {
    input: {
      ...input,
      clienteId: String(orcamento.clienteId ?? input.clienteId ?? ""),
      obraId: typeof orcamento.obraId === "string" ? orcamento.obraId : input.obraId,
      descricao,
      cenarioOrigemId: typeof frentesOrdenadas[0]?.cenarioId === "string" ? frentesOrdenadas[0].cenarioId : input.cenarioOrigemId,
      frentes: frentesOrdenadas.map((frente, index) => {
        const frenteRealizadaInput = input.frentes[index];

        return {
          nome: String(frente.nome ?? "Frente do orcamento"),
          descricao: typeof frente.descricao === "string" ? frente.descricao : "",
          unidade: typeof frente.unidadeProducao === "string" ? frente.unidadeProducao : "",
          quantidadeExecutada: frente.quantidadePrevista === null || frente.quantidadePrevista === undefined ? null : toNumber(frente.quantidadePrevista),
          receitaRealizada: frenteRealizadaInput?.receitaRealizada ?? null,
          motivoVariacaoReceita: clean(frenteRealizadaInput?.motivoVariacaoReceita) ?? "",
          recursos: []
        };
      })
    },
    orcamento,
    frentes: frentesOrdenadas
  };
}

async function registrarReferenciaPrevistaOrcamento(
  db: DbClient,
  execucao: PersistedExecucao,
  referencia: OrcamentoReferenciaExecucao
) {
  requireReferenciaPrevistaDelegate(db);
  const frentesExecutadas = execucao.frentes ?? [];

  if (frentesExecutadas.length !== referencia.frentes.length) {
    throw new Error("FRENTE_EXECUCAO_NAO_CRIADA");
  }

  const frentesEntrada = referencia.frentes.map((frente, index) => {
    const frenteExecutada = frentesExecutadas[index];

    return {
      localId: frenteExecutada.id,
      tempId: frenteExecutada.id,
      origemFrenteId: String(frente.id ?? ""),
      ordem: toNumber(frente.ordem),
      natureza: typeof frente.natureza === "string" ? frente.natureza : null,
      nome: typeof frente.nome === "string" ? frente.nome : null,
      descricao: typeof frente.descricao === "string" ? frente.descricao : null,
      unidadeProducao: typeof frente.unidadeProducao === "string" ? frente.unidadeProducao : null,
      quantidadePrevista: toNumeroTecnico(frente.quantidadePrevista),
      receitaPrevista: frente.receitaPrevista,
      produtividadeDia: toNumeroTecnico(frente.produtividadeDia),
      prazoEstimadoDias: toNumeroTecnico(frente.prazoEstimadoDias),
      prazoTeoricoDias: toNumeroTecnico(frente.prazoTeoricoDias),
      prazoAdotadoDias: toNumeroTecnico(frente.prazoAdotadoDias),
      origemPrazo: typeof frente.origemPrazo === "string" ? frente.origemPrazo : null,
      modoCusto: typeof frente.modoCusto === "string" ? frente.modoCusto : null,
      custoManual: toNumeroTecnico(frente.custoManual)
    };
  });

  const itensEntrada = referencia.frentes.flatMap((frente, index) =>
    (frente.itens ?? []).map((item) => mapOrcamentoItemParaReferencia(item, frentesExecutadas[index].id))
  );

  const entradaPrevista = adaptarOrcamentoParaEntradaNucleo({
    id: String(referencia.orcamento.id ?? ""),
    codigo: typeof referencia.orcamento.codigo === "string" ? referencia.orcamento.codigo : null,
    titulo: typeof referencia.orcamento.titulo === "string" ? referencia.orcamento.titulo : null,
    frentes: frentesEntrada,
    itens: itensEntrada
  });
  const resultadoPrevisto = executarNucleoComMotorAtual(entradaPrevista);

  await registrarReferenciaPrevistaExecucao(db as Parameters<typeof registrarReferenciaPrevistaExecucao>[0], {
    execucaoId: execucao.id,
    origem: OrigemReferenciaPrevistaExecucao.ORCAMENTO,
    orcamentoOrigemId: execucao.orcamentoOrigemId ?? null,
    propostaOrigemId: execucao.propostaOrigemId ?? null,
    cenarioOrigemId: execucao.cenarioOrigemId ?? null,
    frentesOrigem: referencia.frentes.map((frente, index) => ({
      frenteOrigemId: String(frente.id ?? ""),
      frenteExecutadaId: frentesExecutadas[index].id,
      nome: typeof frente.nome === "string" ? frente.nome : null,
      ordem: toNumber(frente.ordem)
    })),
    resultadoPrevisto
  });
}

export type SnapshotResultadoExecucao = {
  resultadoOperacional: Record<string, unknown>;
  economia: ResultadoNucleoEngenharia["consolidado"]["economia"];
  economiaUnidades: Array<{
    id: string;
    economia: NonNullable<ResultadoNucleoEngenharia["unidades"][number]["economia"]>;
  }>;
  dataCalculo: string;
  versaoNucleo: string;
};

function removerEconomiaUnidade(unidade: ResultadoNucleoEngenharia["unidades"][number]) {
  const { economia: _economia, recursos, ...operacional } = unidade;

  return {
    ...operacional,
    recursos: recursos.map((recurso) => {
      const { memoriaCalculo: _memoriaCalculo, ...recursoOperacional } = recurso;
      return recursoOperacional;
    })
  };
}

function extrairResultadoOperacional(resultado: ResultadoNucleoEngenharia): Record<string, unknown> {
  const { consolidado, unidades, memoriaCalculo: _memoriaCalculo, ...operacional } = resultado;
  const { economia: _economia, ...consolidadoOperacional } = consolidado;

  return {
    ...operacional,
    consolidado: consolidadoOperacional,
    unidades: unidades.map(removerEconomiaUnidade)
  };
}

export function adaptarExecucaoPersistidaParaEntradaNucleo(execucao: PersistedExecucao): EntradaExecucao {
  return {
    execucaoId: execucao.id,
    nomeTecnico: execucao.descricao ?? "Execucao sem descricao",
    metadados: {
      empresaId: execucao.empresaId
    },
    encargosEconomicos: adaptarEncargosEconomicosExecucao(execucao.encargosEconomicos),
    unidades: (execucao.frentes ?? []).map((frente) => ({
      id: frente.id,
      nome: frente.nome ?? "Frente sem descricao",
      descricaoTecnica: frente.descricao ?? null,
      quantidadeExecutada: toNumber(frente.quantidadeExecutada),
      unidade: frente.unidade ?? "",
      receitaRealizada: toNumber(frente.receitaRealizada),
      recursos: (frente.recursos ?? []).map((recurso) => ({
        id: recurso.id,
        recursoId: recurso.recursoId ?? null,
        origemRegistroTipo: null,
        origemRegistroId: null,
        nome: recurso.nomeSnapshot,
        quantidadeRealizada: toNumber(recurso.quantidadeRealizada),
        unidadeRealizada: recurso.unidadeRealizada,
        quantidadeRecursos: recurso.quantidadeRecursos === null || recurso.quantidadeRecursos === undefined
          ? undefined
          : toNumber(recurso.quantidadeRecursos),
        snapshotTecnicoEconomico: toSnapshotTecnicoEconomico(recurso.snapshotTecnicoEconomico)
      }))
    }))
  };
}

export function adaptarExecucaoComBoletinsParaEntradaNucleo(
  execucao: PersistedExecucaoComBoletins,
  options: { incluirBoletinsAbertos?: boolean } = {}
): EntradaExecucao {
  const recursosPorFrente = new Map<string, PersistedRecursoBoletimDiario[]>();

  for (const boletim of execucao.boletins ?? []) {
    if (!options.incluirBoletinsAbertos && boletim.status !== StatusBoletimDiarioProducao.FECHADO) {
      continue;
    }

    for (const recurso of boletim.recursos ?? []) {
      const atual = recursosPorFrente.get(recurso.frenteExecutadaId) ?? [];
      atual.push(recurso);
      recursosPorFrente.set(recurso.frenteExecutadaId, atual);
    }
  }

  return {
    execucaoId: execucao.id,
    nomeTecnico: execucao.descricao ?? "Execucao sem descricao",
    metadados: {
      empresaId: execucao.empresaId,
      origemFatos: "BOLETIM_DIARIO"
    },
    encargosEconomicos: adaptarEncargosEconomicosExecucao(execucao.encargosEconomicos),
    unidades: (execucao.frentes ?? []).map((frente) => ({
      id: frente.id,
      nome: frente.nome ?? "Frente sem descricao",
      descricaoTecnica: frente.descricao ?? null,
      quantidadeExecutada: toNumber(frente.quantidadeExecutada),
      unidade: frente.unidade ?? "",
      receitaRealizada: toNumber(frente.receitaRealizada),
      recursos: (recursosPorFrente.get(frente.id) ?? []).map((recurso) => ({
        id: recurso.id,
        recursoId: recurso.recursoId ?? null,
        origemRegistroTipo: recurso.origemRegistroTipo ?? null,
        origemRegistroId: recurso.origemRegistroId ?? null,
        nome: recurso.nomeSnapshot,
        quantidadeRealizada: toNumber(recurso.quantidadeRealizada),
        unidadeRealizada: recurso.unidadeRealizada,
        quantidadeRecursos: recurso.quantidadeRecursos === null || recurso.quantidadeRecursos === undefined
          ? undefined
          : toNumber(recurso.quantidadeRecursos),
        snapshotTecnicoEconomico: toSnapshotTecnicoEconomico(recurso.snapshotTecnicoEconomico)
      }))
    }))
  };
}

export function gerarSnapshotResultadoExecucao(resultado: ResultadoNucleoEngenharia): SnapshotResultadoExecucao {
  return {
    resultadoOperacional: extrairResultadoOperacional(resultado),
    economia: resultado.consolidado.economia,
    economiaUnidades: resultado.unidades
      .filter((unidade) => Boolean(unidade.economia))
      .map((unidade) => ({
        id: unidade.id,
        economia: unidade.economia as NonNullable<ResultadoNucleoEngenharia["unidades"][number]["economia"]>
      })),
    dataCalculo: new Date().toISOString(),
    versaoNucleo: EXECUCAO_RESULTADO_NUCLEO_VERSAO
  };
}

function recursosResultadoIds(resultado: unknown) {
  const json = resultado as Record<string, unknown> | null | undefined;
  const operacional = (json?.resultadoOperacional ?? json) as Record<string, unknown> | null | undefined;
  const unidades = (operacional?.unidades as Array<Record<string, unknown>> | undefined) ?? [];
  const recursos = unidades.flatMap((unidade) =>
    (unidade.recursos as Array<Record<string, unknown>> | undefined) ?? []
  );

  return new Set(recursos.flatMap((recurso) => [
    recurso.recursoBoletimId,
    recurso.recursoRealizadoId,
    recurso.id
  ].filter((value): value is string => typeof value === "string" && Boolean(value))));
}

function toComparableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round((parsed + Number.EPSILON) * 1_000_000) / 1_000_000 : 0;
}

function toComparableText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .toUpperCase();
}

function toComparableUnit(value: unknown) {
  const text = toComparableText(value);
  if (text === "CARGAS") return "CARGA";
  if (text === "VIAGENS") return "VIAGEM";
  if (text === "DIARIA") return "DIA";
  if (text === "DIARIAS") return "DIA";
  if (text === "HORAS") return "HORA";
  return text;
}

function assinaturaComponenteEconomico(value: Record<string, unknown>) {
  const baseEconomica = toComparableText(value.baseEconomica);
  const assinaturaBase: Record<string, unknown> = {
    baseEconomica: toComparableText(value.baseEconomica),
    custoUnitario: toComparableNumber(value.custoUnitario ?? value.valorCusto),
    quantidadeRecursos: toComparableNumber(value.quantidadeRecursos ?? 1),
    quantidadeOperacional: toComparableNumber(value.quantidadeOperacional),
    unidadeQuantidadeOperacional: toComparableUnit(value.unidadeQuantidadeOperacional)
  };

  if (baseEconomica === "DIA") {
    assinaturaBase.horasDia = toComparableNumber(value.horasDia);
    assinaturaBase.horasTotais = toComparableNumber(value.horasTotais);
  }

  if (baseEconomica === "HORA") {
    assinaturaBase.horasTotais = toComparableNumber(value.horasTotais);
  }

  if (baseEconomica === "KM") {
    assinaturaBase.distanciaViagemKm = toComparableNumber(value.distanciaViagemKm);
    assinaturaBase.quilometrosTotais = toComparableNumber(value.quilometrosTotais);
    assinaturaBase.viagensTotais = toComparableNumber(value.viagensTotais);
    assinaturaBase.cargasTotais = toComparableNumber(value.cargasTotais);
    assinaturaBase.capacidadePorViagem = toComparableNumber(value.capacidadePorViagem);
    assinaturaBase.unidadeCapacidade = toComparableText(value.unidadeCapacidade);
  }

  if (baseEconomica === "M3" || baseEconomica === "M2" || baseEconomica === "UNIDADE_PRODUZIDA") {
    assinaturaBase.capacidadePorViagem = toComparableNumber(value.capacidadePorViagem);
    assinaturaBase.unidadeCapacidade = toComparableText(value.unidadeCapacidade);
  }

  if (baseEconomica === "MES") {
    assinaturaBase.mesesTotais = toComparableNumber(value.mesesTotais);
    assinaturaBase.diasTrabalhadosMes = toComparableNumber(value.diasTrabalhadosMes);
  }

  return JSON.stringify(assinaturaBase);
}

function componentesResultado(resultado: unknown) {
  const json = resultado as Record<string, unknown> | null | undefined;
  const operacional = (json?.resultadoOperacional ?? json) as Record<string, unknown> | null | undefined;
  const unidades = (operacional?.unidades as Array<Record<string, unknown>> | undefined) ?? [];
  const recursos = unidades.flatMap((unidade) =>
    (unidade.recursos as Array<Record<string, unknown>> | undefined) ?? []
  );
  const componentes = recursos.flatMap((recurso) => {
    const explicit = recurso.componentesEconomicos as Array<Record<string, unknown>> | undefined;
    return Array.isArray(explicit) && explicit.length ? explicit : [recurso];
  });

  return new Map(componentes.flatMap((componente) => {
    const id = componente.id;
    return typeof id === "string" && id ? [[id, componente] as const] : [];
  }));
}

function componentesAtuaisExecucao(execucao: PersistedExecucaoComBoletins | PersistedExecucao) {
  const boletins = (execucao as PersistedExecucaoComBoletins).boletins ?? [];
  const entrada = boletins.length
    ? adaptarExecucaoComBoletinsParaEntradaNucleo(execucao as PersistedExecucaoComBoletins, { incluirBoletinsAbertos: true })
    : adaptarExecucaoPersistidaParaEntradaNucleo(execucao as PersistedExecucao);

  return adaptarExecucaoParaEntradaNucleo(entrada).unidades.flatMap((unidade) => unidade.recursos);
}

function resultadoMantemAssinaturaEconomicaAtual(
  execucao: PersistedExecucaoComBoletins | PersistedExecucao,
  resultado: { resultadoOperacionalJson: unknown }
) {
  const componentesAtuais = componentesAtuaisExecucao(execucao);
  if (!componentesAtuais.length) return true;

  const resultadoPorComponente = componentesResultado(resultado.resultadoOperacionalJson);
  return componentesAtuais.every((componenteAtual) => {
    if (!componenteAtual.id) return true;

    const componenteResultado = resultadoPorComponente.get(componenteAtual.id);
    if (!componenteResultado) return false;

    return assinaturaComponenteEconomico(componenteResultado) ===
      assinaturaComponenteEconomico(componenteAtual as unknown as Record<string, unknown>);
  });
}

function assinaturaEncargos(encargos: PersistedEncargoEconomicoExecucao[] | Array<Record<string, unknown>> | undefined) {
  return JSON.stringify((encargos ?? []).map((encargo) => ({
    id: String(encargo.id ?? ""),
    tipo: toComparableText(encargo.tipo),
    descricao: toComparableText(encargo.descricao),
    formaCalculo: toComparableText(encargo.formaCalculo),
    percentual: toComparableNumber(encargo.percentual),
    valorInformado: toComparableNumber(encargo.valorInformado),
    origem: toComparableText(encargo.origem)
  })));
}

function resultadoMantemEncargosAtuais(
  execucao: PersistedExecucaoComBoletins | PersistedExecucao,
  resultado: { economiaJson?: unknown }
) {
  const economiaJson = resultado.economiaJson as Record<string, unknown> | null | undefined;
  const economia = economiaJson?.economia as Record<string, unknown> | null | undefined;
  const encargosResultado = economia?.encargos as Array<Record<string, unknown>> | undefined;
  return assinaturaEncargos(execucao.encargosEconomicos) === assinaturaEncargos(encargosResultado);
}

function recursoAtualIds(execucao: PersistedExecucaoComBoletins | PersistedExecucao) {
  const boletins = (execucao as PersistedExecucaoComBoletins).boletins ?? [];
  const recursosBoletim = boletins.flatMap((boletim) => boletim.recursos ?? []);

  if (recursosBoletim.length) {
    return recursosBoletim.map((recurso) => recurso.id);
  }

  return (execucao.frentes ?? []).flatMap((frente) => (frente.recursos ?? []).map((recurso) => recurso.id));
}

function resultadoCobreRecursosAtuais(
  execucao: PersistedExecucaoComBoletins | PersistedExecucao,
  resultado: { resultadoOperacionalJson: unknown; economiaJson?: unknown }
) {
  const idsAtuais = recursoAtualIds(execucao);
  if (!idsAtuais.length) return resultadoMantemEncargosAtuais(execucao, resultado);

  const idsResultado = recursosResultadoIds(resultado.resultadoOperacionalJson);
  return idsAtuais.every((id) => idsResultado.has(id)) &&
    resultadoMantemAssinaturaEconomicaAtual(execucao, resultado) &&
    resultadoMantemEncargosAtuais(execucao, resultado);
}

function removerResultadosObsoletos<T extends PersistedExecucao | PersistedExecucaoComBoletins>(execucao: T): T {
  const resultados = (execucao.resultados ?? []) as Array<{ resultadoOperacionalJson: unknown; economiaJson?: unknown }>;
  if (!resultados.length) return execucao;

  return {
    ...execucao,
    resultados: resultados.filter((resultado) => resultadoCobreRecursosAtuais(execucao, resultado))
  };
}

export async function gerarResultadoExecucao(db: DbClient, execucao: PersistedExecucao) {
  const entrada = adaptarExecucaoPersistidaParaEntradaNucleo(execucao);
  return gerarResultadoExecucaoDaEntrada(db, execucao.empresaId, execucao.id, entrada);
}

function canGenerateInitialResult(execucao: PersistedExecucao) {
  return Boolean((execucao.frentes ?? []).length);
}

async function gerarResultadoExecucaoDaEntrada(
  db: DbClient,
  empresaId: string,
  execucaoId: string,
  entrada: EntradaExecucao,
  options: { estadoConsolidacao?: "PROVISORIO" | "HOMOLOGADO" } = {}
) {
  const resultado = executarNucleoComMotorAtual(adaptarExecucaoParaEntradaNucleo(entrada));
  const snapshot = gerarSnapshotResultadoExecucao(resultado);
  const estadoConsolidacao = options.estadoConsolidacao ?? "HOMOLOGADO";

  return db.resultadoExecucao.create({
    data: {
      empresaId,
      execucaoId,
      resultadoOperacionalJson: {
        resultadoOperacional: snapshot.resultadoOperacional,
        dataCalculo: snapshot.dataCalculo,
        versaoNucleo: snapshot.versaoNucleo,
        estadoConsolidacao
      } as Prisma.InputJsonValue,
      economiaJson: snapshot.economia
        ? ({
          economia: snapshot.economia,
          unidades: snapshot.economiaUnidades,
          dataCalculo: snapshot.dataCalculo,
          versaoNucleo: snapshot.versaoNucleo,
          estadoConsolidacao
          } as Prisma.InputJsonValue)
        : Prisma.JsonNull
    }
  });
}

export async function criarExecucao(db: DbClient, input: ExecucaoInput) {
  const parsed = execucaoSchema.parse(input);
  const empresaId = requireActiveTenantEmpresaId();
  const referenciaOrcamento = await resolverReferenciaOrcamentoExecucao(db, parsed, empresaId);
  const inputPersistencia = referenciaOrcamento?.input ?? parsed;

  const created = await db.execucao.create({
    data: {
      ...buildExecucaoData(inputPersistencia, empresaId),
      frentes: {
        create: buildFrentesCreate(inputPersistencia, empresaId)
      }
    },
    include: execucaoInclude
  }) as PersistedExecucao;

  if (referenciaOrcamento) {
    await registrarReferenciaPrevistaOrcamento(db, created, referenciaOrcamento);
  }

  const resultado = canGenerateInitialResult(created) ? await gerarResultadoExecucao(db, created) : null;

  return {
    ...created,
    resultados: resultado ? [resultado, ...(created.resultados ?? [])] : (created.resultados ?? [])
  };
}

export async function buscarExecucao(db: DbClient, id: string) {
  const empresaId = requireActiveTenantEmpresaId();

  return db.execucao.findFirst({
    where: {
      id,
      empresaId
    },
    include: execucaoInclude
  });
}

export async function listarExecucoes(db: DbClient) {
  const empresaId = requireActiveTenantEmpresaId();

  const execucoes = await db.execucao.findMany({
    where: {
      empresaId
    },
    include: execucaoOperacionalInclude,
    orderBy: [{ updatedAt: "desc" }]
  }) as PersistedExecucaoComBoletins[];

  return execucoes.map(removerResultadosObsoletos);
}

export async function listarReferenciasOrcamentoExecucao(db: DbClient, params: {
  clienteId?: string | null;
  obraId?: string | null;
  orcamentoId?: string | null;
}) {
  const empresaId = requireActiveTenantEmpresaId();
  const orcamentoDelegate = requireOrcamentoDelegate(db);

  if (!orcamentoDelegate.findMany) {
    throw new Error("ORCAMENTO_LIST_DELEGATE_INDISPONIVEL");
  }

  const orcamentos = await orcamentoDelegate.findMany({
    where: {
      empresaId,
      deletedAt: null,
      ...(params.clienteId ? { clienteId: params.clienteId } : {}),
      ...(params.obraId ? { obraId: params.obraId } : {}),
      ...(params.orcamentoId ? { id: params.orcamentoId } : {})
    },
    select: {
      id: true,
      codigo: true,
      titulo: true,
      clienteId: true,
      obraId: true,
      valorTotal: true,
      updatedAt: true,
      frentes: params.orcamentoId
        ? {
          orderBy: [{ ordem: "asc" }],
          select: {
            id: true,
            ordem: true,
            natureza: true,
            nome: true,
            descricao: true,
            unidadeProducao: true,
            quantidadePrevista: true,
            itens: {
              select: {
                tipoItem: true,
                formaApresentacaoComercial: true,
                valorTotal: true
              }
            }
          }
        }
        : false
    },
    orderBy: [{ updatedAt: "desc" }],
    take: params.orcamentoId ? 1 : 50
  }) as Array<Record<string, unknown> & { frentes?: Array<Record<string, unknown> & { itens?: Array<Record<string, unknown>> }> }>;

  return {
    orcamentos: orcamentos.map((orcamento) => ({
      id: String(orcamento.id),
      codigo: String(orcamento.codigo ?? ""),
      titulo: typeof orcamento.titulo === "string" ? orcamento.titulo : null,
      clienteId: String(orcamento.clienteId ?? ""),
      obraId: typeof orcamento.obraId === "string" ? orcamento.obraId : null,
      valorTotal: toNumber(orcamento.valorTotal)
    })),
    frentes: (orcamentos[0]?.frentes ?? []).map((frente) => ({
      id: String(frente.id),
      ordem: toNumber(frente.ordem),
      natureza: String(frente.natureza ?? ""),
      nome: String(frente.nome ?? "Frente sem nome"),
      descricao: typeof frente.descricao === "string" ? frente.descricao : null,
      unidade: typeof frente.unidadeProducao === "string" ? frente.unidadeProducao : null,
      quantidadePrevista: frente.quantidadePrevista === null || frente.quantidadePrevista === undefined ? null : toNumber(frente.quantidadePrevista),
      receitaPrevista: valorPrevistoFrente(frente)
    }))
  };
}

export async function buscarExecucaoOperacional(db: DbClient, id: string) {
  const empresaId = requireActiveTenantEmpresaId();

  const execucao = await db.execucao.findFirst({
    where: {
      id,
      empresaId
    },
    include: execucaoOperacionalInclude
  }) as PersistedExecucaoComBoletins | null;

  return execucao ? removerResultadosObsoletos(execucao) : null;
}

export async function atualizarExecucao(db: DbClient, id: string, input: ExecucaoInput) {
  const parsed = execucaoSchema.parse(input);
  const empresaId = requireActiveTenantEmpresaId();
  const atual = await db.execucao.findFirst({
    where: {
      id,
      empresaId
    },
    select: {
      id: true
    }
  });

  if (!atual) {
    throw new Error("EXECUCAO_NAO_ENCONTRADA");
  }

  await db.frenteExecutada.deleteMany({
    where: {
      execucaoId: id,
      empresaId
    }
  });

  const updated = await db.execucao.update({
    where: {
      id
    },
    data: {
      ...buildExecucaoData(parsed, empresaId),
      frentes: {
        create: buildFrentesCreate(parsed, empresaId)
      }
    },
    include: execucaoInclude
  }) as PersistedExecucao;
  const resultado = canGenerateInitialResult(updated) ? await gerarResultadoExecucao(db, updated) : null;

  return {
    ...updated,
    resultados: resultado ? [resultado, ...(updated.resultados ?? [])] : (updated.resultados ?? [])
  };
}

export async function atualizarCabecalhoExecucao(db: DbClient, id: string, input: ExecucaoInput) {
  const parsed = execucaoSchema.parse(input);
  const empresaId = requireActiveTenantEmpresaId();
  const atual = await db.execucao.findFirst({
    where: {
      id,
      empresaId
    },
    include: {
      frentes: {
        orderBy: {
          createdAt: "asc"
        },
        take: 1
      }
    }
  }) as PersistedExecucao | null;

  if (!atual) {
    throw new Error("EXECUCAO_NAO_ENCONTRADA");
  }

  await db.execucao.update({
    where: {
      id
    },
    data: buildExecucaoData(parsed, empresaId)
  });

  const frenteInput = parsed.frentes[0];
  const frenteAtual = atual.frentes?.[0];
  const frenteData = frenteInput ? {
    nome: clean(frenteInput.nome),
    descricao: clean(frenteInput.descricao),
    unidade: clean(frenteInput.unidade),
    quantidadeExecutada: frenteInput.quantidadeExecutada ?? null,
    receitaRealizada: frenteInput.receitaRealizada ?? null,
    motivoVariacaoReceita: clean(frenteInput.motivoVariacaoReceita)
  } : null;

  if (frenteAtual && frenteData) {
    const updateFrente = requireFrenteExecutadaUpdateDelegate(db);
    await updateFrente({
      where: {
        id: frenteAtual.id
      },
      data: frenteData
    });
  } else if (!frenteAtual && frenteData && (
    frenteData.nome ||
    frenteData.descricao ||
    frenteData.unidade ||
    frenteData.quantidadeExecutada !== null ||
    frenteData.receitaRealizada !== null ||
    frenteData.motivoVariacaoReceita
  )) {
    const createFrente = requireFrenteExecutadaCreateDelegate(db);
    await createFrente({
      data: {
        empresaId,
        execucaoId: id,
        ...frenteData
      }
    });
  }

  return buscarExecucaoOperacional(db, id);
}

function encargoTemParametrosCompletos(encargo: SalvarEncargosEconomicosExecucaoInput["encargos"][number]) {
  if (encargo.formaCalculo === FormaCalculoEncargoExecucao.PERCENTUAL_SOBRE_RECEITA) {
    return encargo.percentual !== undefined;
  }

  return encargo.valorInformado !== undefined;
}

function resolverEstadoEncargos(input: SalvarEncargosEconomicosExecucaoInput) {
  if (input.estadoEncargos === EstadoEncargosExecucao.SEM_ENCARGOS) {
    return EstadoEncargosExecucao.SEM_ENCARGOS;
  }

  if (!input.encargos.length || input.encargos.some((encargo) => !encargoTemParametrosCompletos(encargo))) {
    return EstadoEncargosExecucao.ENCARGOS_PENDENTES;
  }

  return EstadoEncargosExecucao.COM_ENCARGOS;
}

export async function salvarEncargosEconomicosExecucao(
  db: DbClient,
  id: string,
  input: SalvarEncargosEconomicosExecucaoInput
) {
  const parsed = salvarEncargosEconomicosExecucaoSchema.parse(input);
  const empresaId = requireActiveTenantEmpresaId();
  const atual = await db.execucao.findFirst({
    where: {
      id,
      empresaId
    },
    select: {
      id: true
    }
  });

  if (!atual) {
    throw new Error("EXECUCAO_NAO_ENCONTRADA");
  }

  const estadoEncargos = resolverEstadoEncargos(parsed);
  const encargosDelegate = requireEncargoEconomicoDelegate(db);
  await encargosDelegate.deleteMany({
    where: {
      execucaoId: id,
      empresaId
    }
  });

  if (estadoEncargos !== EstadoEncargosExecucao.SEM_ENCARGOS && parsed.encargos.length) {
    await encargosDelegate.createMany({
      data: parsed.encargos.map((encargo) => ({
        empresaId,
        execucaoId: id,
        tipo: encargo.tipo.trim(),
        descricao: encargo.descricao.trim(),
        formaCalculo: encargo.formaCalculo,
        percentual: encargo.percentual ?? null,
        valorInformado: encargo.valorInformado ?? null,
        observacao: clean(encargo.observacao),
        origem: encargo.origem
      }))
    });
  }

  await db.execucao.update({
    where: {
      id
    },
    data: {
      estadoEncargos
    }
  });

  return buscarExecucaoOperacional(db, id);
}

function validarFrentesDoBoletim(execucao: PersistedExecucao, input: BoletimDiarioProducaoInput) {
  const frentesDaExecucao = new Set((execucao.frentes ?? []).map((frente) => frente.id));

  for (const recurso of input.recursos) {
    if (!frentesDaExecucao.has(recurso.frenteExecutadaId)) {
      throw new Error("FRENTE_EXECUTADA_NAO_PERTENCE_EXECUCAO");
    }
  }
}

export async function criarBoletimDiarioProducao(db: DbClient, input: BoletimDiarioProducaoInput) {
  const parsed = boletimDiarioProducaoSchema.parse(input);
  const empresaId = requireActiveTenantEmpresaId();
  const execucao = await db.execucao.findFirst({
    where: {
      id: parsed.execucaoId,
      empresaId
    },
    include: {
      frentes: {
        select: {
          id: true
        }
      }
    }
  }) as PersistedExecucao | null;

  if (!execucao) {
    throw new Error("EXECUCAO_NAO_ENCONTRADA");
  }

  validarFrentesDoBoletim(execucao, parsed);

  return db.boletimDiarioProducao.create({
    data: {
      empresaId,
      execucaoId: parsed.execucaoId,
      dataBoletim: parsed.dataBoletim,
      status: StatusBoletimDiarioProducao.ABERTO,
      observacoes: clean(parsed.observacoes),
      recursos: {
        create: buildRecursosBoletimCreate(parsed, empresaId)
      }
    },
    include: boletimDiarioProducaoInclude
  });
}

export async function adicionarRecursoBoletimDiarioProducao(
  db: DbClient,
  boletimId: string,
  input: RecursoBoletimDiarioProducaoInput
) {
  const parsed = recursoBoletimDiarioProducaoSchema.parse(input);
  const empresaId = requireActiveTenantEmpresaId();
  const boletim = await db.boletimDiarioProducao.findFirst({
    where: {
      id: boletimId,
      empresaId
    },
    include: boletimDiarioProducaoInclude
  }) as (PersistedBoletimDiario & { execucao: PersistedExecucao }) | null;

  if (!boletim) {
    throw new Error("BOLETIM_DIARIO_NAO_ENCONTRADO");
  }

  if (boletim.status !== StatusBoletimDiarioProducao.ABERTO) {
    throw new Error("BOLETIM_DIARIO_FECHADO_NAO_PERMITE_ALTERACAO");
  }

  validarFrentesDoBoletim(boletim.execucao, {
    execucaoId: boletim.execucaoId,
    dataBoletim: boletim.dataBoletim,
    recursos: [parsed]
  });

  return db.recursoBoletimDiario.create({
    data: {
      empresaId,
      execucaoId: boletim.execucaoId,
      boletimId,
      frenteExecutadaId: parsed.frenteExecutadaId,
      recursoId: parsed.recursoId || null,
      nomeSnapshot: parsed.nomeSnapshot,
      quantidadeRealizada: parsed.quantidadeRealizada,
      unidadeRealizada: parsed.unidadeRealizada,
      quantidadeRecursos: parsed.quantidadeRecursos ?? null,
      origem: parsed.origem,
      origemRegistroTipo: clean(parsed.origemRegistroTipo),
      origemRegistroId: clean(parsed.origemRegistroId),
      origemRegistroData: parsed.origemRegistroData ?? null,
      editavel: parsed.editavel ?? true,
      snapshotTecnicoEconomico: parsed.snapshotTecnicoEconomico as Prisma.InputJsonValue,
      observacao: clean(parsed.observacao)
    },
    include: {
      recurso: {
        select: {
          id: true,
          placaOuTag: true,
          descricao: true,
          tipoRecurso: true,
          classeOperacional: true
        }
      }
    }
  });
}

export async function atualizarRecursoBoletimDiarioProducao(
  db: DbClient,
  id: string,
  input: RecursoBoletimDiarioProducaoInput
) {
  const parsed = recursoBoletimDiarioProducaoSchema.parse(input);
  const empresaId = requireActiveTenantEmpresaId();
  const findDelegate = requireRecursoBoletimReadDelegate(db);
  const updateDelegate = requireRecursoBoletimUpdateDelegate(db);
  const atual = await findDelegate.findFirst({
    where: {
      id,
      empresaId
    },
    include: {
      boletim: {
        select: {
          status: true,
          execucaoId: true
        }
      }
    }
  }) as (PersistedRecursoBoletimDiario & { boletim: { status: StatusBoletimDiarioProducao; execucaoId: string } }) | null;

  if (!atual) {
    throw new Error("RECURSO_BOLETIM_DIARIO_NAO_ENCONTRADO");
  }

  if (atual.boletim.status !== StatusBoletimDiarioProducao.ABERTO) {
    throw new Error("BOLETIM_DIARIO_FECHADO_NAO_PERMITE_ALTERACAO");
  }

  return updateDelegate({
    where: {
      id
    },
    data: {
      frenteExecutadaId: parsed.frenteExecutadaId,
      recursoId: parsed.recursoId || null,
      nomeSnapshot: parsed.nomeSnapshot,
      quantidadeRealizada: parsed.quantidadeRealizada,
      unidadeRealizada: parsed.unidadeRealizada,
      quantidadeRecursos: parsed.quantidadeRecursos ?? null,
      origem: parsed.origem,
      origemRegistroTipo: clean(parsed.origemRegistroTipo) ?? atual.origemRegistroTipo ?? null,
      origemRegistroId: clean(parsed.origemRegistroId) ?? atual.origemRegistroId ?? null,
      origemRegistroData: parsed.origemRegistroData ?? atual.origemRegistroData ?? null,
      editavel: parsed.editavel ?? atual.editavel ?? true,
      snapshotTecnicoEconomico: parsed.snapshotTecnicoEconomico as Prisma.InputJsonValue,
      observacao: clean(parsed.observacao)
    },
    include: {
      recurso: {
        select: {
          id: true,
          placaOuTag: true,
          descricao: true,
          tipoRecurso: true,
          classeOperacional: true
        }
      }
    }
  });
}

const lancamentoFatoSelect = {
  id: true,
  empresaId: true,
  data: true,
  obraId: true,
  clienteId: true,
  servicoId: true,
  materialId: true,
  equipamentoId: true,
  quantidadeApontada: true,
  unidadeApontada: true,
  quantidadeFaturada: true,
  unidadeFaturada: true,
  origem: true,
  observacao: true,
  ficha: {
    select: {
      numero: true
    }
  },
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
  servico: {
    select: {
      id: true,
      codigo: true,
      tipoServico: true
    }
  },
  material: {
    select: {
      id: true,
      codigoMaterial: true,
      descricao: true,
      unidadePadrao: true
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
      custoPadrao: true,
      formasCusteio: {
        where: { ativo: true },
        select: {
          id: true,
          nome: true,
          valorReferencia: true,
          preferencial: true,
          ativo: true,
          unidadeCusteio: {
            select: {
              id: true,
              codigo: true,
              rotulo: true,
              baseEconomica: true,
              sufixo: true
            }
          }
        },
        orderBy: [{ preferencial: "desc" }, { nome: "asc" }]
      },
      referenciaTecnica: {
        select: {
          id: true,
          nome: true,
          formasCusteio: {
            where: { ativo: true },
            select: {
              id: true,
              nome: true,
              valorReferencia: true,
              preferencial: true,
              ativo: true,
              unidadeCusteio: {
                select: {
                  id: true,
                  codigo: true,
                  rotulo: true,
                  baseEconomica: true,
                  sufixo: true
                }
              }
            },
            orderBy: [{ preferencial: "desc" }, { nome: "asc" }]
          }
        }
      }
    }
  }
} satisfies Prisma.LancamentoDiarioSelect;

type LancamentoFato = Prisma.LancamentoDiarioGetPayload<{ select: typeof lancamentoFatoSelect }>;

export type FatoOperacionalExistente = {
  id: string;
  origemTipo: "LANCAMENTO_DIARIO";
  origemLabel: string;
  data: string;
  cliente: string;
  obra: string;
  recursoId: string | null;
  recurso: string;
  identificadorRecurso: string;
  servico: string;
  quantidade: number;
  unidade: string;
  origemFato: OrigemFatoBoletimDiario;
  materialId: string | null;
  materialCodigo: string | null;
  materialDescricao: string | null;
  materialUnidade: string | null;
  statusVinculo: "DISPONIVEL" | "VINCULADO";
  custoDisponivel: boolean;
  snapshotTecnicoEconomico: SnapshotTecnicoEconomicoRecursoRealizado;
};

export type ListarFatosOperacionaisInput = {
  execucaoId?: string | null;
  obraId?: string | null;
  dataInicio?: string | Date | null;
  dataFim?: string | Date | null;
  recursoId?: string | null;
  servicoId?: string | null;
};

function normalizeFiltroDateStart(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : parseDateOnlyStart(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeFiltroDateEnd(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : parseDateOnlyEnd(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildSnapshotFato(lancamento: LancamentoFato): SnapshotTecnicoEconomicoRecursoRealizado {
  const resolucaoCusteio = resolverFormaCusteioEquipamento(lancamento.equipamento);
  const formaSnapshot = buildFormaCusteioSnapshotFields(lancamento.equipamento, resolucaoCusteio);
  const baseEconomica = String(formaSnapshot.baseEconomica ?? inferBaseEconomicaFromUnidade(lancamento.unidadeApontada));
  const valorCusto = toNumber(formaSnapshot.valorCusto);
  const materialDescricao = lancamento.material?.descricao ?? null;

  return {
    ...formaSnapshot,
    categoria: String(lancamento.equipamento.tipoRecurso ?? "EQUIPAMENTO"),
    classeOperacional: lancamento.equipamento.classeOperacional ?? lancamento.equipamento.descricao,
    componenteEconomico: "TRANSPORTE",
    materialId: lancamento.material?.id ?? null,
    materialCodigo: lancamento.material?.codigoMaterial ?? null,
    materialDescricao,
    materialUnidade: lancamento.material?.unidadePadrao ?? null,
    baseEconomica: baseEconomica as SnapshotTecnicoEconomicoRecursoRealizado["baseEconomica"],
    valorCusto,
    unidadeCusto: formaSnapshot.unidadeCusto ?? unidadeCustoFromBase(baseEconomica),
    capacidadePorViagem: toNumber(lancamento.equipamento.capacidadeM3) || undefined,
    unidadeCapacidade: lancamento.equipamento.unidadeCapacidade ?? undefined,
    metadados: {
      versao: 1,
      origem: valorCusto > 0 ? "BIBLIOTECA_RECURSOS" : "CUSTO_NAO_CADASTRADO",
      origemRegistroTipo: "LANCAMENTO_DIARIO",
      origemRegistroId: lancamento.id,
      origemCusto: valorCusto > 0 ? resolucaoCusteio.origem : resolucaoCusteio.status === "MULTIPLAS_FORMAS" ? "PENDENTE_ESCOLHA_FORMA_CUSTEIO" : "PENDENTE_CADASTRO_MESTRE",
      statusResolucaoCusteio: resolucaoCusteio.status,
      motivoResolucaoCusteio: resolucaoCusteio.motivo,
      formaCusteioRecursoId: formaSnapshot.formaCusteioRecursoId ?? null,
      formaCusteioNome: formaSnapshot.formaCusteioNome ?? null,
      origemFormaCusteio: resolucaoCusteio.origem,
      referenciaTecnicaRecursoId: formaSnapshot.referenciaTecnicaRecursoId ?? null,
      referenciaTecnicaNome: formaSnapshot.referenciaTecnicaNome ?? null,
      valorReferenciaCusteio: formaSnapshot.valorReferenciaCusteio ?? null,
      valorAplicadoCusteio: formaSnapshot.valorAplicadoCusteio ?? null,
      materialIdentificado: Boolean(materialDescricao),
      materialDescricao
    }
  };
}

function mapLancamentoToFato(lancamento: LancamentoFato, vinculados: Set<string>): FatoOperacionalExistente {
  const quantidadeApontada = toNumber(lancamento.quantidadeApontada);
  const quantidadeFaturada = toNumber(lancamento.quantidadeFaturada);
  const quantidade = quantidadeApontada > 0 ? quantidadeApontada : quantidadeFaturada;
  const unidade = quantidadeApontada > 0 ? enumToUnit(lancamento.unidadeApontada) : enumToUnit(lancamento.unidadeFaturada);
  const snapshot = buildSnapshotFato(lancamento);
  const clienteNome = lancamento.cliente.nomeFantasia || lancamento.cliente.nome || lancamento.cliente.codigo || "-";
  const obraNome = lancamento.obra?.nome || lancamento.obra?.codigo || "-";
  const identificador = lancamento.equipamento.placaOuTag;

  return {
    id: lancamento.id,
    origemTipo: "LANCAMENTO_DIARIO",
    origemLabel: `Ficha ${lancamento.ficha.numero}`,
    data: lancamento.data.toISOString(),
    cliente: clienteNome,
    obra: obraNome,
    recursoId: lancamento.equipamentoId,
    recurso: lancamento.equipamento.descricao,
    identificadorRecurso: identificador,
    servico: lancamento.servico.tipoServico,
    quantidade,
    unidade,
    origemFato: inferOrigemFato(unidade),
    materialId: lancamento.material?.id ?? null,
    materialCodigo: lancamento.material?.codigoMaterial ?? null,
    materialDescricao: lancamento.material?.descricao ?? null,
    materialUnidade: lancamento.material?.unidadePadrao ?? null,
    statusVinculo: vinculados.has(lancamento.id) ? "VINCULADO" : "DISPONIVEL",
    custoDisponivel: avaliarSnapshotTecnicoEconomico(snapshot).status === "CUSTO_DEFINIDO",
    snapshotTecnicoEconomico: snapshot
  };
}

export async function listarFatosOperacionaisExistentes(db: DbClient, input: ListarFatosOperacionaisInput = {}) {
  const empresaId = requireActiveTenantEmpresaId();
  const lancamentos = requireLancamentoDiarioDelegate(db);
  const inicio = normalizeFiltroDateStart(input.dataInicio);
  const fim = normalizeFiltroDateEnd(input.dataFim);

  const where: Prisma.LancamentoDiarioWhereInput = {
    empresaId,
    deletedAt: null,
    statusValidacao: {
      not: StatusLancamento.CANCELADO
    },
    ...(input.obraId ? { obraId: input.obraId } : {}),
    ...(input.recursoId ? { equipamentoId: input.recursoId } : {}),
    ...(input.servicoId ? { servicoId: input.servicoId } : {}),
    ...(inicio || fim
      ? {
        data: {
          ...(inicio ? { gte: startOfDay(inicio) } : {}),
          ...(fim ? { lte: endOfDay(fim) } : {})
        }
      }
      : {})
  };

  const items = await lancamentos.findMany({
    where,
    select: lancamentoFatoSelect,
    orderBy: [{ data: "asc" }, { ficha: { numero: "asc" } }],
    take: 250
  }) as LancamentoFato[];

  let vinculados = new Set<string>();
  if (input.execucaoId && items.length) {
    const recursoDelegate = requireRecursoBoletimReadDelegate(db);
    const existentes = await recursoDelegate.findMany({
      where: {
        empresaId,
        execucaoId: input.execucaoId,
        origemRegistroTipo: "LANCAMENTO_DIARIO",
        origemRegistroId: {
          in: items.map((item) => item.id)
        }
      },
      select: {
        origemRegistroId: true
      }
    }) as Array<{ origemRegistroId: string | null }>;
    vinculados = new Set(existentes.map((item) => item.origemRegistroId).filter(Boolean) as string[]);
  }

  return items.map((item) => mapLancamentoToFato(item, vinculados));
}

export type VincularFatosOperacionaisInput = {
  execucaoId: string;
  frenteExecutadaId: string;
  fatosIds: string[];
  observacao?: string | null;
};

export async function vincularFatosOperacionaisExecucao(db: DbClient, input: VincularFatosOperacionaisInput) {
  const empresaId = requireActiveTenantEmpresaId();
  const lancamentos = requireLancamentoDiarioDelegate(db);
  const recursoDelegate = requireRecursoBoletimReadDelegate(db);
  const execucao = await db.execucao.findFirst({
    where: {
      id: input.execucaoId,
      empresaId
    },
    include: {
      frentes: {
        select: {
          id: true
        }
      }
    }
  }) as PersistedExecucao | null;

  if (!execucao) {
    throw new Error("EXECUCAO_NAO_ENCONTRADA");
  }

  const frentes = new Set((execucao.frentes ?? []).map((frente) => frente.id));
  if (!frentes.has(input.frenteExecutadaId)) {
    throw new Error("FRENTE_EXECUTADA_NAO_PERTENCE_EXECUCAO");
  }

  const uniqueIds = Array.from(new Set(input.fatosIds.filter(Boolean)));
  if (!uniqueIds.length) {
    throw new Error("NENHUM_FATO_SELECIONADO");
  }

  const existentes = await recursoDelegate.findMany({
    where: {
      empresaId,
      execucaoId: input.execucaoId,
      origemRegistroTipo: "LANCAMENTO_DIARIO",
      origemRegistroId: {
        in: uniqueIds
      }
    },
    select: {
      origemRegistroId: true
    }
  }) as Array<{ origemRegistroId: string | null }>;

  if (existentes.length) {
    throw new Error("FATO_OPERACIONAL_JA_VINCULADO_NESTA_EXECUCAO");
  }

  const fatos = await lancamentos.findMany({
    where: {
      empresaId,
      deletedAt: null,
      statusValidacao: {
        not: StatusLancamento.CANCELADO
      },
      id: {
        in: uniqueIds
      }
    },
    select: lancamentoFatoSelect,
    orderBy: [{ data: "asc" }]
  }) as LancamentoFato[];

  if (fatos.length !== uniqueIds.length) {
    throw new Error("FATO_OPERACIONAL_NAO_ENCONTRADO");
  }

  const vinculados = [];

  for (const fato of fatos) {
    const dataBoletim = startOfDay(fato.data);
    let boletim = await db.boletimDiarioProducao.findFirst({
      where: {
        empresaId,
        execucaoId: input.execucaoId,
        dataBoletim
      },
      select: {
        id: true,
        status: true
      }
    }) as { id: string; status: StatusBoletimDiarioProducao } | null;

    if (!boletim) {
      boletim = await db.boletimDiarioProducao.create({
        data: {
          empresaId,
          execucaoId: input.execucaoId,
          dataBoletim,
          status: StatusBoletimDiarioProducao.ABERTO
        },
        select: {
          id: true,
          status: true
        }
      }) as { id: string; status: StatusBoletimDiarioProducao };
    }

    if (boletim.status !== StatusBoletimDiarioProducao.ABERTO) {
      throw new Error("BOLETIM_DIARIO_FECHADO_NAO_PERMITE_ALTERACAO");
    }

    const fatoNormalizado = mapLancamentoToFato(fato, new Set());
    const criado = await db.recursoBoletimDiario.create({
      data: {
        empresaId,
        execucaoId: input.execucaoId,
        boletimId: boletim.id,
        frenteExecutadaId: input.frenteExecutadaId,
        recursoId: fato.equipamentoId,
        nomeSnapshot: `${fato.equipamento.placaOuTag} - ${fato.equipamento.descricao}`,
        quantidadeRealizada: fatoNormalizado.quantidade,
        unidadeRealizada: fatoNormalizado.unidade,
        quantidadeRecursos: 1,
        origem: fatoNormalizado.origemFato,
        origemRegistroTipo: "LANCAMENTO_DIARIO",
        origemRegistroId: fato.id,
        origemRegistroData: dataBoletim,
        editavel: false,
        snapshotTecnicoEconomico: fatoNormalizado.snapshotTecnicoEconomico as Prisma.InputJsonValue,
        observacao: clean(input.observacao)
      }
    });
    vinculados.push(criado);
  }

  return vinculados;
}

export async function desvincularRecursoBoletimDiario(db: DbClient, id: string) {
  const empresaId = requireActiveTenantEmpresaId();
  const findDelegate = requireRecursoBoletimReadDelegate(db);
  const deleteDelegate = requireRecursoBoletimDeleteDelegate(db);
  const recurso = await findDelegate.findFirst({
    where: {
      id,
      empresaId
    },
    include: {
      boletim: {
        select: {
          status: true
        }
      }
    }
  }) as { id: string; boletim: { status: StatusBoletimDiarioProducao } } | null;

  if (!recurso) {
    throw new Error("RECURSO_BOLETIM_DIARIO_NAO_ENCONTRADO");
  }

  if (recurso.boletim.status !== StatusBoletimDiarioProducao.ABERTO) {
    throw new Error("BOLETIM_DIARIO_FECHADO_NAO_PERMITE_ALTERACAO");
  }

  return deleteDelegate({
    where: {
      id
    }
  });
}

export async function buscarBoletimDiarioProducao(db: DbClient, id: string) {
  const empresaId = requireActiveTenantEmpresaId();

  return db.boletimDiarioProducao.findFirst({
    where: {
      id,
      empresaId
    },
    include: boletimDiarioProducaoInclude
  });
}

export async function excluirBoletimDiarioProducao(db: DbClient, id: string) {
  const empresaId = requireActiveTenantEmpresaId();
  const boletim = await db.boletimDiarioProducao.findFirst({
    where: {
      id,
      empresaId
    },
    include: {
      recursos: true
    }
  }) as {
    id: string;
    execucaoId: string;
    status: StatusBoletimDiarioProducao;
  } | null;

  if (!boletim) {
    throw new Error("BOLETIM_DIARIO_NAO_ENCONTRADO");
  }

  if (boletim.status !== StatusBoletimDiarioProducao.ABERTO) {
    throw new Error("BOLETIM_FECHADO_NAO_PODE_SER_EXCLUIDO");
  }

  if (!db.boletimDiarioProducao.delete) {
    throw new Error("OPERACAO_NAO_SUPORTADA");
  }

  await db.boletimDiarioProducao.delete({
    where: {
      id: boletim.id
    }
  });

  const execucao = await db.execucao.findFirst({
    where: {
      id: boletim.execucaoId,
      empresaId
    },
    include: {
      frentes: {
        include: {
          recursos: {
            orderBy: [{ createdAt: "asc" as const }]
          }
        },
        orderBy: [{ createdAt: "asc" as const }]
      },
      boletins: {
        where: {
          status: {
            in: [
              StatusBoletimDiarioProducao.ABERTO,
              StatusBoletimDiarioProducao.FECHADO
            ]
          }
        },
        include: {
          recursos: {
            orderBy: [{ createdAt: "asc" as const }]
          }
        },
        orderBy: [{ dataBoletim: "asc" as const }]
      },
      resultados: {
        orderBy: [{ createdAt: "desc" as const }]
      },
      encargosEconomicos: {
        orderBy: [{ createdAt: "asc" as const }]
      }
    }
  }) as PersistedExecucaoComBoletins | null;

  if (!execucao) {
    throw new Error("EXECUCAO_NAO_ENCONTRADA");
  }

  const entrada = adaptarExecucaoComBoletinsParaEntradaNucleo(execucao, { incluirBoletinsAbertos: true });
  const resultado = await gerarResultadoExecucaoDaEntrada(db, empresaId, execucao.id, entrada);

  return {
    ...execucao,
    resultados: [resultado, ...(execucao.resultados ?? [])]
  };
}

export async function fecharBoletimDiarioProducao(db: DbClient, id: string) {
  const empresaId = requireActiveTenantEmpresaId();
  const atual = await db.boletimDiarioProducao.findFirst({
    where: {
      id,
      empresaId
    },
    include: boletimDiarioProducaoInclude
  }) as (PersistedBoletimDiario & { execucao: PersistedExecucaoComBoletins }) | null;

  if (!atual) {
    throw new Error("BOLETIM_DIARIO_NAO_ENCONTRADO");
  }

  if (atual.status === StatusBoletimDiarioProducao.FECHADO) {
    throw new Error("BOLETIM_DIARIO_JA_FECHADO");
  }

  validarCustosDefinidos(atual.recursos ?? []);

  const fechado = await db.boletimDiarioProducao.update({
    where: {
      id
    },
    data: {
      status: StatusBoletimDiarioProducao.FECHADO,
      fechadoEm: new Date()
    },
    include: boletimDiarioProducaoInclude
  }) as PersistedBoletimDiario & { execucao: PersistedExecucaoComBoletins };

  const execucaoComBoletimAtual: PersistedExecucaoComBoletins = {
    ...fechado.execucao,
    boletins: [
      ...(fechado.execucao.boletins ?? []).filter((boletim) => boletim.id !== fechado.id),
      {
        id: fechado.id,
        empresaId: fechado.empresaId,
        execucaoId: fechado.execucaoId,
        dataBoletim: fechado.dataBoletim,
        status: StatusBoletimDiarioProducao.FECHADO,
        recursos: fechado.recursos ?? []
      }
    ]
  };
  const entrada = adaptarExecucaoComBoletinsParaEntradaNucleo(execucaoComBoletimAtual);
  const resultado = await gerarResultadoExecucaoDaEntrada(db, empresaId, fechado.execucaoId, entrada);

  return {
    ...fechado,
    resultado
  };
}

export async function consolidarExecucaoPorBoletins(db: DbClient, id: string) {
  const empresaId = requireActiveTenantEmpresaId();
  const execucao = await db.execucao.findFirst({
    where: {
      id,
      empresaId
    },
    include: {
      frentes: {
        include: {
          recursos: {
            orderBy: [{ createdAt: "asc" as const }]
          }
        },
        orderBy: [{ createdAt: "asc" as const }]
      },
      boletins: {
        where: {
          status: {
            in: [
              StatusBoletimDiarioProducao.ABERTO,
              StatusBoletimDiarioProducao.FECHADO
            ]
          }
        },
        include: {
          recursos: {
            orderBy: [{ createdAt: "asc" as const }]
          }
        },
        orderBy: [{ dataBoletim: "asc" as const }]
      },
      resultados: {
        orderBy: [{ createdAt: "desc" as const }]
      },
      encargosEconomicos: {
        orderBy: [{ createdAt: "asc" as const }]
      }
    }
  }) as PersistedExecucaoComBoletins | null;

  if (!execucao) {
    throw new Error("EXECUCAO_NAO_ENCONTRADA");
  }

  const entrada = adaptarExecucaoComBoletinsParaEntradaNucleo(execucao, { incluirBoletinsAbertos: true });
  const possuiBoletimAberto = (execucao.boletins ?? []).some((boletim) => boletim.status === StatusBoletimDiarioProducao.ABERTO);
  const resultado = await gerarResultadoExecucaoDaEntrada(db, empresaId, execucao.id, entrada, {
    estadoConsolidacao: possuiBoletimAberto ? "PROVISORIO" : "HOMOLOGADO"
  });

  return {
    ...execucao,
    resultados: [resultado, ...(execucao.resultados ?? [])]
  };
}
