import { describe, expect, it } from "vitest";
import {
  ModoCustoFrente,
  StatusCenarioOrcamento,
  StatusOrcamento,
  StatusPropostaComercial,
  TipoItemOrcamento,
  TipoOrcamento,
  TipoPremissaOrcamento
} from "@prisma/client";
import type { OrcamentoInput } from "@/lib/validators/orcamento";
import { criarOrcamento } from "@/server/services/orcamentos/service";

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

function createFakeDb() {
  const records = {
    orcamentos: [] as Array<Record<string, unknown>>,
    cenarios: [] as Array<Record<string, unknown>>,
    frentes: [] as Array<Record<string, unknown>>,
    itens: [] as Array<Record<string, unknown>>,
    premissas: [] as Array<Record<string, unknown>>,
    propostas: [] as Array<Record<string, unknown>>,
    opcionais: [] as Array<Record<string, unknown>>
  };

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
      findMany: async () => [],
      findFirst: async () => records.orcamentos[0] ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: "orcamento-1" };
        records.orcamentos.push(created);
        return { id: created.id };
      }
    },
    orcamentoCenario: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: `cenario-${records.cenarios.length + 1}` };
        records.cenarios.push(created);
        return { id: created.id };
      }
    },
    orcamentoFrente: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: `frente-${records.frentes.length + 1}` };
        records.frentes.push(created);
        return { id: created.id };
      }
    },
    orcamentoItem: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        records.itens.push({ ...data, id: `item-${records.itens.length + 1}` });
      }
    },
    orcamentoPremissa: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        records.premissas.push({ ...data, id: `premissa-${records.premissas.length + 1}` });
      }
    },
    orcamentoFormacaoPreco: {
      create: async () => undefined
    },
    orcamentoPropostaComercial: {
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { ...data, id: `proposta-${records.propostas.length + 1}` };
        records.propostas.push(created);
        return { id: created.id };
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
