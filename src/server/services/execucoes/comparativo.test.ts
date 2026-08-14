import { OrigemReferenciaPrevistaExecucao, RoleUsuarioEmpresa } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { executarNucleoComMotorAtual, type EntradaNucleoEngenharia } from "@/lib/engineering-core";
import { runWithTenantContext } from "@/lib/tenant-store";
import {
  buscarComparativoExecucao,
  compararValor,
  gerarComparativoAPartirDeSnapshots,
  prepararReferenciaPrevistaExecucao,
  registrarReferenciaPrevistaExecucao
} from "./comparativo";

const EMPRESA_ID = "11111111-1111-4111-8111-111111111111";
const EXECUCAO_ID = "55555555-5555-4555-8555-555555555555";

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

function entradaBase(params: {
  receita: number;
  quantidade?: number;
  recursos: EntradaNucleoEngenharia["unidades"][number]["recursos"];
}): EntradaNucleoEngenharia {
  return {
    contextoDeCalculo: "EXECUCAO",
    analiseId: EXECUCAO_ID,
    nomeTecnico: "Execucao comparativa de teste",
    unidades: [
      {
        id: "frente-aterro",
        nome: "Aterro Compactado",
        quantidade: params.quantidade ?? 100,
        unidade: "m3",
        receita: params.receita,
        modoCusto: "AUTO",
        recursos: params.recursos
      }
    ]
  };
}

function recurso(params: {
  id: string;
  referenciaTecnicaId?: string | null;
  nome: string;
  quantidade: number;
  valorCusto: number;
  unidade?: string;
  baseEconomica?: "CARGA" | "DIA" | "HORA" | "KM" | "VIAGEM";
  classeOperacional?: string | null;
  categoria?: string | null;
  horasDia?: number;
  horasTotais?: number;
  viagensOperacionais?: number;
  capacidadePorViagem?: number;
  unidadeCapacidade?: string | null;
}) {
  const baseEconomica = params.baseEconomica ?? "CARGA";
  const unidade = params.unidade ?? "cargas";

  return {
    id: params.id,
    unidadeOperacionalId: "frente-aterro",
    nomeTecnico: params.nome,
    descricaoTecnica: params.nome,
    categoria: params.categoria ?? "EQUIPAMENTO",
    classeOperacional: params.classeOperacional ?? null,
    referenciaTecnicaId: params.referenciaTecnicaId ?? null,
    quantidadeRecursos: 1,
    quantidadeOperacional: params.quantidade,
    origemQuantidadeOperacional: "PERSONALIZADA" as const,
    unidadeQuantidadeOperacional: unidade,
    custoUnitario: params.valorCusto,
    unidadeCusto: `R$/${unidade}`,
    tipoCalculo: "AUTOMATICO" as const,
    baseEconomica,
    valorCusto: params.valorCusto,
    cargasTotais: baseEconomica === "CARGA" ? params.quantidade : undefined,
    horasDia: params.horasDia,
    horasTotais: params.horasTotais,
    viagensOperacionais: params.viagensOperacionais,
    viagensTotais: baseEconomica === "VIAGEM" ? params.quantidade : undefined,
    capacidadePorViagem: params.capacidadePorViagem,
    unidadeCapacidade: params.unidadeCapacidade
  };
}

function snapshot(resultado: ReturnType<typeof executarNucleoComMotorAtual>) {
  const prepared = prepararReferenciaPrevistaExecucao({
    execucaoId: EXECUCAO_ID,
    origem: OrigemReferenciaPrevistaExecucao.PROPOSTA,
    propostaOrigemId: "proposta-1",
    resultadoPrevisto: resultado
  });

  return (prepared.referenciaPrevistaJson as {
    snapshot: {
      resultadoOperacionalJson: unknown;
      economiaJson: unknown;
    };
  }).snapshot;
}

