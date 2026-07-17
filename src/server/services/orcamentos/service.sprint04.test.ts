import { describe, expect, it, vi } from "vitest";
import {
  ModoCustoOrcamento,
  ModoCustoFrente,
  StatusCenarioOrcamento,
  StatusOrcamento,
  StatusPropostaComercial,
  TipoItemOrcamento,
  TipoOrcamento,
  TipoPremissaOrcamento
} from "@prisma/client";
import type { OrcamentoInput } from "@/lib/validators/orcamento";
import {
  atualizarOrcamento,
  buildPropostaSnapshot,
  buildPropostaTotals,
  criarOrcamento
} from "@/server/services/orcamentos/service";

vi.mock("@/lib/tenant-store", async (importOriginal) => {
  const tenantStore = await importOriginal<typeof import("@/lib/tenant-store")>();

  return {
    ...tenantStore,
    requireActiveTenantEmpresaId: () => "empresa-teste"
  };
});

function baseInput(overrides: Partial<OrcamentoInput> = {}): OrcamentoInput {
  return {
    tipo: TipoOrcamento.OPERACIONAL,
    status: StatusOrcamento.EM_ELABORACAO,
    clienteId: "cliente-1",
    obraId: "obra-1",
    responsavelId: null,
    dataOrcamento: "2026-07-10",
    validadeAte: "",
    titulo: "Orcamento operacional",
    objeto: "",
    observacaoInterna: "",
    observacaoCliente: "",
    valorDesconto: 0,
    valorAcrescimo: 0,
    formacaoPreco: null,
    cenarios: [],
    propostasComerciais: [],
    frentes: [
      {
        tempId: "frente-1",
        cenarioTempId: "",
        cenarioOrdem: null,
        ordem: 1,
        nome: "Frente principal",
        descricao: "",
        metodoExecutivo: "",
        unidadeProducao: "m3",
        quantidadePrevista: 100,
        produtividadeDia: 10,
        prazoEstimadoDias: 10,
        modoCusto: ModoCustoFrente.AUTO,
        custoManual: 0,
        observacao: ""
      }
    ],
    itens: [
      {
        frenteTempId: "frente-1",
        frenteOrdem: null,
        tipoItem: TipoItemOrcamento.SERVICO_PRINCIPAL,
        servicoId: null,
        materialId: null,
        equipamentoId: null,
        categoriaRecurso: null,
        classeOperacional: "",
        recursoReferenciaId: "",
        recursoNome: "",
        ordem: 1,
        codigo: "",
        descricao: "Escavacao",
        unidade: "m3",
        quantidade: 100,
        produtividade: null,
        custoUnitario: 0,
        valorUnitario: 0,
        observacao: ""
      }
    ],
    premissas: [],
    ...overrides
  };
}

function propostaInput(revisao = 0) {
  return {
    tempId: `proposta-${revisao}`,
    cenarioTempId: "",
    cenarioOrdem: null,
    codigo: "PROP-001",
    revisao,
    titulo: "Proposta operacional",
    status: StatusPropostaComercial.EMITIDA,
    condicoesComerciais: "Pagamento em 30 dias.",
    observacao: "",
    opcionais: []
  } satisfies OrcamentoInput["propostasComerciais"][number];
}

function snapshotValues(snapshot: ReturnType<typeof buildPropostaSnapshot>) {
  return snapshot as unknown as {
    revisao: number;
    totals: {
      valorSubtotal: number;
      valorDesconto: number;
      valorAcrescimo: number;
      valorTotal: number;
    };
    frentes: Array<{
      quantidadePrevista: number | null;
    }>;
    itens: Array<{
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
    }>;
  };
}

