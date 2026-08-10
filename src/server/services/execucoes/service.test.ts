import {
  OrigemExecucao,
  OrigemFatoBoletimDiario,
  RoleUsuarioEmpresa,
  StatusBoletimDiarioProducao,
  StatusExecucao
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { runWithTenantContext } from "@/lib/tenant-store";
import { execucaoSchema, type ExecucaoInput } from "@/lib/validators/execucao";
import {
  adaptarExecucaoPersistidaParaEntradaNucleo,
  adaptarExecucaoComBoletinsParaEntradaNucleo,
  atualizarCabecalhoExecucao,
  atualizarExecucao,
  criarBoletimDiarioProducao,
  buscarExecucao,
  fecharBoletimDiarioProducao,
  criarExecucao,
  listarFatosOperacionaisExistentes,
  vincularFatosOperacionaisExecucao,
  desvincularRecursoBoletimDiario,
  EXECUCAO_RESULTADO_NUCLEO_VERSAO,
  execucaoInclude
} from "./service";

const EMPRESA_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "22222222-2222-4222-8222-222222222222";
const OBRA_ID = "33333333-3333-4333-8333-333333333333";
const RECURSO_ID = "44444444-4444-4444-8444-444444444444";
const EXECUCAO_ID = "55555555-5555-4555-8555-555555555555";
const FRENTE_ID = "66666666-6666-4666-8666-666666666666";
const FRENTE_EXTERNA_ID = "77777777-7777-4777-8777-777777777777";

function inputExecucao(): ExecucaoInput {
  return execucaoSchema.parse({
    clienteId: CLIENTE_ID,
    obraId: OBRA_ID,
    descricao: "Execucao de aterro compactado",
    origem: OrigemExecucao.DIRETA,
    status: StatusExecucao.RASCUNHO,
    dataInicio: "2026-08-06",
    observacoes: "Execucao criada em memoria operacional.",
    frentes: [
      {
        nome: "Aterro Compactado",
        unidade: "m3",
        quantidadeExecutada: 650,
        receitaRealizada: 45960.06,
        recursos: [
          {
            recursoId: RECURSO_ID,
            nomeSnapshot: "Truck 14 m3",
            quantidadeRealizada: 93,
            unidadeRealizada: "cargas",
            quantidadeRecursos: 1,
            snapshotTecnicoEconomico: {
              versao: 1,
              origem: "BIBLIOTECA_RECURSOS",
              baseEconomica: "CARGA",
              valorCusto: 120,
              unidadeCusto: "R$/carga",
              capacidadePorViagem: 14,
              unidadeCapacidade: "m3"
            }
          }
        ]
      }
    ]
  });
}

function recursosBoletimDiaUm(frenteExecutadaId = FRENTE_ID) {
  return [
    {
      frenteExecutadaId,
      nomeSnapshot: "Truck 14 m3",
      quantidadeRealizada: 93,
      unidadeRealizada: "cargas",
      quantidadeRecursos: 1,
      origem: OrigemFatoBoletimDiario.MANUAL,
      snapshotTecnicoEconomico: {
        categoria: "EQUIPAMENTO",
        classeOperacional: "Truck 14 m3",
        baseEconomica: "CARGA",
        valorCusto: 120,
        unidadeCusto: "R$/carga",
        capacidadePorViagem: 14,
        unidadeCapacidade: "m3"
      }
    }
  ];
}

function recursosBoletimDiaDois(frenteExecutadaId = FRENTE_ID) {
  return [
    {
      frenteExecutadaId,
      nomeSnapshot: "Escavadeira 15 t",
      quantidadeRealizada: 2,
      unidadeRealizada: "diarias",
      quantidadeRecursos: 1,
      origem: OrigemFatoBoletimDiario.MANUAL,
      snapshotTecnicoEconomico: {
        categoria: "EQUIPAMENTO",
        classeOperacional: "Escavadeira 15 t",
        baseEconomica: "DIA",
        valorCusto: 900,
        unidadeCusto: "R$/dia"
      }
    }
  ];
}

function createDbMock() {
  const calls: Array<{ model: string; action: string; args: unknown }> = [];
  const records = {
    execucao: null as Record<string, unknown> | null,
    resultados: [] as Array<Record<string, unknown>>,
    boletins: [] as Array<Record<string, unknown>>,
    recursosBoletim: [] as Array<Record<string, unknown>>,
    lancamentos: [
      {
        id: "99999999-9999-4999-8999-999999999999",
        empresaId: EMPRESA_ID,
        data: new Date("2026-08-06T00:00:00.000Z"),
        obraId: OBRA_ID,
        clienteId: CLIENTE_ID,
        servicoId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        equipamentoId: RECURSO_ID,
        quantidadeApontada: 93,
        unidadeApontada: "CARGA",
        quantidadeFaturada: 93,
        unidadeFaturada: "CARGA",
        origem: "MANUAL",
        statusValidacao: "MEDIDO",
        observacao: "Fato operacional existente",
        ficha: { numero: "4100" },
        cliente: { id: CLIENTE_ID, codigo: "CLI-001", nome: "Cliente teste", nomeFantasia: "Cliente teste" },
        obra: { id: OBRA_ID, codigo: "OBR-001", nome: "Obra teste" },
        servico: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", codigo: "SER-001", tipoServico: "Transporte" },
        equipamento: {
          id: RECURSO_ID,
          placaOuTag: "TRUCK-01",
          descricao: "Truck 14 m3",
          tipoRecurso: "CAMINHAO",
          classeOperacional: "Truck 14 m3",
          capacidadeM3: 14,
          unidadeCapacidade: "m3",
          unidadeEconomicaPadrao: "CARGA",
          custoPadrao: 120
        }
      }
    ] as Array<Record<string, unknown>>
  };

  const db = {
    execucao: {
      create: async (args: Record<string, unknown>) => {
        calls.push({ model: "execucao", action: "create", args });
        const data = args.data as Record<string, unknown>;
        records.execucao = {
          id: EXECUCAO_ID,
          ...data,
          frentes: ((data.frentes as Record<string, unknown>).create as Array<Record<string, unknown>>).map(
            (frente, index) => ({
              id: index === 0 ? FRENTE_ID : `66666666-6666-4666-8666-6666666666${String(index).padStart(2, "0")}`,
              ...frente,
              recursos: ((frente.recursos as Record<string, unknown>).create as Array<Record<string, unknown>>).map(
                (recurso, recursoIndex) => ({
                  id: `recurso-${recursoIndex + 1}`,
                  ...recurso
                })
              )
            })
          ),
          resultados: []
        };
        return records.execucao;
      },
      findFirst: async (args: Record<string, unknown>) => {
        calls.push({ model: "execucao", action: "findFirst", args });
        const where = args.where as Record<string, unknown>;
        if (!records.execucao) return null;
        if (where.id && where.id !== records.execucao.id) return null;
        if (where.empresaId && where.empresaId !== records.execucao.empresaId) return null;
        return records.execucao;
      },
      findMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "execucao", action: "findMany", args });
        return records.execucao ? [records.execucao] : [];
      },
      update: async (args: Record<string, unknown>) => {
        calls.push({ model: "execucao", action: "update", args });
        const data = args.data as Record<string, unknown>;
        const nestedFrentes = data.frentes as Record<string, unknown> | undefined;
        const frentes = nestedFrentes?.create
          ? ((nestedFrentes.create as Array<Record<string, unknown>>).map(
            (frente, index) => ({
              id: index === 0 ? FRENTE_ID : `88888888-8888-4888-8888-8888888888${String(index).padStart(2, "0")}`,
              ...frente,
              recursos: ((frente.recursos as Record<string, unknown>).create as Array<Record<string, unknown>>).map(
                (recurso, recursoIndex) => ({
                  id: `recurso-atualizado-${recursoIndex + 1}`,
                  ...recurso
                })
              )
            })
          ))
          : records.execucao?.frentes;
        records.execucao = {
          ...(records.execucao ?? {}),
          ...data,
          frentes,
          resultados: []
        };
        delete records.execucao.frentes;
        if (frentes) records.execucao.frentes = frentes;
        return records.execucao;
      }
    },
    frenteExecutada: {
      create: async (args: Record<string, unknown>) => {
        calls.push({ model: "frenteExecutada", action: "create", args });
        const data = args.data as Record<string, unknown>;
        const created = {
          id: FRENTE_ID,
          ...data,
          recursos: []
        };
        if (records.execucao) {
          records.execucao.frentes = [...(((records.execucao.frentes as Array<Record<string, unknown>>) ?? [])), created];
        }
        return created;
      },
      deleteMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "frenteExecutada", action: "deleteMany", args });
        return { count: 1 };
      },
      update: async (args: Record<string, unknown>) => {
        calls.push({ model: "frenteExecutada", action: "update", args });
        const where = args.where as Record<string, unknown>;
        const data = args.data as Record<string, unknown>;
        if (records.execucao) {
          records.execucao.frentes = ((records.execucao.frentes as Array<Record<string, unknown>>) ?? []).map((frente) =>
            frente.id === where.id ? { ...frente, ...data } : frente
          );
        }
        return (records.execucao?.frentes as Array<Record<string, unknown>> | undefined)?.find((frente) => frente.id === where.id) ?? null;
      }
    },
    resultadoExecucao: {
      create: async (args: Record<string, unknown>) => {
        calls.push({ model: "resultadoExecucao", action: "create", args });
        const data = args.data as Record<string, unknown>;
        const created = {
          id: `resultado-${records.resultados.length + 1}`,
          createdAt: new Date("2026-08-06T12:00:00.000Z"),
          ...data
        };
        records.resultados.unshift(created);
        if (records.execucao) {
          records.execucao = {
            ...records.execucao,
            resultados: records.resultados
          };
        }
        return created;
      }
    },
    boletimDiarioProducao: {
      create: async (args: Record<string, unknown>) => {
        calls.push({ model: "boletimDiarioProducao", action: "create", args });
        const data = args.data as Record<string, unknown>;
        const created = {
          id: `boletim-${records.boletins.length + 1}`,
          ...data,
          status: data.status ?? StatusBoletimDiarioProducao.ABERTO,
          recursos: ((((data.recursos as Record<string, unknown> | undefined)?.create ?? []) as Array<Record<string, unknown>>)).map(
            (recurso, index) => ({
              id: `boletim-recurso-${records.boletins.length + 1}-${index + 1}`,
              ...recurso
            })
          ),
          execucao: records.execucao
        };
        records.boletins.push(created);
        return created;
      },
      findFirst: async (args: Record<string, unknown>) => {
        calls.push({ model: "boletimDiarioProducao", action: "findFirst", args });
        const where = args.where as Record<string, unknown>;
        const boletim = records.boletins.find((item) => {
          if (where.id && where.id !== item.id) return false;
          if (where.empresaId && where.empresaId !== item.empresaId) return false;
          return true;
        });

        if (!boletim || !records.execucao) return null;

        return {
          ...boletim,
          execucao: {
            ...records.execucao,
            boletins: records.boletins.filter((item) => item.status === StatusBoletimDiarioProducao.FECHADO)
          }
        };
      },
      update: async (args: Record<string, unknown>) => {
        calls.push({ model: "boletimDiarioProducao", action: "update", args });
        const where = args.where as Record<string, unknown>;
        const data = args.data as Record<string, unknown>;
        const index = records.boletins.findIndex((item) => item.id === where.id);

        if (index < 0 || !records.execucao) return null;

        records.boletins[index] = {
          ...records.boletins[index],
          ...data
        };

        return {
          ...records.boletins[index],
          execucao: {
            ...records.execucao,
            boletins: records.boletins.filter((item) => item.status === StatusBoletimDiarioProducao.FECHADO)
          }
        };
      }
    },
    recursoBoletimDiario: {
      create: async (args: Record<string, unknown>) => {
        calls.push({ model: "recursoBoletimDiario", action: "create", args });
        const data = args.data as Record<string, unknown>;
        const boletim = records.boletins.find((item) => item.id === data.boletimId);
        const created: Record<string, unknown> = {
          id: `boletim-recurso-extra-${records.recursosBoletim.length + 1}`,
          ...data
        };
        records.recursosBoletim.push(created);
        if (boletim) {
          boletim.recursos = [...((boletim.recursos as unknown[]) ?? []), created];
        }
        return created;
      },
      findFirst: async (args: Record<string, unknown>) => {
        calls.push({ model: "recursoBoletimDiario", action: "findFirst", args });
        const where = args.where as Record<string, unknown>;
        const recurso = records.recursosBoletim.find((item) => item.id === where.id && item.empresaId === where.empresaId);
        if (!recurso) return null;
        const boletim = records.boletins.find((item) => item.id === recurso.boletimId);
        return {
          ...recurso,
          boletim: {
            status: boletim?.status ?? StatusBoletimDiarioProducao.ABERTO
          }
        };
      },
      findMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "recursoBoletimDiario", action: "findMany", args });
        const where = args.where as Record<string, unknown>;
        const ids = ((where.origemRegistroId as Record<string, unknown> | undefined)?.in ?? []) as string[];
        return records.recursosBoletim.filter((item) => {
          if (where.empresaId && item.empresaId !== where.empresaId) return false;
          if (where.execucaoId && item.execucaoId !== where.execucaoId) return false;
          if (where.origemRegistroTipo && item.origemRegistroTipo !== where.origemRegistroTipo) return false;
          if (ids.length && !ids.includes(String(item.origemRegistroId))) return false;
          return true;
        });
      },
      delete: async (args: Record<string, unknown>) => {
        calls.push({ model: "recursoBoletimDiario", action: "delete", args });
        const where = args.where as Record<string, unknown>;
        const index = records.recursosBoletim.findIndex((item) => item.id === where.id);
        if (index < 0) return null;
        const [removed] = records.recursosBoletim.splice(index, 1);
        records.boletins.forEach((boletim) => {
          boletim.recursos = ((boletim.recursos as Array<Record<string, unknown>>) ?? []).filter((item) => item.id !== where.id);
        });
        return removed;
      }
    },
    lancamentoDiario: {
      findMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "lancamentoDiario", action: "findMany", args });
        const where = args.where as Record<string, unknown>;
        const ids = ((where.id as Record<string, unknown> | undefined)?.in ?? []) as string[];
        return records.lancamentos.filter((item) => {
          if (where.empresaId && item.empresaId !== where.empresaId) return false;
          if (where.obraId && item.obraId !== where.obraId) return false;
          if (where.equipamentoId && item.equipamentoId !== where.equipamentoId) return false;
          if (ids.length && !ids.includes(String(item.id))) return false;
          const statusNot = (where.statusValidacao as Record<string, unknown> | undefined)?.not;
          if (statusNot && item.statusValidacao === statusNot) return false;
          return true;
        });
      }
    }
  };

  return { db, calls, records };
}