function criarComparativoFixture() {
  // Custos de fixture usados apenas para validar o mecanismo de comparacao.
  // A homologacao economica real deve usar snapshots oficiais de orcamento/proposta e execucao.
  const previsto = executarNucleoComMotorAtual(
    entradaBase({
      receita: 1000,
      recursos: [
        recurso({ id: "previsto-escavadeira", referenciaTecnicaId: "eq-escavadeira", nome: "Escavadeira", quantidade: 10, valorCusto: 20 }),
        recurso({ id: "previsto-rolo", referenciaTecnicaId: "eq-rolo", nome: "Rolo", quantidade: 5, valorCusto: 10 }),
        recurso({ id: "previsto-sem-chave", nome: "Recurso sem chave", quantidade: 1, valorCusto: 30 })
      ]
    })
  );
  const realizado = executarNucleoComMotorAtual(
    entradaBase({
      receita: 900,
      recursos: [
        recurso({ id: "realizado-escavadeira", referenciaTecnicaId: "eq-escavadeira", nome: "Escavadeira", quantidade: 12, valorCusto: 20 }),
        recurso({ id: "realizado-truck", referenciaTecnicaId: "eq-truck", nome: "Truck", quantidade: 4, valorCusto: 10 }),
        recurso({ id: "realizado-sem-chave", nome: "Recurso sem chave", quantidade: 1, valorCusto: 30 })
      ]
    })
  );

  return gerarComparativoAPartirDeSnapshots({
    execucaoId: EXECUCAO_ID,
    referenciaPrevista: {
      origem: {
        tipo: OrigemReferenciaPrevistaExecucao.PROPOSTA,
        propostaOrigemId: "proposta-1"
      },
      snapshot: snapshot(previsto)
    },
    realizado: snapshot(realizado)
  });
}