function createFakeDb() {
  const records = {
    orcamentos: [] as Array<Record<string, unknown>>,
    cenarios: [] as Array<Record<string, unknown>>,
    frentes: [] as Array<Record<string, unknown>>,
    itens: [] as Array<Record<string, unknown>>,
    premissas: [] as Array<Record<string, unknown>>,
    propostas: [] as Array<Record<string, unknown>>,
    opcionais: [] as Array<Record<string, unknown>>,
    formacoes: [] as Array<Record<string, unknown>>
  };

  function removeWhere(
    collection: Array<Record<string, unknown>>,
    predicate: (record: Record<string, unknown>) => boolean
  ) {
    const remaining = collection.filter((record) => !predicate(record));
    collection.splice(0, collection.length, ...remaining);
  }

  const db = {
    cliente: {
      findUnique: async () => ({ id: "cliente-1" })
    },
    obra: {
      findUnique: async () => ({ id: "obra-1", clienteId: "cliente-1" })
    },
    usuario: {
      findUnique: async () => ({ id: "usuario-1" })
    },
    servico: {
      count: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length
    },
    material: {
      count: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length
    },
    equipamento: {
      count: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length
    },
    colaborador: {
      count: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length
    },
    fornecedor: {
      count: async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length
    },
    orcamento: {
      findMany: async () => records.orcamentos,
      findFirst: async ({ where }: { where?: Record<string, unknown> } = {}) => {
        const id = typeof where?.id === "string" ? where.id : null;
        const codigo = typeof where?.codigo === "string" ? where.codigo : null;
        const idFilter =
          where?.id && typeof where.id === "object"
            ? (where.id as { not?: string })
            : null;

        return (
          records.orcamentos.find((record) => {
            if (id && record.id !== id) {
              return false;
            }

            if (codigo && record.codigo !== codigo) {
              return false;
            }

            if (idFilter?.not && record.id === idFilter.not) {
              return false;
            }

            return true;
          }) ?? null
        );
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: `orcamento-${records.orcamentos.length + 1}` };
        records.orcamentos.push(created);
        return { id: created.id };
      },
      update: async ({
        where,
        data
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const index = records.orcamentos.findIndex((record) => record.id === where.id);

        if (index < 0) {
          throw new Error("ORCAMENTO_NAO_ENCONTRADO");
        }

        records.orcamentos[index] = {
          ...records.orcamentos[index],
          ...data,
          id: where.id
        };

        return records.orcamentos[index];
      }
    },
    orcamentoCenario: {
      updateMany: async ({
        where,
        data
      }: {
        where: { id?: string; orcamentoId: string; isPadrao?: boolean };
        data: Record<string, unknown>;
      }) => {
        let count = 0;

        records.cenarios = records.cenarios.map((record) => {
          const matches =
            record.orcamentoId === where.orcamentoId &&
            (!where.id || record.id === where.id) &&
            (where.isPadrao === undefined || record.isPadrao === where.isPadrao);

          if (!matches) return record;
          count += 1;
          return { ...record, ...data };
        });

        return { count };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: `cenario-${records.cenarios.length + 1}` };
        records.cenarios.push(created);
        return { id: created.id };
      },
      deleteMany: async ({ where }: { where: { orcamentoId: string } }) => {
        removeWhere(
          records.cenarios,
          (record) =>
            record.orcamentoId === where.orcamentoId &&
            !records.propostas.some(
              (proposta) =>
                proposta.cenarioId === record.id &&
                proposta.status === StatusPropostaComercial.EMITIDA
            )
        );
      }
    },
    orcamentoFrente: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: `frente-${records.frentes.length + 1}` };
        records.frentes.push(created);
        return { id: created.id };
      },
      deleteMany: async ({ where }: { where: { orcamentoId: string } }) => {
        removeWhere(records.frentes, (record) => record.orcamentoId === where.orcamentoId);
      }
    },
    orcamentoItem: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        records.itens.push({ ...data, id: `item-${records.itens.length + 1}` });
      },
      deleteMany: async ({ where }: { where: { orcamentoId: string } }) => {
        removeWhere(records.itens, (record) => record.orcamentoId === where.orcamentoId);
      }
    },
    orcamentoPremissa: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        records.premissas.push({ ...data, id: `premissa-${records.premissas.length + 1}` });
      },
      deleteMany: async ({ where }: { where: { orcamentoId: string } }) => {
        removeWhere(records.premissas, (record) => record.orcamentoId === where.orcamentoId);
      }
    },
    orcamentoFormacaoPreco: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        records.formacoes.push({ ...data, id: `formacao-${records.formacoes.length + 1}` });
      },
      upsert: async ({
        where,
        update,
        create
      }: {
        where: { orcamentoId: string };
        update: Record<string, unknown>;
        create: Record<string, unknown>;
      }) => {
        const index = records.formacoes.findIndex(
          (record) => record.orcamentoId === where.orcamentoId
        );

        if (index >= 0) {
          records.formacoes[index] = { ...records.formacoes[index], ...update };
          return records.formacoes[index];
        }

        const created = { ...create, id: `formacao-${records.formacoes.length + 1}` };
        records.formacoes.push(created);
        return created;
      },
      deleteMany: async ({ where }: { where: { orcamentoId: string } }) => {
        removeWhere(records.formacoes, (record) => record.orcamentoId === where.orcamentoId);
      }
    },
    orcamentoPropostaComercial: {
      findMany: async () =>
        records.propostas
          .filter((proposta) => proposta.status === StatusPropostaComercial.EMITIDA)
          .map((proposta) => ({ id: proposta.id })),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: `proposta-${records.propostas.length + 1}` };
        records.propostas.push(created);
        return { id: created.id };
      },
      deleteMany: async ({ where }: { where: { orcamentoId: string } }) => {
        removeWhere(
          records.propostas,
          (record) =>
            record.orcamentoId === where.orcamentoId &&
            record.status !== StatusPropostaComercial.EMITIDA
        );
      }
    },
    orcamentoPropostaOpcional: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        records.opcionais.push({ ...data, id: `opcional-${records.opcionais.length + 1}` });
      }
    }
  };

  return { db, records };
}

