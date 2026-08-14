import {
  EstadoEncargosExecucao,
  FormaCalculoEncargoExecucao,
  OrigemExecucao,
  OrigemEncargoExecucao,
  OrigemFatoBoletimDiario,
  OrigemReferenciaPrevistaExecucao,
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
  buscarExecucaoOperacional,
  fecharBoletimDiarioProducao,
  excluirBoletimDiarioProducao,
  criarExecucao,
  gerarResultadoExecucao,
  listarReferenciasOrcamentoExecucao,
  listarFatosOperacionaisExistentes,
  atualizarRecursoBoletimDiarioProducao,
  consolidarExecucaoPorBoletins,
  salvarEncargosEconomicosExecucao,
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
const ORCAMENTO_ID = "88888888-8888-4888-8888-888888888888";
const ORCAMENTO_FRENTE_ID = "99999999-9999-4999-8999-999999999998";

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
    encargos: [] as Array<Record<string, unknown>>,
    referenciasPrevistas: [] as Array<Record<string, unknown>>,
    orcamentos: [
      {
        id: ORCAMENTO_ID,
        empresaId: EMPRESA_ID,
        codigo: "ORC-TST",
        titulo: "Orcamento de validacao",
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        deletedAt: null,
        valorTotal: 1200,
        updatedAt: new Date("2026-08-06T00:00:00.000Z"),
        frentes: [
          {
            id: ORCAMENTO_FRENTE_ID,
            cenarioId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            ordem: 1,
            natureza: "OPERACIONAL",
            nome: "Frente vinculada",
            descricao: "Frente prevista no orcamento",
            unidadeProducao: "m3",
            quantidadePrevista: 100,
            produtividadeDia: 50,
            prazoEstimadoDias: 2,
            prazoTeoricoDias: 2,
            prazoAdotadoDias: null,
            origemPrazo: "AUTOMATICO",
            modoCusto: "AUTO",
            custoManual: 0,
            itens: [
              {
                id: "item-previsto-1",
                ordem: 1,
                tipoItem: "COMERCIAL",
                formaApresentacaoComercial: "QUANTIDADE_DEFINIDA",
                descricao: "Servico contratado",
                quantidade: 100,
                unidade: "m3",
                valorTotal: 1200,
                custoUnitario: 0
              },
              {
                id: "item-recurso-1",
                ordem: 2,
                tipoItem: "RECURSO",
                formaApresentacaoComercial: "QUANTIDADE_DEFINIDA",
                categoriaRecurso: "EQUIPAMENTO",
                descricao: "Escavadeira prevista",
                recursoNome: "Escavadeira prevista",
                classeOperacional: "Escavadeira",
                recursoReferenciaId: RECURSO_ID,
                quantidade: 1,
                quantidadeOperacional: 2,
                origemQuantidadeOperacional: "PERSONALIZADA",
                unidadeQuantidadeOperacional: "dia",
                custoUnitario: 0,
                unidade: "dia",
                tipoCalculoRecurso: "AUTOMATICO",
                unidadeEconomicaCusto: "DIA",
                valorCusto: 300,
                horasDia: 8,
                valorTotal: 0
              }
            ]
          },
          {
            id: "99999999-9999-4999-8999-999999999997",
            cenarioId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            ordem: 2,
            natureza: "OPERACIONAL",
            nome: "Frente nao selecionada",
            unidadeProducao: "m3",
            quantidadePrevista: 50,
            itens: []
          }
        ]
      }
    ] as Array<Record<string, unknown>>,
    lancamentos: [
      {
        id: "99999999-9999-4999-8999-999999999999",
        empresaId: EMPRESA_ID,
        data: new Date("2026-08-06T00:00:00.000Z"),
        obraId: OBRA_ID,
        clienteId: CLIENTE_ID,
        servicoId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "material-areia",
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
        material: { id: "material-areia", codigoMaterial: "MAT-001", descricao: "Areia", unidadePadrao: "m3" },
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
          encargosEconomicos: records.encargos,
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
        if ((args.include as Record<string, unknown> | undefined)?.boletins) {
          return {
            ...records.execucao,
            boletins: records.boletins,
            encargosEconomicos: records.encargos
          };
        }
        return {
          ...records.execucao,
          encargosEconomicos: records.encargos
        };
      },
      findMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "execucao", action: "findMany", args });
        return records.execucao ? [{ ...records.execucao, encargosEconomicos: records.encargos }] : [];
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
          resultados: data.estadoEncargos ? records.resultados : []
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
            boletins: records.boletins.filter((item) => item.status === StatusBoletimDiarioProducao.FECHADO),
            encargosEconomicos: records.encargos
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
            boletins: records.boletins.filter((item) => item.status === StatusBoletimDiarioProducao.FECHADO),
            encargosEconomicos: records.encargos
          }
        };
      },
      delete: async (args: Record<string, unknown>) => {
        calls.push({ model: "boletimDiarioProducao", action: "delete", args });
        const where = args.where as Record<string, unknown>;
        const index = records.boletins.findIndex((item) => item.id === where.id);
        if (index < 0) return null;
        const [removed] = records.boletins.splice(index, 1);
        records.recursosBoletim = records.recursosBoletim.filter((item) => item.boletimId !== where.id);
        return removed;
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
            status: boletim?.status ?? StatusBoletimDiarioProducao.ABERTO,
            execucaoId: boletim?.execucaoId ?? EXECUCAO_ID
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
      },
      update: async (args: Record<string, unknown>) => {
        calls.push({ model: "recursoBoletimDiario", action: "update", args });
        const where = args.where as Record<string, unknown>;
        const data = args.data as Record<string, unknown>;
        const index = records.recursosBoletim.findIndex((item) => item.id === where.id);
        if (index < 0) return null;
        records.recursosBoletim[index] = {
          ...records.recursosBoletim[index],
          ...data
        };
        records.boletins.forEach((boletim) => {
          boletim.recursos = ((boletim.recursos as Array<Record<string, unknown>>) ?? []).map((item) =>
            item.id === where.id ? { ...item, ...data } : item
          );
        });
        return records.recursosBoletim[index];
      }
    },
    encargoEconomicoExecucao: {
      deleteMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "encargoEconomicoExecucao", action: "deleteMany", args });
        const where = args.where as Record<string, unknown>;
        const before = records.encargos.length;
        records.encargos = records.encargos.filter((item) => item.execucaoId !== where.execucaoId || item.empresaId !== where.empresaId);
        return { count: before - records.encargos.length };
      },
      createMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "encargoEconomicoExecucao", action: "createMany", args });
        const data = (args.data ?? []) as Array<Record<string, unknown>>;
        records.encargos.push(...data.map((item, index) => ({
          id: `encargo-${records.encargos.length + index + 1}`,
          createdAt: new Date("2026-08-06T12:00:00.000Z"),
          updatedAt: new Date("2026-08-06T12:00:00.000Z"),
          origem: OrigemEncargoExecucao.MANUAL,
          ...item
        })));
        if (records.execucao) {
          records.execucao.encargosEconomicos = records.encargos;
        }
        return { count: data.length };
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
    },
    orcamento: {
      findFirst: async (args: Record<string, unknown>) => {
        calls.push({ model: "orcamento", action: "findFirst", args });
        const where = args.where as Record<string, unknown>;
        const select = args.select as Record<string, unknown> | undefined;
        const orcamento = records.orcamentos.find((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.empresaId && item.empresaId !== where.empresaId) return false;
          if (where.clienteId && item.clienteId !== where.clienteId) return false;
          if (where.obraId && item.obraId !== where.obraId) return false;
          if (where.deletedAt !== undefined && item.deletedAt !== where.deletedAt) return false;
          return true;
        });
        if (!orcamento) return null;

        const frentesSelect = select?.frentes as Record<string, unknown> | undefined;
        const frenteWhere = frentesSelect?.where as Record<string, unknown> | undefined;
        const frenteIdFilter = frenteWhere?.id as string | { in?: string[] } | undefined;
        const frenteIds = typeof frenteIdFilter === "object" ? (frenteIdFilter.in ?? []) : [];
        return {
          ...orcamento,
          frentes: ((orcamento.frentes as Array<Record<string, unknown>>) ?? []).filter((frente) =>
            !frenteIdFilter
            || (typeof frenteIdFilter === "string" && frente.id === frenteIdFilter)
            || (frenteIds.length > 0 && frenteIds.includes(String(frente.id)))
          )
        };
      },
      findMany: async (args: Record<string, unknown>) => {
        calls.push({ model: "orcamento", action: "findMany", args });
        const where = args.where as Record<string, unknown>;
        const select = args.select as Record<string, unknown> | undefined;
        const includeFrentes = Boolean(select?.frentes);
        return records.orcamentos.filter((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.empresaId && item.empresaId !== where.empresaId) return false;
          if (where.clienteId && item.clienteId !== where.clienteId) return false;
          if (where.obraId && item.obraId !== where.obraId) return false;
          if (where.deletedAt !== undefined && item.deletedAt !== where.deletedAt) return false;
          return true;
        }).map((item) => ({
          ...item,
          frentes: includeFrentes ? item.frentes : undefined
        }));
      }
    },
    execucaoReferenciaPrevista: {
      upsert: async (args: Record<string, unknown>) => {
        calls.push({ model: "execucaoReferenciaPrevista", action: "upsert", args });
        const create = args.create as Record<string, unknown>;
        const update = args.update as Record<string, unknown>;
        const where = args.where as Record<string, unknown>;
        const index = records.referenciasPrevistas.findIndex((item) => item.execucaoId === where.execucaoId);
        if (index >= 0) {
          records.referenciasPrevistas[index] = {
            ...records.referenciasPrevistas[index],
            ...update
          };
          return records.referenciasPrevistas[index];
        }
        const created = {
          id: `referencia-${records.referenciasPrevistas.length + 1}`,
          ...create
        };
        records.referenciasPrevistas.push(created);
        if (records.execucao) {
          records.execucao.referenciaPrevista = created;
        }
        return created;
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

  it("lista orcamentos da obra e somente frentes pertencentes ao orcamento selecionado", async () => {
    const { db } = createDbMock();
    const lista = await runTenant(() =>
      listarReferenciasOrcamentoExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID
      })
    );

    expect(lista.orcamentos).toHaveLength(1);
    expect(lista.orcamentos[0]).toMatchObject({
      id: ORCAMENTO_ID,
      clienteId: CLIENTE_ID,
      obraId: OBRA_ID
    });
    expect(lista.frentes).toHaveLength(0);

    const comFrentes = await runTenant(() =>
      listarReferenciasOrcamentoExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        orcamentoId: ORCAMENTO_ID
      })
    );

    expect(comFrentes.frentes.map((frente) => frente.id)).toEqual([
      ORCAMENTO_FRENTE_ID,
      "99999999-9999-4999-8999-999999999997"
    ]);
    expect(comFrentes.frentes[0]).toMatchObject({
      nome: "Frente vinculada",
      quantidadePrevista: 100,
      unidade: "m3",
      receitaPrevista: 1200
    });
  });

  it("cria execucao vinculada a uma unica frente do orcamento e registra referencia prevista historica", async () => {
    const { db, records } = createDbMock();
    const created = await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao vinculada",
        origem: OrigemExecucao.ORCAMENTO,
        status: StatusExecucao.EM_ANDAMENTO,
        orcamentoOrigemId: ORCAMENTO_ID,
        frenteOrigemId: ORCAMENTO_FRENTE_ID,
        frentes: []
      })
    );

    expect(created).toMatchObject({
      empresaId: EMPRESA_ID,
      clienteId: CLIENTE_ID,
      obraId: OBRA_ID,
      origem: OrigemExecucao.ORCAMENTO,
      orcamentoOrigemId: ORCAMENTO_ID,
      cenarioOrigemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
    });
    expect((created as { frentes: Array<Record<string, unknown>> }).frentes).toHaveLength(1);
    expect((created as { frentes: Array<Record<string, unknown>> }).frentes[0]).toMatchObject({
      nome: "Frente vinculada",
      unidade: "m3",
      quantidadeExecutada: 100,
      receitaRealizada: null
    });
    expect(records.referenciasPrevistas).toHaveLength(1);
    expect(records.referenciasPrevistas[0]).toMatchObject({
      origem: OrigemReferenciaPrevistaExecucao.ORCAMENTO,
      orcamentoOrigemId: ORCAMENTO_ID,
      cenarioOrigemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
    });

    const referencia = records.referenciasPrevistas[0].referenciaPrevistaJson as {
      snapshot: {
        resultadoOperacionalJson: {
          resultadoOperacional: {
            unidades: Array<{
              id: string;
              nome: string;
              quantidade: number;
              recursos: Array<{ referenciaTecnicaId: string | null }>;
            }>;
          };
        };
        economiaJson: {
          unidades: Array<{ economia: { receita: number } }>;
        };
      };
    };
    const frenteExecutada = (created as { frentes: Array<{ id: string }> }).frentes[0];

    expect(referencia.snapshot.resultadoOperacionalJson.resultadoOperacional.unidades).toHaveLength(1);
    expect(referencia.snapshot.resultadoOperacionalJson.resultadoOperacional.unidades[0]).toMatchObject({
      id: frenteExecutada.id,
      nome: "Frente vinculada",
      quantidade: 100
    });
    expect(referencia.snapshot.resultadoOperacionalJson.resultadoOperacional.unidades[0].recursos).toHaveLength(1);
    expect(referencia.snapshot.resultadoOperacionalJson.resultadoOperacional.unidades[0].recursos[0].referenciaTecnicaId).toBe(RECURSO_ID);
    expect(referencia.snapshot.economiaJson.unidades[0].economia.receita).toBe(1200);
  });

  it("mantem receita prevista historica separada da receita realizada em execucao vinculada", async () => {
    const { db, records } = createDbMock();
    const created = await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao vinculada",
        origem: OrigemExecucao.ORCAMENTO,
        status: StatusExecucao.EM_ANDAMENTO,
        orcamentoOrigemId: ORCAMENTO_ID,
        frenteOrigemId: ORCAMENTO_FRENTE_ID,
        frentes: [
          {
            id: FRENTE_ID,
            nome: "Frente vinculada",
            unidade: "m3",
            quantidadeExecutada: 100,
            receitaRealizada: 1500,
            motivoVariacaoReceita: "Ajuste medido em campo",
            recursos: []
          }
        ]
      })
    );
    const frente = (created as { frentes: Array<Record<string, unknown>> }).frentes[0];
    const referencia = records.referenciasPrevistas[0].referenciaPrevistaJson as {
      snapshot: {
        economiaJson: {
          unidades: Array<{ economia: { receita: number } }>;
        };
      };
    };

    expect(frente.receitaRealizada).toBe(1500);
    expect(frente.motivoVariacaoReceita).toBe("Ajuste medido em campo");
    expect(referencia.snapshot.economiaJson.unidades[0].economia.receita).toBe(1200);
  });

  it.each([
    { receitaRealizada: 1200, motivo: "" },
    { receitaRealizada: 1500, motivo: "Servico adicional medido" },
    { receitaRealizada: 900, motivo: "Reducao de escopo" }
  ])("atualiza receita realizada em execucao vinculada sem reescrever o previsto", async ({ receitaRealizada, motivo }) => {
    const { db, records } = createDbMock();
    await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao vinculada",
        origem: OrigemExecucao.ORCAMENTO,
        status: StatusExecucao.EM_ANDAMENTO,
        orcamentoOrigemId: ORCAMENTO_ID,
        frenteOrigemId: ORCAMENTO_FRENTE_ID,
        frentes: []
      })
    );
    const referenciaAntes = JSON.stringify(records.referenciasPrevistas[0].referenciaPrevistaJson);

    await runTenant(() =>
      atualizarCabecalhoExecucao(db as never, EXECUCAO_ID, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao vinculada",
        origem: OrigemExecucao.ORCAMENTO,
        status: StatusExecucao.EM_ANDAMENTO,
        orcamentoOrigemId: ORCAMENTO_ID,
        frentes: [
          {
            id: FRENTE_ID,
            nome: "Frente vinculada",
            unidade: "m3",
            quantidadeExecutada: 100,
            receitaRealizada,
            motivoVariacaoReceita: motivo,
            recursos: []
          }
        ]
      })
    );

    await runTenant(() => gerarResultadoExecucao(db as never, records.execucao as never));

    const frente = (records.execucao?.frentes as Array<Record<string, unknown>>)[0];
    const ultimoResultado = records.resultados[0] as {
      economiaJson: {
        economia: {
          receita: number;
        };
      };
    };

    expect(frente.receitaRealizada).toBe(receitaRealizada);
    expect(frente.motivoVariacaoReceita).toBe(motivo || null);
    expect(ultimoResultado.economiaJson.economia.receita).toBe(receitaRealizada);
    expect(JSON.stringify(records.referenciasPrevistas[0].referenciaPrevistaJson)).toBe(referenciaAntes);
  });

  it("cria execucao vinculada a multiplas frentes sem misturar ids de origem e operacao", async () => {
    const { db, records } = createDbMock();
    const segundaFrenteOrigemId = "99999999-9999-4999-8999-999999999997";
    const created = await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao vinculada",
        origem: OrigemExecucao.ORCAMENTO,
        status: StatusExecucao.EM_ANDAMENTO,
        orcamentoOrigemId: ORCAMENTO_ID,
        frenteOrigemIds: [ORCAMENTO_FRENTE_ID, segundaFrenteOrigemId],
        frentes: []
      })
    );
    const frentesCriadas = (created as { frentes: Array<{ id: string; nome: string; quantidadeExecutada: number | null }> }).frentes;
    const referencia = records.referenciasPrevistas[0].referenciaPrevistaJson as {
      origem: {
        frentes: Array<{ frenteOrigemId: string; frenteExecutadaId: string }>;
      };
      snapshot: {
        resultadoOperacionalJson: {
          resultadoOperacional: {
            unidades: Array<{ id: string; nome: string; quantidade: number }>;
          };
        };
      };
    };

    expect(frentesCriadas).toHaveLength(2);
    expect(frentesCriadas[0]).toMatchObject({ id: FRENTE_ID, nome: "Frente vinculada", quantidadeExecutada: 100 });
    expect(frentesCriadas[1]).toMatchObject({ nome: "Frente nao selecionada", quantidadeExecutada: 50 });
    expect(referencia.origem.frentes).toEqual([
      { frenteOrigemId: ORCAMENTO_FRENTE_ID, frenteExecutadaId: frentesCriadas[0].id, nome: "Frente vinculada", ordem: 1 },
      { frenteOrigemId: segundaFrenteOrigemId, frenteExecutadaId: frentesCriadas[1].id, nome: "Frente nao selecionada", ordem: 2 }
    ]);
    expect(referencia.snapshot.resultadoOperacionalJson.resultadoOperacional.unidades.map((unidade) => unidade.id)).toEqual([
      frentesCriadas[0].id,
      frentesCriadas[1].id
    ]);
    expect(referencia.snapshot.resultadoOperacionalJson.resultadoOperacional.unidades.map((unidade) => unidade.id)).not.toContain(ORCAMENTO_FRENTE_ID);
  });

  it("vincula fatos somente usando FrenteExecutada da execucao e rejeita FrenteOrcamento como destino", async () => {
    const { db, records } = createDbMock();
    const segundaFrenteOrigemId = "99999999-9999-4999-8999-999999999997";
    const created = await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao vinculada",
        origem: OrigemExecucao.ORCAMENTO,
        status: StatusExecucao.EM_ANDAMENTO,
        orcamentoOrigemId: ORCAMENTO_ID,
        frenteOrigemIds: [ORCAMENTO_FRENTE_ID, segundaFrenteOrigemId],
        frentes: []
      })
    );
    const segundaFrenteExecutada = (created as { frentes: Array<{ id: string }> }).frentes[1];

    await expect(runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: ORCAMENTO_FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    )).rejects.toThrow("FRENTE_EXECUTADA_NAO_PERTENCE_EXECUCAO");

    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: segundaFrenteExecutada.id,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    expect(records.boletins).toHaveLength(1);
    expect((records.boletins[0].recursos as Array<Record<string, unknown>>)[0]).toMatchObject({
      frenteExecutadaId: segundaFrenteExecutada.id,
      origemRegistroId: "99999999-9999-4999-8999-999999999999"
    });
  });

  it("mantem referencia prevista estavel apos alteracao posterior do orcamento vivo", async () => {
    const { db, records } = createDbMock();
    await runTenant(() =>
      criarExecucao(db as never, {
        clienteId: CLIENTE_ID,
        obraId: OBRA_ID,
        descricao: "Execucao vinculada",
        origem: OrigemExecucao.ORCAMENTO,
        status: StatusExecucao.EM_ANDAMENTO,
        orcamentoOrigemId: ORCAMENTO_ID,
        frenteOrigemId: ORCAMENTO_FRENTE_ID,
        frentes: []
      })
    );

    const referenciaAntes = JSON.stringify(records.referenciasPrevistas[0].referenciaPrevistaJson);
    const frenteOrcamento = ((records.orcamentos[0].frentes as Array<Record<string, unknown>>)[0]);
    frenteOrcamento.quantidadePrevista = 999;
    (frenteOrcamento.itens as Array<Record<string, unknown>>)[0].valorTotal = 99999;

    expect(JSON.stringify(records.referenciasPrevistas[0].referenciaPrevistaJson)).toBe(referenciaAntes);
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
      custo: 18240,
      encargosEconomicos: 0,
      custoTotalExecucao: 18240,
      resultado: 27720.06,
      margemPercentual: 60.31,
      statusEncargos: "SEM_ENCARGOS",
      encargos: []
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

  it("salva encargos economicos separados dos recursos e envia ao bloco economia do nucleo", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputCasoPiloto()));

    await runTenant(() =>
      salvarEncargosEconomicosExecucao(db as never, EXECUCAO_ID, {
        estadoEncargos: EstadoEncargosExecucao.COM_ENCARGOS,
        encargos: [
          {
            tipo: "RETENCAO",
            descricao: "Retencao comercial",
            formaCalculo: FormaCalculoEncargoExecucao.PERCENTUAL_SOBRE_RECEITA,
            percentual: 10,
            origem: OrigemEncargoExecucao.MANUAL
          },
          {
            tipo: "TAXA",
            descricao: "Taxa informada",
            formaCalculo: FormaCalculoEncargoExecucao.VALOR_INFORMADO,
            valorInformado: 100,
            origem: OrigemEncargoExecucao.MANUAL
          }
        ]
      })
    );
    const resultado = await runTenant(() => consolidarExecucaoPorBoletins(db as never, EXECUCAO_ID));
    const economiaJson = (resultado as { resultados: Array<{ economiaJson: Record<string, unknown> }> }).resultados[0].economiaJson;
    const economia = economiaJson.economia as Record<string, unknown>;

    expect(records.execucao?.estadoEncargos).toBe(EstadoEncargosExecucao.COM_ENCARGOS);
    expect(records.encargos).toHaveLength(2);
    expect(records.recursosBoletim).toHaveLength(0);
    expect(economia.encargosEconomicos).toBe(4696.01);
    expect(economia.custoTotalExecucao).toBe(4696.01);
    expect(economia.statusEncargos).toBe("COM_ENCARGOS");
    expect(economia.encargos).toHaveLength(2);
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

  it("consolida execucao considerando recursos de boletim aberto", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: recursosBoletimDiaUm()
      })
    );

    await runTenant(() => consolidarExecucaoPorBoletins(db as never, EXECUCAO_ID));
    const reaberta = await runTenant(() => buscarExecucaoOperacional(db as never, EXECUCAO_ID));

    const resultadoCalls = calls.filter((call) => call.model === "resultadoExecucao" && call.action === "create");
    const ultimoResultado = (resultadoCalls.at(-1)?.args as { data: Record<string, unknown> }).data
      .resultadoOperacionalJson as {
      resultadoOperacional: {
        consolidado: {
          custoOperacionalTotal: number;
        };
      };
      estadoConsolidacao: string;
    };

    expect(ultimoResultado.resultadoOperacional.consolidado.custoOperacionalTotal).toBe(11160);
    expect(ultimoResultado.estadoConsolidacao).toBe("PROVISORIO");
    expect(reaberta?.boletins?.[0].status).toBe(StatusBoletimDiarioProducao.ABERTO);
    expect(reaberta?.resultados).toHaveLength(1);
  });

  it("consolida parcialmente boletins abertos com recursos completos e pendentes", async () => {
    const { db, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: [
          {
            frenteExecutadaId: FRENTE_ID,
            nomeSnapshot: "ESC 150 I - HYUNDAI",
            quantidadeRealizada: 4.47,
            unidadeRealizada: "h",
            quantidadeRecursos: 1,
            origem: OrigemFatoBoletimDiario.PRODUCAO,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "ESC 150 I - HYUNDAI",
              baseEconomica: "DIA",
              valorCusto: 950,
              custoUnitario: 950,
              unidadeCusto: "R$/dia",
              quantidadeOperacional: 4.47,
              unidadeQuantidadeOperacional: "h",
              metadados: {
                origem: "BIBLIOTECA_RECURSOS",
                origemCusto: "PERSONALIZADO_EXECUCAO"
              }
            }
          },
          {
            frenteExecutadaId: FRENTE_ID,
            nomeSnapshot: "Recurso pendente",
            quantidadeRealizada: 1,
            unidadeRealizada: "h",
            quantidadeRecursos: 1,
            origem: OrigemFatoBoletimDiario.PRODUCAO,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              baseEconomica: "DIA",
              valorCusto: 0,
              unidadeCusto: "R$/dia",
              quantidadeOperacional: 1,
              unidadeQuantidadeOperacional: "h",
              metadados: {
                origemCusto: "PENDENTE_CADASTRO_MESTRE"
              }
            }
          }
        ]
      })
    );

    await runTenant(() => consolidarExecucaoPorBoletins(db as never, EXECUCAO_ID));

    const resultadoCalls = calls.filter((call) => call.model === "resultadoExecucao" && call.action === "create");
    const ultimoResultado = (resultadoCalls.at(-1)?.args as { data: Record<string, unknown> }).data
      .resultadoOperacionalJson as {
      resultadoOperacional: {
        consolidado: {
          custoOperacionalTotal: number;
        };
        unidades: Array<{ recursos: Array<{ nomeTecnico: string; custoTotal: number; baseEconomica: string; horasDia: number; statusCalculo: string }> }>;
      };
    };

    expect(ultimoResultado.resultadoOperacional.consolidado.custoOperacionalTotal).toBe(530.81);
    expect(ultimoResultado.resultadoOperacional.unidades[0].recursos).toHaveLength(2);
    expect(ultimoResultado.resultadoOperacional.unidades[0].recursos[0]).toMatchObject({
      nomeTecnico: "ESC 150 I - HYUNDAI",
      baseEconomica: "DIA",
      horasDia: 8,
      statusCalculo: "CALCULADO",
      custoTotal: 530.81
    });
    expect(ultimoResultado.resultadoOperacional.unidades[0].recursos[1]).toMatchObject({
      nomeTecnico: "Recurso pendente",
      statusCalculo: "PENDENTE",
      custoTotal: 0
    });
  });

  it("ignora resultado obsoleto que nao cobre todos os recursos atuais dos boletins", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: [
          ...recursosBoletimDiaUm(),
          ...recursosBoletimDiaDois()
        ]
      })
    );
    const resultadoObsoleto = {
      id: "resultado-obsoleto",
      empresaId: EMPRESA_ID,
      execucaoId: EXECUCAO_ID,
      createdAt: new Date("2026-08-07T10:00:00.000Z"),
      resultadoOperacionalJson: {
        resultadoOperacional: {
          unidades: [
            {
              recursos: [
                {
                  id: "boletim-recurso-1-1",
                  recursoBoletimId: "boletim-recurso-1-1",
                  custoTotal: 11160,
                  statusCalculo: "CALCULADO"
                }
              ]
            }
          ]
        }
      }
    };
    records.resultados.unshift(resultadoObsoleto);
    if (records.execucao) {
      records.execucao.resultados = records.resultados;
    }

    const execucao = await runTenant(() => buscarExecucaoOperacional(db as never, EXECUCAO_ID));

    expect(execucao?.boletins?.[0].recursos).toHaveLength(2);
    expect(execucao?.resultados).toHaveLength(0);
  });

  it("ignora resultado obsoleto que cobre ids mas nao a configuracao economica atual", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: [
          ...recursosBoletimDiaUm(),
          ...recursosBoletimDiaDois()
        ]
      })
    );
    const resultadoComAssinaturaAntiga = {
      id: "resultado-assinatura-antiga",
      empresaId: EMPRESA_ID,
      execucaoId: EXECUCAO_ID,
      createdAt: new Date("2026-08-07T10:00:00.000Z"),
      resultadoOperacionalJson: {
        resultadoOperacional: {
          unidades: [
            {
              recursos: [
                {
                  id: "boletim-recurso-1-1",
                  recursoBoletimId: "boletim-recurso-1-1",
                  baseEconomica: "CARGA",
                  custoUnitario: 99,
                  quantidadeOperacional: 93,
                  unidadeQuantidadeOperacional: "cargas",
                  unidadeCustoFormatada: "R$/carga",
                  custoTotal: 9207,
                  statusCalculo: "CALCULADO"
                },
                {
                  id: "boletim-recurso-1-2",
                  recursoBoletimId: "boletim-recurso-1-2",
                  baseEconomica: "DIA",
                  custoUnitario: 900,
                  quantidadeOperacional: 2,
                  unidadeQuantidadeOperacional: "diarias",
                  unidadeCustoFormatada: "R$/dia",
                  custoTotal: 1800,
                  statusCalculo: "CALCULADO"
                }
              ]
            }
          ]
        }
      }
    };
    records.resultados.unshift(resultadoComAssinaturaAntiga);
    if (records.execucao) {
      records.execucao.resultados = records.resultados;
    }

    const execucao = await runTenant(() => buscarExecucaoOperacional(db as never, EXECUCAO_ID));

    expect(execucao?.boletins?.[0].recursos).toHaveLength(2);
    expect(execucao?.resultados).toHaveLength(0);
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
      unidadeCusto: "R$/carga",
      componenteEconomico: "TRANSPORTE",
      materialId: "material-areia",
      materialDescricao: "Areia"
    });
  });

  it("preserva materiais diferentes em lancamentos do mesmo recurso", async () => {
    const { db, records } = createDbMock();
    records.lancamentos.push({
      ...(records.lancamentos[0] as Record<string, unknown>),
      id: "88888888-8888-4888-8888-888888888888",
      materialId: "material-brita",
      quantidadeApontada: 3,
      quantidadeFaturada: 3,
      material: { id: "material-brita", codigoMaterial: "MAT-002", descricao: "Brita Graduada", unidadePadrao: "m3" }
    });
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

    expect(fatos).toHaveLength(2);
    expect(fatos.map((fato) => fato.materialDescricao)).toEqual(["Areia", "Brita Graduada"]);
    expect(fatos.map((fato) => fato.snapshotTecnicoEconomico.materialDescricao)).toEqual(["Areia", "Brita Graduada"]);
    expect(new Set(fatos.map((fato) => fato.id)).size).toBe(2);
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

  it("mantem fato vinculado fora da elegibilidade e mostra novo lancamento posterior como disponivel", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );
    records.lancamentos.push({
      ...(records.lancamentos[0] as Record<string, unknown>),
      id: "88888888-8888-4888-8888-888888888888",
      data: new Date("2026-08-06T00:00:00.000Z"),
      ficha: { numero: "4101" },
      quantidadeApontada: 9,
      quantidadeFaturada: 9
    });

    const fatos = await runTenant(() =>
      listarFatosOperacionaisExistentes(db as never, {
        execucaoId: EXECUCAO_ID,
        obraId: OBRA_ID,
        dataInicio: "2026-08-06",
        dataFim: "2026-08-06"
      })
    );

    expect(fatos).toHaveLength(2);
    expect(fatos.find((fato) => fato.id === "99999999-9999-4999-8999-999999999999")).toMatchObject({
      statusVinculo: "VINCULADO"
    });
    expect(fatos.find((fato) => fato.id === "88888888-8888-4888-8888-888888888888")).toMatchObject({
      statusVinculo: "DISPONIVEL",
      quantidade: 9
    });
  });

  it("reutiliza boletim aberto da mesma data ao vincular novo lancamento", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-06T00:00:00.000Z"),
        recursos: []
      })
    );

    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    expect(records.boletins).toHaveLength(1);
    expect(records.recursosBoletim[0]).toMatchObject({
      boletimId: "boletim-1",
      origemRegistroId: "99999999-9999-4999-8999-999999999999"
    });
  });

  it("bloqueia vinculo quando a data do lancamento possui boletim fechado", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-06T00:00:00.000Z"),
        recursos: []
      })
    );
    records.boletins[0].status = StatusBoletimDiarioProducao.FECHADO;

    await expect(
      runTenant(() =>
        vincularFatosOperacionaisExecucao(db as never, {
          execucaoId: EXECUCAO_ID,
          frenteExecutadaId: FRENTE_ID,
          fatosIds: ["99999999-9999-4999-8999-999999999999"]
        })
      )
    ).rejects.toThrow("BOLETIM_DIARIO_FECHADO_NAO_PERMITE_ALTERACAO");
    expect(records.recursosBoletim).toHaveLength(0);
  });

  it("atualiza configuracao economica do recurso vinculado sem alterar o fato original", async () => {
    const { db, records, calls } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    await runTenant(() =>
      atualizarRecursoBoletimDiarioProducao(db as never, "boletim-recurso-extra-1", {
        frenteExecutadaId: FRENTE_ID,
        recursoId: RECURSO_ID,
        nomeSnapshot: "TRUCK-01 - Truck 14 m3",
        quantidadeRealizada: 93,
        unidadeRealizada: "carga",
        quantidadeRecursos: 1,
        origem: OrigemFatoBoletimDiario.PRODUCAO,
        origemRegistroTipo: "LANCAMENTO_DIARIO",
        origemRegistroId: "99999999-9999-4999-8999-999999999999",
        editavel: false,
        snapshotTecnicoEconomico: {
          baseEconomica: "CARGA",
          valorCusto: 150,
          custoUnitario: 150,
          unidadeCusto: "R$/carga",
          quantidadeOperacional: 93,
          unidadeQuantidadeOperacional: "carga",
          metadados: {
            origem: "BIBLIOTECA_RECURSOS",
            origemCusto: "PERSONALIZADO_EXECUCAO",
            valorBibliotecaOriginal: 120,
            valorCustoUtilizado: 150,
            motivoPersonalizacao: "Validacao operacional"
          }
        }
      })
    );

    expect(records.recursosBoletim[0].snapshotTecnicoEconomico).toMatchObject({
      baseEconomica: "CARGA",
      valorCusto: 150,
      metadados: {
        origemCusto: "PERSONALIZADO_EXECUCAO",
        valorBibliotecaOriginal: 120
      }
    });
    expect(records.lancamentos[0]).toMatchObject({
      equipamento: {
        custoPadrao: 120
      }
    });
    expect(calls.some((call) => call.model === "recursoBoletimDiario" && call.action === "update")).toBe(true);
  });

  it("bloqueia fechamento quando existe recurso com custo pendente", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: [
          {
            ...recursosBoletimDiaUm()[0],
            snapshotTecnicoEconomico: {
              baseEconomica: "CARGA",
              valorCusto: 0,
              unidadeCusto: "R$/carga",
              metadados: {
                origemCusto: "PENDENTE_CADASTRO_MESTRE"
              }
            }
          }
        ]
      })
    );

    await expect(runTenant(() => fecharBoletimDiarioProducao(db as never, "boletim-1"))).rejects.toThrow("EXISTEM_RECURSOS_COM_CUSTO_PENDENTE");
    expect(records.resultados).toHaveLength(1);
  });

  it("fecha boletim com diaria em horas quando custo foi definido sobre metadado antigo pendente", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: [
          {
            frenteExecutadaId: FRENTE_ID,
            nomeSnapshot: "ESC 150 I - HYUNDAI",
            quantidadeRealizada: 2.45,
            unidadeRealizada: "h",
            quantidadeRecursos: 1,
            origem: OrigemFatoBoletimDiario.PRODUCAO,
            snapshotTecnicoEconomico: {
              categoria: "EQUIPAMENTO",
              classeOperacional: "ESC 150 I - HYUNDAI",
              baseEconomica: "DIA",
              valorCusto: 950,
              custoUnitario: 950,
              unidadeCusto: "R$/dia",
              quantidadeOperacional: 2.45,
              unidadeQuantidadeOperacional: "h",
              metadados: {
                origem: "BIBLIOTECA_RECURSOS",
                origemCusto: "PENDENTE_CADASTRO_MESTRE"
              }
            }
          }
        ]
      })
    );

    await runTenant(() => fecharBoletimDiarioProducao(db as never, "boletim-1"));

    const ultimoResultado = records.resultados[0].resultadoOperacionalJson as {
      resultadoOperacional: {
        consolidado: { custoOperacionalTotal: number };
        unidades: Array<{
          recursos: Array<{
            id: string;
            recursoRealizadoId: string;
            recursoBoletimId: string;
            origemRegistroTipo: string | null;
            origemRegistroId: string | null;
            custoTotal: number;
            baseEconomica: string;
            horasDia: number;
          }>;
        }>;
      };
    };
    const recurso = ultimoResultado.resultadoOperacional.unidades[0].recursos[0];
    const custoEsperado = Math.round(((2.45 / 8) * 950 + Number.EPSILON) * 100) / 100;
    const somaRecursos = ultimoResultado.resultadoOperacional.unidades[0].recursos.reduce(
      (total, item) => total + item.custoTotal,
      0
    );

    expect(ultimoResultado.resultadoOperacional.consolidado.custoOperacionalTotal).toBe(custoEsperado);
    expect(somaRecursos).toBe(ultimoResultado.resultadoOperacional.consolidado.custoOperacionalTotal);
    expect(recurso).toMatchObject({
      id: "boletim-recurso-1-1",
      recursoRealizadoId: "boletim-recurso-1-1",
      recursoBoletimId: "boletim-recurso-1-1",
      origemRegistroTipo: null,
      origemRegistroId: null,
      baseEconomica: "DIA",
      horasDia: 8,
      custoTotal: custoEsperado
    });
  });

  it("fecha boletim quando recurso composto possui componente calculavel e material sem custo", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: [
          {
            frenteExecutadaId: FRENTE_ID,
            nomeSnapshot: "Caminhao com material sem custo",
            quantidadeRealizada: 5,
            unidadeRealizada: "carga",
            quantidadeRecursos: 1,
            origem: OrigemFatoBoletimDiario.PRODUCAO,
            snapshotTecnicoEconomico: {
              categoria: "CAMINHAO",
              baseEconomica: "KM",
              valorCusto: 8,
              custoUnitario: 8,
              unidadeCusto: "R$/km",
              quantidadeOperacional: 5,
              unidadeQuantidadeOperacional: "carga",
              distanciaViagemKm: 12,
              materialId: "material-sem-custo",
              materialDescricao: "Material sem custo",
              materialUnidade: "m3",
              materialBaseEconomica: "M3"
            }
          }
        ]
      })
    );

    await runTenant(() => fecharBoletimDiarioProducao(db as never, "boletim-1"));

    const ultimoResultado = records.resultados[0].resultadoOperacionalJson as {
      resultadoOperacional: {
        unidades: Array<{
          recursos: Array<{
            custoTotal: number;
            statusCalculo: string;
            componentesEconomicos?: Array<{
              tipo: string;
              statusCalculo: string;
              custoTotal: number;
            }>;
          }>;
        }>;
      };
    };
    const recurso = ultimoResultado.resultadoOperacional.unidades[0].recursos[0];

    expect(recurso.custoTotal).toBe(480);
    expect(recurso.statusCalculo).toBe("CALCULADO");
    expect(recurso.componentesEconomicos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: "TRANSPORTE", statusCalculo: "CALCULADO", custoTotal: 480 }),
        expect.objectContaining({ tipo: "MATERIAL", statusCalculo: "SEM_CUSTO", custoTotal: 0 })
      ])
    );
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

  it("exclui boletim aberto, preserva lancamento original e permite novo vinculo com material", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    await runTenant(() => excluirBoletimDiarioProducao(db as never, "boletim-1"));

    const fatosDisponiveis = await runTenant(() =>
      listarFatosOperacionaisExistentes(db as never, {
        execucaoId: EXECUCAO_ID,
        obraId: OBRA_ID,
        dataInicio: "2026-08-06",
        dataFim: "2026-08-06",
        recursoId: RECURSO_ID
      })
    );

    expect(records.boletins).toHaveLength(0);
    expect(records.recursosBoletim).toHaveLength(0);
    expect(records.lancamentos).toHaveLength(1);
    expect(records.resultados).toHaveLength(2);
    expect(fatosDisponiveis[0]).toMatchObject({
      id: "99999999-9999-4999-8999-999999999999",
      statusVinculo: "DISPONIVEL"
    });

    await runTenant(() =>
      vincularFatosOperacionaisExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        frenteExecutadaId: FRENTE_ID,
        fatosIds: ["99999999-9999-4999-8999-999999999999"]
      })
    );

    expect(records.recursosBoletim[0].snapshotTecnicoEconomico).toMatchObject({
      materialId: "material-areia",
      materialCodigo: "MAT-001",
      materialDescricao: "Areia",
      materialUnidade: "m3"
    });
  });

  it("bloqueia exclusao de boletim fechado", async () => {
    const { db, records } = createDbMock();
    await runTenant(() => criarExecucao(db as never, inputExecucao()));
    await runTenant(() =>
      criarBoletimDiarioProducao(db as never, {
        execucaoId: EXECUCAO_ID,
        dataBoletim: new Date("2026-08-07T00:00:00.000Z"),
        recursos: recursosBoletimDiaUm()
      })
    );
    await runTenant(() => fecharBoletimDiarioProducao(db as never, "boletim-1"));

    await expect(runTenant(() => excluirBoletimDiarioProducao(db as never, "boletim-1"))).rejects.toThrow("BOLETIM_FECHADO_NAO_PODE_SER_EXCLUIDO");
    expect(records.boletins).toHaveLength(1);
    expect(records.boletins[0].status).toBe(StatusBoletimDiarioProducao.FECHADO);
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