// Caso piloto tecnico da Sprint 2.3.
// Os custos unitarios abaixo pertencem a fixture de teste, nao aos custos oficiais
// da Biblioteca de Recursos. O objetivo e validar exclusivamente a integracao
// Execucao -> Adaptador -> Nucleo -> Resultado -> Snapshot.
function inputCasoPiloto(): ExecucaoInput {
  return execucaoSchema.parse({
    clienteId: CLIENTE_ID,
    obraId: OBRA_ID,
    descricao: "Execucao real homologada de aterro compactado",
    origem: OrigemExecucao.DIRETA,
    status: StatusExecucao.CONCLUIDA,
    frentes: [
      {
        nome: "Aterro Compactado",
        unidade: "m3",
        quantidadeExecutada: 650,
        receitaRealizada: 45960.06,
        recursos: [
          {
            nomeSnapshot: "Truck 14 m3",
            quantidadeRealizada: 93,
            unidadeRealizada: "cargas",
            quantidadeRecursos: 1,
            // Os valores abaixo sao utilizados apenas para validacao tecnica do fluxo.
            // A homologacao economica devera ocorrer utilizando recursos reais
            // provenientes da Biblioteca ou snapshots oficiais da execucao.
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "Truck 14 m3",
              baseEconomica: "CARGA",
              valorCusto: 120,
              unidadeCusto: "R$/carga",
              capacidadePorViagem: 14,
              unidadeCapacidade: "m3"
            }
          },
          {
            nomeSnapshot: "Carreta 22 m3",
            quantidadeRealizada: 9,
            unidadeRealizada: "cargas",
            quantidadeRecursos: 1,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "Carreta 22 m3",
              baseEconomica: "CARGA",
              valorCusto: 220,
              unidadeCusto: "R$/carga",
              capacidadePorViagem: 22,
              unidadeCapacidade: "m3"
            }
          },
          {
            nomeSnapshot: "Escavadeira 15 t",
            quantidadeRealizada: 2,
            unidadeRealizada: "diarias",
            quantidadeRecursos: 1,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "Escavadeira 15 t",
              baseEconomica: "DIA",
              valorCusto: 900,
              unidadeCusto: "R$/dia"
            }
          },
          {
            nomeSnapshot: "Mini Escavadeira V80",
            quantidadeRealizada: 1,
            unidadeRealizada: "h",
            quantidadeRecursos: 1,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "Mini Escavadeira V80",
              baseEconomica: "HORA",
              valorCusto: 250,
              unidadeCusto: "R$/h"
            }
          },
          {
            nomeSnapshot: "Rolo Pe de Carneiro",
            quantidadeRealizada: 2,
            unidadeRealizada: "diarias",
            quantidadeRecursos: 1,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "Rolo Pe de Carneiro",
              baseEconomica: "DIA",
              valorCusto: 850,
              unidadeCusto: "R$/dia"
            }
          },
          {
            nomeSnapshot: "Trator de Esteira",
            quantidadeRealizada: 3,
            unidadeRealizada: "h",
            quantidadeRecursos: 1,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "Trator de Esteira",
              baseEconomica: "HORA",
              valorCusto: 350,
              unidadeCusto: "R$/h"
            }
          },
          {
            nomeSnapshot: "Encarregado",
            quantidadeRealizada: 1,
            unidadeRealizada: "diaria",
            quantidadeRecursos: 1,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPE",
              classeOperacional: "Encarregado",
              baseEconomica: "DIA",
              valorCusto: 300,
              unidadeCusto: "R$/dia"
            }
          }
        ]
      }
    ]
  });
}