describe("orcamentos sprint 4.1-4.3", () => {
  it("cria orcamento operacional simples com um cenario principal e sem proposta automatica", async () => {
    const { db, records } = createFakeDb();

    await criarOrcamento(db as never, {
      input: baseInput(),
      userId: "usuario-1"
    });

    expect(records.cenarios).toHaveLength(1);
    expect(records.cenarios[0].isPadrao).toBe(true);
    expect(records.frentes[0].cenarioId).toBe(records.cenarios[0].id);
    expect(records.propostas).toHaveLength(0);
  });

  it("persiste o custo manual da frente para reconstruir o motor na reabertura", async () => {
    const { db, records } = createFakeDb();
    const input = baseInput({
      frentes: [
        {
          ...baseInput().frentes[0],
          modoCusto: ModoCustoFrente.MANUAL,
          custoManual: 4321.9
        }
      ]
    });

    await criarOrcamento(db as never, {
      input,
      userId: "usuario-1"
    });

    expect(records.frentes[0].custoManual).toBe(4321.9);
    expect(records.frentes[0].modoCusto).toBe(ModoCustoFrente.MANUAL);
    expect(records.orcamentos[0].valorTotal).toBe(4321.9);
  });

  it("preserva prazo, parametros e memoria calculada dos recursos na reabertura", async () => {
    const { db, records } = createFakeDb();
    const input = baseInput({
      frentes: [{
        ...baseInput().frentes[0],
        prazoEstimadoDias: 12,
        prazoTeoricoDias: 10,
        prazoAdotadoDias: 12,
        origemPrazo: "AJUSTADO"
      }],
      itens: [{
        ...baseInput().itens[0],
        tempId: "recurso-persistido",
        tipoItem: TipoItemOrcamento.RECURSO,
        categoriaRecurso: "EQUIPAMENTO",
        classeOperacional: "ESCAVADEIRA_15T",
        descricao: "Escavadeira 15 t",
        quantidade: 1,
        custoUnitario: 900,
        tipoCalculoRecurso: "AUTOMATICO",
        unidadeEconomicaCusto: "DIA",
        valorCusto: 900,
        horasDia: 8,
        viagensDia: null,
        distanciaViagemKm: null,
        diasTrabalhadosMes: 22,
        custoTotalCalculado: 0,
        memoriaCalculo: ""
      }]
    });

    await criarOrcamento(db as never, { input, userId: "usuario-1" });

    expect(records.frentes[0]).toMatchObject({
      prazoTeoricoDias: 10,
      prazoAdotadoDias: 12,
      origemPrazo: "AJUSTADO"
    });
    expect(records.itens[0]).toMatchObject({
      unidadeEconomicaCusto: "DIA",
      quantidadeOperacional: 100,
      origemQuantidadeOperacional: "FRENTE",
      valorCusto: 900,
      diasTrabalhadosMes: 22,
      custoTotalCalculado: 10800
    });
    expect(JSON.parse(String(records.itens[0].memoriaCalculo))).toMatchObject({
      recursoRef: "recurso-persistido",
      custoTotal: 10800
    });
  });

  it("persiste o snapshot economico completo do transporte por km", async () => {
    const { db, records } = createFakeDb();
    const input = baseInput({
      frentes: [{
        ...baseInput().frentes[0],
        quantidadePrevista: 5560.66,
        unidadeProducao: "m3"
      }],
      itens: [{
        ...baseInput().itens[0],
        tempId: "caminhao-14m3",
        tipoItem: TipoItemOrcamento.RECURSO,
        categoriaRecurso: "EQUIPAMENTO",
        descricao: "Caminhao Basculante 14 m3",
        quantidade: 3,
        custoUnitario: 8,
        tipoCalculoRecurso: "AUTOMATICO",
        unidadeEconomicaCusto: "KM",
        valorCusto: 8,
        capacidadePorViagem: 14,
        unidadeCapacidade: "m3",
        distanciaViagemKm: 12
      }]
    });

    await criarOrcamento(db as never, { input, userId: "usuario-1" });

    expect(records.itens[0]).toMatchObject({
      capacidadePorViagem: 14,
      unidadeCapacidade: "m3",
      viagensTeoricas: 397.19,
      viagensOperacionais: 398,
      custoPorViagem: 96,
      custoTotalCalculado: 38208
    });
    expect(JSON.parse(String(records.itens[0].memoriaCalculo))).toMatchObject({
      viagensTeoricas: 397.19,
      viagensOperacionais: 398,
      custoPorViagem: 96,
      viagensMediasPorRecurso: 132.67,
      custoTotal: 38208,
      statusCalculo: "CALCULADO"
    });
  });

  it("persiste a quantidade operacional personalizada no snapshot do recurso", async () => {
    const { db, records } = createFakeDb();
    const input = baseInput({
      frentes: [{
        ...baseInput().frentes[0],
        quantidadePrevista: 650,
        unidadeProducao: "m3"
      }],
      itens: [{
        ...baseInput().itens[0],
        tempId: "caminhao-quantidade-personalizada",
        tipoItem: TipoItemOrcamento.RECURSO,
        categoriaRecurso: "EQUIPAMENTO",
        descricao: "Caminhao Basculante 14 m3",
        quantidade: 1,
        quantidadeOperacional: 936,
        origemQuantidadeOperacional: "PERSONALIZADA",
        custoUnitario: 8,
        tipoCalculoRecurso: "AUTOMATICO",
        unidadeEconomicaCusto: "KM",
        valorCusto: 8,
        capacidadePorViagem: 14,
        unidadeCapacidade: "m3",
        distanciaViagemKm: 12
      }]
    });

    await criarOrcamento(db as never, { input, userId: "usuario-1" });

    expect(records.frentes[0].quantidadePrevista).toBe(650);
    expect(records.itens[0]).toMatchObject({
      quantidadeOperacional: 936,
      origemQuantidadeOperacional: "PERSONALIZADA",
      viagensOperacionais: 67,
      custoTotalCalculado: 6432
    });
    expect(JSON.parse(String(records.itens[0].memoriaCalculo))).toMatchObject({
      quantidadeOperacional: 936,
      origemQuantidadeOperacional: "PERSONALIZADA",
      viagensOperacionais: 67,
      custoTotal: 6432
    });
  });

  it("mantem orcamento comercial sem cenario automatico", async () => {
    const { db, records } = createFakeDb();

    await criarOrcamento(db as never, {
      input: baseInput({
        tipo: TipoOrcamento.COMERCIAL,
        status: StatusOrcamento.RASCUNHO,
        cenarios: [],
        frentes: [],
        itens: [
          {
            ...baseInput().itens[0],
            frenteTempId: "",
            tipoItem: TipoItemOrcamento.COMERCIAL
          }
        ]
      }),
      userId: "usuario-1"
    });

    expect(records.cenarios).toHaveLength(0);
    expect(records.propostas).toHaveLength(0);
  });

  it("mantem frentes, itens e totais isolados por cenario", async () => {
    const { db, records } = createFakeDb();
    const input = baseInput({
      cenarios: [
        {
          tempId: "cenario-a",
          ordem: 1,
          nome: "Cenario A",
          descricao: "",
          metodoExecutivo: "",
          observacao: "",
          isPadrao: true,
          status: StatusCenarioOrcamento.EM_ESTUDO
        },
        {
          tempId: "cenario-b",
          ordem: 2,
          nome: "Cenario B",
          descricao: "",
          metodoExecutivo: "",
          observacao: "",
          isPadrao: false,
          status: StatusCenarioOrcamento.EM_ESTUDO
        }
      ],
      frentes: [
        { ...baseInput().frentes[0], tempId: "frente-a", cenarioTempId: "cenario-a", nome: "Frente A" },
        { ...baseInput().frentes[0], tempId: "frente-b", cenarioTempId: "cenario-b", ordem: 2, nome: "Frente B" }
      ],
      itens: [
        { ...baseInput().itens[0], frenteTempId: "frente-a", descricao: "Servico A", valorUnitario: 100 },
        { ...baseInput().itens[0], frenteTempId: "frente-b", ordem: 2, descricao: "Servico B", valorUnitario: 200 }
      ],
      propostasComerciais: [
        {
          tempId: "proposta-b",
          cenarioTempId: "cenario-b",
          cenarioOrdem: null,
          codigo: "",
          revisao: 0,
          titulo: "Proposta B",
          status: StatusPropostaComercial.RASCUNHO,
          condicoesComerciais: "",
          observacao: "",
          opcionais: []
        }
      ]
    });

    await criarOrcamento(db as never, { input, userId: "usuario-1" });

    expect(records.frentes.find((frente) => frente.nome === "Frente A")?.cenarioId).toBe("cenario-1");
    expect(records.frentes.find((frente) => frente.nome === "Frente B")?.cenarioId).toBe("cenario-2");
    expect(records.itens.find((item) => item.descricao === "Servico A")?.frenteId).toBe("frente-1");
    expect(records.itens.find((item) => item.descricao === "Servico B")?.frenteId).toBe("frente-2");
    expect(records.propostas[0].cenarioId).toBe("cenario-2");
    expect(records.propostas[0].valorSubtotal).toBe(20000);
  });

  it("mantem premissas gerais com cenarioId nulo", async () => {
    const { db, records } = createFakeDb();

    await criarOrcamento(db as never, {
      input: baseInput({
        premissas: [
          {
            tipo: TipoPremissaOrcamento.PREMISSA,
            ordem: 1,
            titulo: "Premissa geral",
            descricao: "Valida para toda a proposta."
          }
        ]
      }),
      userId: "usuario-1"
    });

    expect(records.premissas).toHaveLength(1);
    expect(records.premissas[0].cenarioId).toBeNull();
  });

  it("vincula opcionais a proposta sem criar cenario adicional", async () => {
    const { db, records } = createFakeDb();

    await criarOrcamento(db as never, {
      input: baseInput({
        cenarios: [
          {
            tempId: "cenario-padrao",
            ordem: 1,
            nome: "Cenario principal",
            descricao: "",
            metodoExecutivo: "",
            observacao: "",
            isPadrao: true,
            status: StatusCenarioOrcamento.EM_ESTUDO
          }
        ],
        frentes: [{ ...baseInput().frentes[0], cenarioTempId: "cenario-padrao" }],
        propostasComerciais: [
          {
            tempId: "proposta-1",
            cenarioTempId: "cenario-padrao",
            cenarioOrdem: null,
            codigo: "",
            revisao: 0,
            titulo: "Proposta",
            status: StatusPropostaComercial.RASCUNHO,
            condicoesComerciais: "",
            observacao: "",
            opcionais: [
              {
                tempId: "opcional-1",
                ordem: 1,
                codigo: "",
                descricao: "Hora extra",
                unidade: "HORA",
                quantidade: 10,
                valorUnitario: 50,
                condicoes: "Somente se contratado.",
                observacao: ""
              }
            ]
          }
        ]
      }),
      userId: "usuario-1"
    });

    expect(records.cenarios).toHaveLength(1);
    expect(records.opcionais).toHaveLength(1);
    expect(records.opcionais[0].propostaId).toBe(records.propostas[0].id);
  });
});