describe("comparativo Orcado x Realizado da Execucao", () => {
  it("compara quantidade, receita, custo, resultado e margem por frente", () => {
    const comparativo = criarComparativoFixture();
    const frente = comparativo.frentes[0];

    expect(comparativo.referenciaDisponivel).toBe(true);
    expect(frente.quantidade).toMatchObject({ previsto: 100, realizado: 100, desvioAbsoluto: 0, desvioPercentual: 0 });
    expect(frente.receita).toMatchObject({ previsto: 1000, realizado: 900, desvioAbsoluto: -100, desvioPercentual: -10 });
    expect(frente.custo).toMatchObject({ previsto: 280, realizado: 310, desvioAbsoluto: 30, desvioPercentual: 10.71 });
    expect(frente.resultado).toMatchObject({ previsto: 720, realizado: 590, desvioAbsoluto: -130, desvioPercentual: -18.06 });
    expect(frente.margem).toMatchObject({ previsto: 72, realizado: 65.56 });
  });

  it.each([
    { descricao: "igual ao previsto", previsto: 1000, realizado: 1000, desvio: 0, percentual: 0 },
    { descricao: "maior que o previsto", previsto: 1000, realizado: 1250, desvio: 250, percentual: 25 },
    { descricao: "menor que o previsto", previsto: 1000, realizado: 750, desvio: -250, percentual: -25 }
  ])("compara receita realizada $descricao sem alterar a referencia prevista", ({ previsto, realizado, desvio, percentual }) => {
    const comparativo = gerarComparativoAPartirDeSnapshots({
      execucaoId: EXECUCAO_ID,
      referenciaPrevista: {
        origem: {
          tipo: OrigemReferenciaPrevistaExecucao.PROPOSTA,
          propostaOrigemId: "proposta-1"
        },
        snapshot: snapshot(executarNucleoComMotorAtual(entradaBase({ receita: previsto, recursos: [] })))
      },
      realizado: snapshot(executarNucleoComMotorAtual(entradaBase({ receita: realizado, recursos: [] })))
    });

    expect(comparativo.frentes[0].receita).toMatchObject({
      previsto,
      realizado,
      desvioAbsoluto: desvio,
      desvioPercentual: percentual
    });
  });

  it("classifica recursos correspondentes, somente previstos e somente realizados", () => {
    const recursos = criarComparativoFixture().frentes[0].recursos;

    expect(recursos.find((item) => item.referenciaTecnicaId === "eq-escavadeira")).toMatchObject({
      status: "CORRESPONDENTE",
      quantidade: { previsto: 10, realizado: 12, desvioAbsoluto: 2, desvioPercentual: 20 },
      custo: { previsto: 200, realizado: 240, desvioAbsoluto: 40, desvioPercentual: 20 }
    });
    expect(recursos.find((item) => item.referenciaTecnicaId === "eq-rolo")).toMatchObject({
      status: "SOMENTE_PREVISTO",
      custo: { previsto: 50, realizado: null }
    });
    expect(recursos.find((item) => item.referenciaTecnicaId === "eq-truck")).toMatchObject({
      status: "SOMENTE_REALIZADO",
      custo: { previsto: null, realizado: 40 }
    });
  });

  it("consolida varios lancamentos realizados do mesmo recurso tecnico antes de comparar", () => {
    const previsto = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({ id: "previsto-caminhao", referenciaTecnicaId: "eq-caminhao", nome: "Caminhao", quantidade: 10, valorCusto: 50 })
        ]
      })
    );
    const realizado = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({ id: "realizado-caminhao-1", referenciaTecnicaId: "eq-caminhao", nome: "Caminhao", quantidade: 4, valorCusto: 50 }),
          recurso({ id: "realizado-caminhao-2", referenciaTecnicaId: "eq-caminhao", nome: "Caminhao", quantidade: 8, valorCusto: 50 })
        ]
      })
    );

    const comparativo = gerarComparativoAPartirDeSnapshots({
      execucaoId: EXECUCAO_ID,
      referenciaPrevista: {
        origem: {
          tipo: OrigemReferenciaPrevistaExecucao.PROPOSTA,
          propostaOrigemId: "proposta-1"
        },
        snapshot: snapshot(previsto)
      },
      realizado: snapshot(realizado)
    });

    expect(comparativo.frentes[0].recursos).toHaveLength(1);
    expect(comparativo.frentes[0].recursos[0]).toMatchObject({
      status: "CORRESPONDENTE",
      quantidade: { previsto: 10, realizado: 12, desvioAbsoluto: 2 },
      custo: { previsto: 500, realizado: 600, desvioAbsoluto: 100 }
    });
  });

  it("compara recurso previsto em dia com realizado em hora usando equivalencia operacional do dominio", () => {
    const previsto = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({
            id: "previsto-equipamento-dia",
            referenciaTecnicaId: "eq-dia-hora",
            nome: "Equipamento por dia",
            quantidade: 3,
            valorCusto: 800,
            unidade: "dia",
            baseEconomica: "DIA",
            horasDia: 8
          })
        ]
      })
    );
    const realizado = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({
            id: "realizado-equipamento-hora",
            referenciaTecnicaId: "eq-dia-hora",
            nome: "Equipamento por hora",
            quantidade: 16,
            valorCusto: 800,
            unidade: "h",
            baseEconomica: "DIA",
            horasDia: 8,
            horasTotais: 16
          })
        ]
      })
    );

    const comparativo = gerarComparativoAPartirDeSnapshots({
      execucaoId: EXECUCAO_ID,
      referenciaPrevista: {
        origem: {
          tipo: OrigemReferenciaPrevistaExecucao.PROPOSTA,
          propostaOrigemId: "proposta-1"
        },
        snapshot: snapshot(previsto)
      },
      realizado: snapshot(realizado)
    });

    expect(comparativo.frentes[0].recursos[0]).toMatchObject({
      status: "CORRESPONDENTE",
      unidade: "dia",
      quantidade: { previsto: 3, realizado: 2, desvioAbsoluto: -1 },
      custo: { previsto: 2400, realizado: 1600, desvioAbsoluto: -800 }
    });
  });

  it("usa identidade operacional estruturada para recurso manual equivalente ao previsto", () => {
    const previsto = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({
            id: "previsto-funcao",
            nome: "Funcao operacional prevista",
            quantidade: 3,
            valorCusto: 300,
            unidade: "dia",
            baseEconomica: "DIA",
            classeOperacional: "classe-compactacao",
            categoria: "EQUIPAMENTO",
            horasDia: 8
          })
        ]
      })
    );
    const realizado = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({
            id: "realizado-manual-equivalente",
            nome: "Ativo manual equivalente",
            quantidade: 2,
            valorCusto: 300,
            unidade: "dia",
            baseEconomica: "DIA",
            classeOperacional: "classe-compactacao",
            categoria: "EQUIPAMENTO",
            horasDia: 8
          })
        ]
      })
    );

    const comparativo = gerarComparativoAPartirDeSnapshots({
      execucaoId: EXECUCAO_ID,
      referenciaPrevista: {
        origem: {
          tipo: OrigemReferenciaPrevistaExecucao.PROPOSTA,
          propostaOrigemId: "proposta-1"
        },
        snapshot: snapshot(previsto)
      },
      realizado: snapshot(realizado)
    });

    expect(comparativo.frentes[0].recursos[0]).toMatchObject({
      status: "CORRESPONDENTE",
      referenciaTecnicaId: null,
      quantidade: { previsto: 3, realizado: 2, desvioAbsoluto: -1 }
    });
    expect(comparativo.frentes[0].recursos[0].identidadeOperacionalComparativa).toContain("classe:classe-compactacao");
  });

  it("consolida varios ativos fisicos na mesma funcao operacional estruturada", () => {
    const previsto = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({
            id: "previsto-transporte",
            nome: "Transporte planejado",
            quantidade: 75,
            valorCusto: 90,
            unidade: "viagem",
            baseEconomica: "VIAGEM",
            classeOperacional: "transporte-basculante",
            categoria: "TRANSPORTE",
            capacidadePorViagem: 14,
            unidadeCapacidade: "m3"
          })
        ]
      })
    );
    const realizado = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          recurso({
            id: "ativo-fisico-1",
            nome: "Ativo fisico 1",
            quantidade: 30,
            valorCusto: 90,
            unidade: "viagem",
            baseEconomica: "VIAGEM",
            classeOperacional: "transporte-basculante",
            categoria: "TRANSPORTE",
            capacidadePorViagem: 14,
            unidadeCapacidade: "m3"
          }),
          recurso({
            id: "ativo-fisico-2",
            nome: "Ativo fisico 2",
            quantidade: 50,
            valorCusto: 90,
            unidade: "viagem",
            baseEconomica: "VIAGEM",
            classeOperacional: "transporte-basculante",
            categoria: "TRANSPORTE",
            capacidadePorViagem: 14,
            unidadeCapacidade: "m3"
          })
        ]
      })
    );

    const comparativo = gerarComparativoAPartirDeSnapshots({
      execucaoId: EXECUCAO_ID,
      referenciaPrevista: {
        origem: {
          tipo: OrigemReferenciaPrevistaExecucao.PROPOSTA,
          propostaOrigemId: "proposta-1"
        },
        snapshot: snapshot(previsto)
      },
      realizado: snapshot(realizado)
    });

    expect(comparativo.frentes[0].recursos).toHaveLength(1);
    expect(comparativo.frentes[0].recursos[0]).toMatchObject({
      status: "CORRESPONDENTE",
      unidade: "viagem",
      quantidade: { previsto: 75, realizado: 80, desvioAbsoluto: 5 },
      custo: { previsto: 6750, realizado: 7200, desvioAbsoluto: 450 }
    });
    expect(comparativo.frentes[0].recursos[0].origem.realizado).toContain("ativo-fisico-1");
    expect(comparativo.frentes[0].recursos[0].origem.realizado).toContain("ativo-fisico-2");
  });

  it("usa a quantidade logistica calculada pelo Motor para transporte em KM", () => {
    const previsto = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          {
            ...recurso({
              id: "previsto-km",
              referenciaTecnicaId: "transporte-km",
              nome: "Transporte por km",
              quantidade: 140,
              valorCusto: 8,
              unidade: "m3",
              baseEconomica: "KM",
              capacidadePorViagem: 14,
              unidadeCapacidade: "m3"
            }),
            distanciaViagemKm: 10
          }
        ]
      })
    );
    const realizado = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [
          {
            ...recurso({
              id: "realizado-km",
              referenciaTecnicaId: "transporte-km",
              nome: "Transporte por km",
              quantidade: 168,
              valorCusto: 8,
              unidade: "m3",
              baseEconomica: "KM",
              capacidadePorViagem: 14,
              unidadeCapacidade: "m3"
            }),
            distanciaViagemKm: 10
          }
        ]
      })
    );

    const comparativo = gerarComparativoAPartirDeSnapshots({
      execucaoId: EXECUCAO_ID,
      referenciaPrevista: {
        origem: {
          tipo: OrigemReferenciaPrevistaExecucao.PROPOSTA,
          propostaOrigemId: "proposta-1"
        },
        snapshot: snapshot(previsto)
      },
      realizado: snapshot(realizado)
    });

    expect(comparativo.frentes[0].recursos[0]).toMatchObject({
      status: "CORRESPONDENTE",
      unidade: "viagem",
      quantidade: { previsto: 10, realizado: 12, desvioAbsoluto: 2 }
    });
  });

  it("nao compara recursos apenas pelo nome quando nao ha chave estavel", () => {
    const recursosSemChave = criarComparativoFixture().frentes[0].recursos.filter(
      (item) => item.recurso === "Recurso sem chave"
    );

    expect(recursosSemChave.map((item) => item.status)).toEqual(["SOMENTE_PREVISTO", "SOMENTE_REALIZADO"]);
  });

  it("retorna comparativo indisponivel para execucao direta sem referencia prevista", () => {
    const comparativo = gerarComparativoAPartirDeSnapshots({
      execucaoId: EXECUCAO_ID,
      referenciaPrevista: null,
      realizado: null
    });

    expect(comparativo).toMatchObject({
      referenciaDisponivel: false,
      motivo: "EXECUCAO_SEM_REFERENCIA_PREVISTA",
      frentes: []
    });
  });

  it("nao gera divisao invalida quando previsto e zero", () => {
    expect(compararValor(0, 10)).toEqual({
      previsto: 0,
      realizado: 10,
      desvioAbsoluto: 10,
      desvioPercentual: null
    });
  });

  it("registra referencia prevista como snapshot historico por execucao", async () => {
    const resultadoPrevisto = executarNucleoComMotorAtual(
      entradaBase({
        receita: 1000,
        recursos: [recurso({ id: "previsto-escavadeira", referenciaTecnicaId: "eq-escavadeira", nome: "Escavadeira", quantidade: 10, valorCusto: 20 })]
      })
    );
    const calls: Array<{ action: string; args: unknown }> = [];
    const db = {
      execucao: {
        findFirst: async () => null
      },
      execucaoReferenciaPrevista: {
        upsert: async (args: unknown) => {
          calls.push({ action: "upsert", args });
          return args;
        }
      }
    };

    await runTenant(() =>
      registrarReferenciaPrevistaExecucao(db as never, {
        execucaoId: EXECUCAO_ID,
        origem: OrigemReferenciaPrevistaExecucao.PROPOSTA,
        propostaOrigemId: "proposta-1",
        resultadoPrevisto
      })
    );

    const data = (calls[0].args as { create: Record<string, unknown> }).create;
    expect(data).toMatchObject({
      empresaId: EMPRESA_ID,
      execucaoId: EXECUCAO_ID,
      origem: OrigemReferenciaPrevistaExecucao.PROPOSTA,
      propostaOrigemId: "proposta-1"
    });
    expect(JSON.stringify(data.referenciaPrevistaJson)).toContain("eq-escavadeira");
  });

  it("busca comparativo a partir da referencia e do ultimo resultado persistidos", async () => {
    const comparativoFixture = criarComparativoFixture();
    const referenciaPrevistaJson = {
      snapshot: snapshot(
        executarNucleoComMotorAtual(
          entradaBase({
            receita: 1000,
            recursos: [recurso({ id: "previsto-escavadeira", referenciaTecnicaId: "eq-escavadeira", nome: "Escavadeira", quantidade: 10, valorCusto: 20 })]
          })
        )
      )
    };
    const db = {
      execucao: {
        findFirst: async () => ({
          id: EXECUCAO_ID,
          referenciaPrevista: {
            origem: OrigemReferenciaPrevistaExecucao.PROPOSTA,
            propostaOrigemId: "proposta-1",
            referenciaPrevistaJson
          },
          resultados: [
            snapshot(
              executarNucleoComMotorAtual(
                entradaBase({
                  receita: 900,
                  recursos: [recurso({ id: "realizado-escavadeira", referenciaTecnicaId: "eq-escavadeira", nome: "Escavadeira", quantidade: 12, valorCusto: 20 })]
                })
              )
            )
          ]
        })
      },
      execucaoReferenciaPrevista: {
        upsert: async () => ({})
      }
    };

    const comparativo = await runTenant(() => buscarComparativoExecucao(db as never, EXECUCAO_ID));

    expect(comparativo.frentes[0].recursos[0]).toMatchObject({
      status: "CORRESPONDENTE",
      referenciaTecnicaId: "eq-escavadeira"
    });
    expect(comparativo.frentes[0].custo.desvioAbsoluto).toBe(comparativoFixture.frentes[0].recursos[0].custo.desvioAbsoluto);
  });
});