function runTenant<T>(callback: () => T | Promise<T>) {
  return runWithTenantContext(
    {
      usuarioId: "usuario-1",
      empresaId: EMPRESA_ID,
      roleEmpresa: RoleUsuarioEmpresa.ADMIN_EMPRESA,
      isMaster: false,
      empresaSelecionadaId: null,
      initialized: true,
      bypassTenantScope: false
    },
    callback
  );
}

describe("service de Execucao e Resultado", () => {
  it("cria execucao direta incompleta sem dados ficticios", async () => {
    const { db, calls } = createDbMock();
    const created = await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: null,
        obraId: null,
        descricao: "",
        origem: OrigemExecucao.DIRETA,
        status: StatusExecucao.EM_ANDAMENTO,
        frentes: []
      })
    );

    expect(created).toMatchObject({
      empresaId: EMPRESA_ID,
      clienteId: null,
      obraId: null,
      descricao: null,
      frentes: [],
      resultados: []
    });
    expect(calls.some((call) => call.model === "resultadoExecucao" && call.action === "create")).toBe(false);
  });

  it("cria execucao com frente executada e recurso realizado", async () => {
    const { db } = createDbMock();
    const created = await runTenant(() => criarExecucao(db as never, inputExecucao()));

    expect(created).toMatchObject({
      empresaId: EMPRESA_ID,
      clienteId: CLIENTE_ID,
      obraId: OBRA_ID,
      descricao: "Execucao de aterro compactado",
      origem: OrigemExecucao.DIRETA,
      status: StatusExecucao.RASCUNHO
    });
    expect((created as { frentes: unknown[] }).frentes).toHaveLength(1);
    expect((created as { resultados: unknown[] }).resultados).toHaveLength(1);
  });

  it("persiste snapshot tecnico economico do recurso sem custo total calculado", async () => {
    const { db } = createDbMock();
    const created = await runTenant(() => criarExecucao(db as never, inputExecucao()));
    const recurso = (created as {
      frentes: Array<{ recursos: Array<Record<string, unknown>> }>;
    }).frentes[0].recursos[0];

    expect(recurso.snapshotTecnicoEconomico).toMatchObject({
      versao: 1,
      baseEconomica: "CARGA",
      valorCusto: 120
    });
    expect(recurso).not.toHaveProperty("custoTotalCalculado");
    expect(recurso).not.toHaveProperty("custoTotal");
  });

  it("busca execucao com include dos relacionamentos Prisma do dominio", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() => buscarExecucao(db as never, EXECUCAO_ID));

    const findCall = calls.find((call) => call.model === "execucao" && call.action === "findFirst");
    expect(findCall?.args).toMatchObject({
      where: {
        id: EXECUCAO_ID,
        empresaId: EMPRESA_ID
      },
      include: execucaoInclude
    });
    expect(execucaoInclude.frentes.include.recursos.include.recurso.select.id).toBe(true);
    expect(execucaoInclude.resultados.orderBy).toEqual([{ createdAt: "desc" }]);
  });

  it("atualiza execucao substituindo frentes e recursos como fatos persistentes", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      atualizarExecucao(db as never, EXECUCAO_ID, {
        ...inputExecucao(),
        descricao: "Execucao atualizada",
        frentes: [
          {
            ...inputExecucao().frentes[0],
            quantidadeExecutada: 700
          }
        ]
      })
    );

    expect(calls.some((call) => call.model === "frenteExecutada" && call.action === "deleteMany")).toBe(true);
    const updateCall = calls.find((call) => call.model === "execucao" && call.action === "update");
    expect(updateCall?.args).toMatchObject({
      where: {
        id: EXECUCAO_ID
      }
    });
  });

  it("valida o fluxo tecnico da execucao utilizando custos de fixture", async () => {
    const { db, calls } = createDbMock();
    const created = await runTenant(() => criarExecucao(db as never, inputCasoPiloto()));
    const resultadoCall = calls.find((call) => call.model === "resultadoExecucao" && call.action === "create");
    const resultadoData = (resultadoCall?.args as { data: Record<string, unknown> }).data;
    const resultadoOperacionalJson = resultadoData.resultadoOperacionalJson as {
      resultadoOperacional: {
        contextoDeCalculo: string;
        consolidado: {
          custoOperacionalTotal: number;
        };
        unidades: Array<{ recursos: Array<{ custoTotal: number }> }>;
      };
      dataCalculo: string;
      versaoNucleo: string;
    };
    const economiaJson = resultadoData.economiaJson as {
      economia: {
        receita: number;
        resultado: number;
        margemPercentual: number | null;
      };
      dataCalculo: string;
      versaoNucleo: string;
    };

    expect(resultadoData).toMatchObject({
      empresaId: EMPRESA_ID,
      execucaoId: EXECUCAO_ID
    });
    expect(resultadoOperacionalJson.resultadoOperacional.contextoDeCalculo).toBe("EXECUCAO");
    expect(resultadoOperacionalJson.resultadoOperacional.consolidado.custoOperacionalTotal).toBe(18240);
    expect(resultadoOperacionalJson.resultadoOperacional.consolidado).not.toHaveProperty("economia");
    expect(resultadoOperacionalJson.resultadoOperacional).not.toHaveProperty("memoriaCalculo");
    expect(resultadoOperacionalJson.resultadoOperacional.unidades[0]).not.toHaveProperty("economia");
    expect(resultadoOperacionalJson.resultadoOperacional.unidades[0].recursos[0]).not.toHaveProperty("memoriaCalculo");
    expect(resultadoOperacionalJson.resultadoOperacional.unidades[0].recursos.map((recurso) => recurso.custoTotal)).toEqual([
      11160,
      1980,
      1800,
      250,
      1700,
      1050,
      300
    ]);
    expect(economiaJson.economia).toEqual({
      receita: 45960.06,
      resultado: 27720.06,
      margemPercentual: 60.31
    });
    expect(resultadoOperacionalJson.versaoNucleo).toBe(EXECUCAO_RESULTADO_NUCLEO_VERSAO);
    expect(economiaJson.versaoNucleo).toBe(EXECUCAO_RESULTADO_NUCLEO_VERSAO);
    expect(new Date(resultadoOperacionalJson.dataCalculo).toString()).not.toBe("Invalid Date");
    expect((created as { resultados: unknown[] }).resultados).toHaveLength(1);
  });

  it("adapta os recursos persistidos sem custo total informado pelo service", async () => {
    const { db } = createDbMock();
    const created = await runTenant(() => criarExecucao(db as never, inputCasoPiloto()));
    const entrada = adaptarExecucaoPersistidaParaEntradaNucleo(created as never);

    expect(entrada.unidades[0].recursos.map((recurso) => recurso.nome)).toEqual([
      "Truck 14 m3",
      "Carreta 22 m3",
      "Escavadeira 15 t",
      "Mini Escavadeira V80",
      "Rolo Pe de Carneiro",
      "Trator de Esteira",
      "Encarregado"
    ]);
    expect(entrada.unidades[0].recursos[0]).toMatchObject({
      quantidadeRealizada: 93,
      unidadeRealizada: "cargas",
      quantidadeRecursos: 1
    });
    expect(JSON.stringify(entrada)).not.toContain("custoTotal");
    expect(JSON.stringify(entrada)).not.toContain("margemPercentual");
  });

  it("alterar um recurso modifica apenas fatos enviados ao nucleo e gera novo snapshot", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputCasoPiloto()));
    await runTenant(() =>
      atualizarExecucao(db as never, EXECUCAO_ID, {
        ...inputCasoPiloto(),
        frentes: [
          {
            ...inputCasoPiloto().frentes[0],
            recursos: inputCasoPiloto().frentes[0].recursos.map((recurso) =>
              recurso.nomeSnapshot === "Truck 14 m3"
                ? {
                    ...recurso,
                    quantidadeRealizada: 94
                  }
                : recurso
            )
          }
        ]
      })
    );
    const resultadoCalls = calls.filter((call) => call.model === "resultadoExecucao" && call.action === "create");
    const ultimoResultado = (resultadoCalls.at(-1)?.args as { data: Record<string, unknown> }).data
      .resultadoOperacionalJson as {
      resultadoOperacional: {
        consolidado: {
          custoOperacionalTotal: number;
        };
      };
    };
    const ultimaEconomia = (resultadoCalls.at(-1)?.args as { data: Record<string, unknown> }).data
      .economiaJson as {
      economia: {
        resultado: number;
      };
    };

    expect(resultadoCalls).toHaveLength(2);
    expect(ultimoResultado.resultadoOperacional.consolidado.custoOperacionalTotal).toBe(18360);
    expect(ultimoResultado.resultadoOperacional.consolidado).not.toHaveProperty("economia");
    expect(ultimaEconomia.economia.resultado).toBe(27600.06);
  });

  it("abre boletim diario com recursos manuais vinculados a frente executada", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    const boletim = await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        observacoes: "Primeiro boletim manual.",
        recursos: recursosBoletimDiaUm()
      })
    );

    expect(boletim).toMatchObject({
      empresaId: EMPRESA_ID,
      execucaoId: EXECUCAO_ID,
      status: StatusBoletimDiarioProducao.ABERTO
    });
    expect((boletim as { recursos: unknown[] }).recursos).toHaveLength(1);
    expect((boletim as { recursos: Array<Record<string, unknown>> }).recursos[0]).toMatchObject({
      frenteExecutadaId: FRENTE_ID,
      origem: OrigemFatoBoletimDiario.MANUAL,
      nomeSnapshot: "Truck 14 m3"
    });
    expect(calls.some((call) => call.model === "boletimDiarioProducao" && call.action === "create")).toBe(true);
  });

  it("bloqueia recurso de boletim vinculado a frente de outra execucao", async () => {
    const { db } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));

    await expect(
      runTenant(() =>
        criarBoletimDiarioProducao(db as never, {
          execucaoId: EXECUCAO_ID,
          dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
          recursos: recursosBoletimDiaUm(FRENTE_EXTERNA_ID)
        })
      )
    ).rejects.toThrow("FRENTE_EXECUTADA_NAO_PERTENCE_EXECUCAO");
  });

  it("fecha boletim, envia fatos acumulados ao nucleo e atualiza snapshot da execucao", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: recursosBoletimDiaUm()
      })
    );
    await runTenant(() => fecharBoletimDiarioProducao(db as never, "boletim-1"));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-08T00:00:00.000Z"),
        recursos: recursosBoletimDiaDois()
      })
    );
    const fechado = await runTenant(() => fecharBoletimDiarioProducao(db as never, "boletim-2"));
    const entrada = adaptarExecucaoComBoletinsParaEntradaNucleo((fechado as {
      execucao: {
        id: string;
        descricao: string;
        empresaId: string;
        frentes: unknown[];
        boletins: unknown[];
      };
    }).execucao as never);
    const resultadoCalls = calls.filter((call) => call.model === "resultadoExecucao" && call.action === "create");
    const ultimoResultado = (resultadoCalls.at(-1)?.args as { data: Record<string, unknown> }).data
      .resultadoOperacionalJson as {
      resultadoOperacional: {
        contextoDeCalculo: string;
        consolidado: {
          custoOperacionalTotal: number;
        };
        unidades: Array<{ recursos: Array<{ nome: string; custoTotal: number }> }>;
      };
    };

    expect((fechado as { status: StatusBoletimDiarioProducao }).status).toBe(StatusBoletimDiarioProducao.FECHADO);
    expect(entrada.metadados).toMatchObject({
      empresaId: EMPRESA_ID,
      origemFatos: "BOLETIM_DIARIO"
    });
    expect(entrada.unidades[0].recursos.map((recurso) => recurso.nome)).toEqual([
      "Truck 14 m3",
      "Escavadeira 15 t"
    ]);
    expect(ultimoResultado.resultadoOperacional.contextoDeCalculo).toBe("EXECUCAO");
    expect(ultimoResultado.resultadoOperacional.consolidado.custoOperacionalTotal).toBe(12960);
    expect(ultimoResultado.resultadoOperacional.unidades[0].recursos.map((recurso) => recurso.custoTotal)).toEqual([
      11160,
      1800
    ]);
    expect(resultadoCalls).toHaveLength(3);
  });

  it("lista fatos operacionais existentes por obra e periodo com rastreabilidade", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));

    const fatos = await runTenant(() =>
      listarFatosOperacionaisExistentes(db as never, {
        execucaoId: EXECUCAO_ID,
        obraId: OBRA_ID,
        dataInicio: "2026-08-06",
        dataFim: "2026-08-06",
        recursoId: RECURSO_ID
      })
    );
    const findManyCall = calls.find((call) => call.model === "lancamentoDiario" && call.action === "findMany");
    const where = (findManyCall?.args as { where: Record<string, unknown> }).where;

    expect(fatos).toHaveLength(1);
    expect(where).toMatchObject({
      empresaId: EMPRESA_ID,
      obraId: OBRA_ID,
      equipamentoId: RECURSO_ID,
      deletedAt: null
    });
    expect(where.statusValidacao).toEqual({ not: "CANCELADO" });
    expect(fatos[0]).toMatchObject({
      id: "99999999-9999-4999-8999-999999999999",
      origemTipo: "LANCAMENTO_DIARIO",
      origemLabel: "Ficha 4100",
      statusVinculo: "DISPONIVEL",
      quantidade: 93,
      unidade: "carga",
      custoDisponivel: true
    });
    expect(fatos[0].snapshotTecnicoEconomico).toMatchObject({
      baseEconomica: "CARGA",
      valorCusto: 120,
      unidadeCusto: "R$/carga"
    });
  });

  it("complementa cabecalho da execucao direta sem remover boletins ou fatos vinculados", async () => {
    const { db, calls, records } = createDbMock();
    await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: null,
        obraId: null,
        descricao: "",
        origem: OrigemExecucao.DIRETA,
        status: StatusExecucao.EM_ANDAMENTO,
        frentes: []
      })
    );
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-06T00:00:00.000Z"),
        recursos: []
      })
    );

    const atualizada = await runTenant(() =>
      atualizarCabecalhoExecucao(db as never, EXECUCAO_ID, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao direta complementada",
        origem: OrigemExecucao.DIRETA,
        status: StatusExecucao.EM_ANDAMENTO,
        frentes: [
          {
            nome: "Servico direto",
            unidade: "m3",
            quantidadeExecutada: 100,
            receitaRealizada: 18000,
            recursos: []
          }
        ]
      })
    );

    expect(atualizada).toMatchObject({
      clienteId: CLIENTE_ID,
      obraId: OBRA_ID,
      descricao: "Execucao direta complementada"
    });
    expect((records.execucao?.frentes as Array<Record<string, unknown>>)[0]).toMatchObject({
      nome: "Servico direto",
      unidade: "m3",
      quantidadeExecutada: 100,
      receitaRealizada: 18000
    });
    expect(records.boletins).toHaveLength(1);
    expect(calls.some((call) => call.model === "frenteExecutada" && call.action === "deleteMany")).toBe(false);
  });

  it("vincula fato existente criando boletim pela data e preservando referencia original", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));

    const vinculados = await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    expect(vinculados).toHaveLength(1);
    expect(records.boletins).toHaveLength(1);
    expect(records.lancamentos).toHaveLength(1);
    expect(records.recursosBoletim[0]).toMatchObject({
      empresaId: EMPRESA_ID,
      execucaoId: EXECUCAO_ID,
      frenteExecutadaId: FRENTE_ID,
      origem: OrigemFatoBoletimDiario.PRODUCAO,
      origemRegistroTipo: "LANCAMENTO_DIARIO",
      origemRegistroId: "99999999-9999-4999-8999-999999999999",
      editavel: false,
      quantidadeRealizada: 93,
      unidadeRealizada: "carga"
    });
  });

  it("bloqueia vinculo duplicado do mesmo fato na mesma execucao", async () => {
    const { db } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    await expect(
      runTenant(() =>
        vincularFatosOperacionaisExecucao(db as never, {
          execucaoId: EXECUCAO_ID,
          frenteExecutadaId: FRENTE_ID,
          fatosIds: ["99999999-9999-4999-8999-999999999999"]
        })
      )
    ).rejects.toThrow("FATO_OPERACIONAL_JA_VINCULADO_NESTA_EXECUCAO");
  });

  it("desvincula recurso do boletim aberto sem excluir o lancamento original", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    await runTenant(() => desvincularRecursoBoletimDiario(db as never, "boletim-recurso-extra-1"));

    expect(records.recursosBoletim).toHaveLength(0);
    expect(records.lancamentos).toHaveLength(1);
  });
});