describe("revisoes de propostas comerciais", () => {
  it("reconstroi a nova revisao com o valor atual e preserva o snapshot emitido", () => {
    const propostaRev0 = propostaInput(0);
    const inputOriginal = baseInput({
      itens: [{ ...baseInput().itens[0], valorUnitario: 100 }]
    });
    const snapshotRev0 = snapshotValues(
      buildPropostaSnapshot(inputOriginal, propostaRev0, undefined)
    );

    const propostaRev1 = propostaInput(1);
    const inputAtual = baseInput({
      itens: [{ ...baseInput().itens[0], valorUnitario: 250 }]
    });
    const snapshotRev1 = snapshotValues(
      buildPropostaSnapshot(inputAtual, propostaRev1, undefined)
    );

    expect(snapshotRev0.totals.valorTotal).toBe(10000);
    expect(snapshotRev0.revisao).toBe(0);
    expect(snapshotRev1.totals.valorTotal).toBe(25000);
    expect(snapshotRev1.revisao).toBe(1);
    expect(snapshotRev0.totals.valorTotal).toBe(10000);
  });

  it("reconstroi frentes e servicos quando a quantidade atual muda", () => {
    const inputAtual = baseInput({
      frentes: [{ ...baseInput().frentes[0], quantidadePrevista: 180 }],
      itens: [{ ...baseInput().itens[0], quantidade: 180, valorUnitario: 100 }]
    });
    const snapshot = snapshotValues(
      buildPropostaSnapshot(inputAtual, propostaInput(1), undefined)
    );

    expect(snapshot.frentes[0].quantidadePrevista).toBe(180);
    expect(snapshot.itens[0].quantidade).toBe(180);
    expect(snapshot.totals.valorTotal).toBe(18000);
  });

  it("usa o preco de venda vigente dos servicos principais", () => {
    const inputAtual = baseInput({
      itens: [{ ...baseInput().itens[0], valorUnitario: 325.5 }]
    });
    const snapshot = snapshotValues(
      buildPropostaSnapshot(inputAtual, propostaInput(1), undefined)
    );

    expect(snapshot.itens[0].valorUnitario).toBe(325.5);
    expect(snapshot.itens[0].valorTotal).toBe(32550);
    expect(snapshot.totals.valorTotal).toBe(32550);
  });

  it("recalcula o preco sugerido quando somente os custos mudam", () => {
    const recursoBase = {
      ...baseInput().itens[0],
      tipoItem: TipoItemOrcamento.RECURSO,
      ordem: 2,
      descricao: "Escavadeira",
      quantidade: 10,
      valorUnitario: 0
    };
    const inputAnterior = baseInput({
      itens: [baseInput().itens[0], { ...recursoBase, custoUnitario: 500 }]
    });
    const inputAtual = baseInput({
      itens: [baseInput().itens[0], { ...recursoBase, custoUnitario: 800 }]
    });

    const anterior = buildPropostaTotals(inputAnterior, propostaInput(0), undefined);
    const atual = buildPropostaTotals(inputAtual, propostaInput(1), undefined);

    expect(anterior.valorTotal).toBe(5000);
    expect(atual.valorTotal).toBe(8000);
  });

  it("persiste a fotografia comercial tambem enquanto a nova revisao esta em rascunho", async () => {
    const { db, records } = createFakeDb();
    const propostaRascunho = {
      ...propostaInput(1),
      status: StatusPropostaComercial.RASCUNHO
    };

    await criarOrcamento(db as never, {
      input: baseInput({
        itens: [{ ...baseInput().itens[0], valorUnitario: 2536.4765 }],
        propostasComerciais: [propostaRascunho]
      }),
      userId: "usuario-1"
    });

    const propostaPersistida = records.propostas[0];
    const snapshot = snapshotValues(
      propostaPersistida.snapshotJson as ReturnType<typeof buildPropostaSnapshot>
    );

    expect(propostaPersistida.status).toBe(StatusPropostaComercial.RASCUNHO);
    expect(propostaPersistida.valorTotal).toBe(253647.65);
    expect(snapshot.totals.valorTotal).toBe(253647.65);
  });
});

describe("persistencia na edicao de orcamentos", () => {
  function inputEditavel(titulo: string) {
    return baseInput({
      tipo: TipoOrcamento.COMERCIAL,
      status: StatusOrcamento.RASCUNHO,
      titulo,
      cenarios: [],
      frentes: [],
      itens: [],
      propostasComerciais: []
    });
  }

  it("edita outro campo sem alterar o codigo", async () => {
    const { db, records } = createFakeDb();
    const criado = await criarOrcamento(db as never, {
      input: inputEditavel("Titulo original"),
      userId: "usuario-1",
      codigo: "ORC-010"
    });

    await atualizarOrcamento(db as never, {
      id: criado!.id,
      input: inputEditavel("Titulo atualizado"),
      userId: "usuario-1"
    });

    expect(records.orcamentos[0].codigo).toBe("ORC-010");
    expect(records.orcamentos[0].titulo).toBe("Titulo atualizado");
  });

  it("permite informar exatamente o mesmo codigo do registro editado", async () => {
    const { db, records } = createFakeDb();
    const criado = await criarOrcamento(db as never, {
      input: inputEditavel("Orcamento"),
      userId: "usuario-1",
      codigo: "ORC-011"
    });

    await expect(
      atualizarOrcamento(db as never, {
        id: criado!.id,
        input: inputEditavel("Orcamento revisado"),
        userId: "usuario-1",
        codigo: "ORC-011"
      })
    ).resolves.toBeTruthy();

    expect(records.orcamentos[0].codigo).toBe("ORC-011");
  });

  it("bloqueia alteracao para o codigo de outro orcamento", async () => {
    const { db } = createFakeDb();
    const primeiro = await criarOrcamento(db as never, {
      input: inputEditavel("Primeiro"),
      userId: "usuario-1",
      codigo: "ORC-012"
    });
    await criarOrcamento(db as never, {
      input: inputEditavel("Segundo"),
      userId: "usuario-1",
      codigo: "ORC-013"
    });

    await expect(
      atualizarOrcamento(db as never, {
        id: primeiro!.id,
        input: inputEditavel("Primeiro alterado"),
        userId: "usuario-1",
        codigo: "ORC-013"
      })
    ).rejects.toThrow("CODIGO_ORCAMENTO_DUPLICADO");
  });

  it("bloqueia criacao com codigo existente", async () => {
    const { db } = createFakeDb();
    await criarOrcamento(db as never, {
      input: inputEditavel("Primeiro"),
      userId: "usuario-1",
      codigo: "ORC-014"
    });

    await expect(
      criarOrcamento(db as never, {
        input: inputEditavel("Duplicado"),
        userId: "usuario-1",
        codigo: "ORC-014"
      })
    ).rejects.toThrow("CODIGO_ORCAMENTO_DUPLICADO");
  });

  it("mantem o ID e a quantidade de registros durante a edicao", async () => {
    const { db, records } = createFakeDb();
    const criado = await criarOrcamento(db as never, {
      input: inputEditavel("Original"),
      userId: "usuario-1",
      codigo: "ORC-015"
    });
    const quantidadeAntes = records.orcamentos.length;

    const atualizado = await atualizarOrcamento(db as never, {
      id: criado!.id,
      input: inputEditavel("Atualizado"),
      userId: "usuario-1"
    });

    expect(records.orcamentos).toHaveLength(quantidadeAntes);
    expect(atualizado!.id).toBe(criado!.id);
    expect(records.orcamentos[0].id).toBe(criado!.id);
  });

  it("atualiza a formacao de preco sem criar outro registro unico", async () => {
    const { db, records } = createFakeDb();
    const formacaoBase = {
      modoCusto: ModoCustoOrcamento.SIMPLIFICADO,
      custoDireto: 1000,
      custoIndireto: 100,
      impostosPercentual: 0,
      impostosValor: 0,
      margemPercentual: 0,
      margemValor: 0,
      precoSugerido: 1100,
      ajusteComercial: 0,
      precoFinal: 1100,
      observacao: ""
    };
    const criado = await criarOrcamento(db as never, {
      input: {
        ...inputEditavel("Com formacao de preco"),
        formacaoPreco: formacaoBase
      },
      userId: "usuario-1",
      codigo: "ORC-016"
    });

    await atualizarOrcamento(db as never, {
      id: criado!.id,
      input: {
        ...inputEditavel("Primeira edicao"),
        formacaoPreco: {
          ...formacaoBase,
          custoDireto: 1500,
          precoSugerido: 1650,
          precoFinal: 1650
        }
      },
      userId: "usuario-1"
    });
    await atualizarOrcamento(db as never, {
      id: criado!.id,
      input: {
        ...inputEditavel("Segunda edicao"),
        formacaoPreco: {
          ...formacaoBase,
          custoDireto: 2000,
          precoSugerido: 2200,
          precoFinal: 2200
        }
      },
      userId: "usuario-1"
    });

    expect(records.formacoes).toHaveLength(1);
    expect(records.formacoes[0].orcamentoId).toBe(criado!.id);
    expect(records.formacoes[0].custoDireto).toBe(2000);
  });

  it("reutiliza o cenario preservado por proposta emitida ao editar o orcamento", async () => {
    const { db, records } = createFakeDb();
    const inputInicial = baseInput({
      cenarios: [
        {
          tempId: "cenario-local",
          ordem: 1,
          nome: "Cenario principal",
          descricao: "",
          metodoExecutivo: "",
          observacao: "",
          isPadrao: true,
          status: StatusCenarioOrcamento.EM_ESTUDO
        }
      ],
      frentes: [
        {
          ...baseInput().frentes[0],
          cenarioTempId: "cenario-local"
        }
      ],
      propostasComerciais: [
        {
          ...propostaInput(0),
          cenarioTempId: "cenario-local"
        }
      ]
    });
    const criado = await criarOrcamento(db as never, {
      input: inputInicial,
      userId: "usuario-1",
      codigo: "ORC-017"
    });
    const cenarioId = String(records.cenarios[0].id);
    const propostaId = String(records.propostas[0].id);
    const snapshotEmitido = records.propostas[0].snapshotJson;
    records.propostas[0].status = StatusPropostaComercial.EMITIDA;

    await atualizarOrcamento(db as never, {
      id: criado!.id,
      input: {
        ...inputInicial,
        titulo: "Orcamento atualizado",
        cenarios: [
          {
            ...inputInicial.cenarios[0],
            tempId: cenarioId,
            nome: "Cenario principal atualizado"
          }
        ],
        frentes: [
          {
            ...inputInicial.frentes[0],
            tempId: "frente-atualizada",
            cenarioTempId: cenarioId
          }
        ],
        itens: [
          {
            ...inputInicial.itens[0],
            frenteTempId: "frente-atualizada"
          }
        ],
        propostasComerciais: [
          {
            ...inputInicial.propostasComerciais[0],
            tempId: propostaId,
            cenarioTempId: cenarioId
          }
        ]
      },
      userId: "usuario-1"
    });

    expect(records.cenarios).toHaveLength(1);
    expect(records.cenarios[0].id).toBe(cenarioId);
    expect(records.cenarios[0].nome).toBe("Cenario principal atualizado");
    expect(records.cenarios[0].isPadrao).toBe(true);
    expect(records.propostas).toHaveLength(1);
    expect(records.propostas[0].id).toBe(propostaId);
    expect(records.propostas[0].snapshotJson).toEqual(snapshotEmitido);
  });
});
