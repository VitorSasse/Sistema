import { describe, expect, it } from "vitest";
import { calcularMotorCustos } from "@/lib/orcamentos/cost-engine";
import {
  CONTEXTOS_DE_CALCULO,
  adaptarOrcamentoParaEntradaNucleo,
  adaptarExecucaoParaEntradaNucleo,
  calcularResultadoEconomicoNucleo,
  converterEntradaNucleoParaCostEngine,
  executarNucleoComMotorAtual,
  isContextoDeCalculo,
  type EntradaExecucao,
  type EntradaNucleoEngenharia
} from "@/lib/engineering-core";

function expectEquivalencia(input: EntradaNucleoEngenharia) {
  const legadoInput = converterEntradaNucleoParaCostEngine(input);
  const legado = calcularMotorCustos(legadoInput);
  const neutro = executarNucleoComMotorAtual(input);

  expect(neutro.contextoDeCalculo).toBe(input.contextoDeCalculo);
  expect(neutro.consolidado.custoOperacionalTotal).toBe(legado.custoDiretoTotal);
  expect(neutro.consolidado.quantidadeTotal).toBe(legado.quantidadeTotal);
  expect(neutro.consolidado.prazoEstimadoTotal).toBe(legado.prazoEstimadoTotalDias);
  expect(neutro.consolidado.custoOperacionalUnitarioMedio).toBe(legado.custoDiretoUnitarioMedio);
  expect(neutro.consolidado.unidadesHomogeneas).toBe(legado.unidadesHomogeneas);
  expect(neutro.unidades).toHaveLength(legado.frentes.length);
  expect(neutro.memoriaCalculo.map((item) => item.formula)).toEqual(
    legado.memoria.map((item) => item.formula)
  );
  expect(neutro.avisos.map((item) => item.mensagem)).toEqual(legado.avisos);

  for (const [index, frenteLegada] of legado.frentes.entries()) {
    const unidade = neutro.unidades[index];
    expect(unidade.id).toBe(frenteLegada.ref);
    expect(unidade.custoOperacionalTotal).toBe(frenteLegada.custoDireto);
    expect(unidade.custoOperacionalUnitario).toBe(frenteLegada.custoDiretoUnitario);
    expect(unidade.prazo).toBe(frenteLegada.prazoDias);
    expect(unidade.produtividade).toBe(frenteLegada.produtividadeDia);
    expect(unidade.produtividadeResultante).toBe(frenteLegada.produtividadeResultante);
    expect(unidade.recursos).toHaveLength(frenteLegada.recursos.length);

    for (const [resourceIndex, recursoLegado] of frenteLegada.recursos.entries()) {
      const recurso = unidade.recursos[resourceIndex];
      expect(recurso.custoTotal).toBe(recursoLegado.custoTotal);
      expect(recurso.quantidadeOperacional).toBe(recursoLegado.quantidadeOperacional);
      expect(recurso.unidadeQuantidadeOperacional).toBe(recursoLegado.unidadeQuantidadeOperacional);
      expect(recurso.viagensOperacionais).toBe(recursoLegado.viagensOperacionais);
      expect(recurso.quilometrosTotais).toBe(recursoLegado.quilometrosTotais);
      expect(recurso.custoPorViagem).toBe(recursoLegado.custoPorViagem);
      expect(recurso.memoriaCalculo.formula).toBe(recursoLegado.formula);
      expect(recurso.avisos.map((item) => item.mensagem)).toEqual(recursoLegado.observacoes);
    }
  }

  return { legado, neutro };
}

function roundMoneyTest(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function baseInput(overrides: Partial<EntradaNucleoEngenharia> = {}): EntradaNucleoEngenharia {
  return {
    contextoDeCalculo: "ORCAMENTO",
    analiseId: "orc-teste",
    nomeTecnico: "Teste tecnico",
    unidades: [
      {
        id: "frente-1",
        nome: "Frente 1",
        quantidade: 5560.66,
        unidade: "m3",
        produtividade: 504,
        prazoTeorico: 11.03,
        prazoAdotado: 10,
        origemPrazo: "AJUSTADO",
        modoCusto: "AUTO",
        custoManual: 0,
        recursos: []
      }
    ],
    ...overrides
  };
}

describe("contratos do Nucleo de Engenharia Operacional", () => {
  it("aceita os quatro contextos oficiais sem criar regras especificas", () => {
    expect(CONTEXTOS_DE_CALCULO).toEqual([
      "ORCAMENTO",
      "PLANEJAMENTO_EXECUTIVO",
      "EXECUCAO",
      "SIMULACAO"
    ]);
    expect(isContextoDeCalculo("ORCAMENTO")).toBe(true);
    expect(isContextoDeCalculo("EXECUCAO")).toBe(true);
    expect(isContextoDeCalculo("INVALIDO")).toBe(false);

    for (const contextoDeCalculo of CONTEXTOS_DE_CALCULO) {
      const { neutro } = expectEquivalencia(baseInput({ contextoDeCalculo, unidades: [] }));
      expect(neutro.consolidado.custoOperacionalTotal).toBe(0);
    }
  });

  it("mantem equivalencia para escavadeira por dia", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        unidades: [
          {
            id: "frente-1",
            nome: "Escavacao",
            quantidade: 5560.66,
            unidade: "m3",
            produtividade: 504,
            prazoTeorico: 11.03,
            prazoAdotado: 10,
            origemPrazo: "AJUSTADO",
            modoCusto: "AUTO",
            custoManual: 0,
            recursos: [
              {
                id: "esc-15t",
                unidadeOperacionalId: "frente-1",
                nomeTecnico: "Escavadeira 15 t",
                descricaoTecnica: "Escavadeira 15 t",
                quantidadeRecursos: 1,
                custoUnitario: 900,
                unidadeCusto: "dia",
                baseEconomica: "DIA",
                valorCusto: 900
              }
            ]
          }
        ]
      })
    );

    expect(neutro.unidades[0]?.recursos[0]?.custoTotal).toBe(9000);
  });

  it("mantem equivalencia para recurso por hora", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        unidades: [
          {
            id: "frente-hora",
            nome: "Apoio horario",
            quantidade: 40,
            unidade: "h",
            produtividade: 8,
            prazoTeorico: 5,
            modoCusto: "AUTO",
            custoManual: 0,
            recursos: [
              {
                id: "operador",
                unidadeOperacionalId: "frente-hora",
                nomeTecnico: "Operador",
                descricaoTecnica: "Operador",
                quantidadeRecursos: 1,
                custoUnitario: 120,
                unidadeCusto: "h",
                baseEconomica: "HORA",
                valorCusto: 120,
                horasTotais: 40
              }
            ]
          }
        ]
      })
    );

    expect(neutro.unidades[0]?.recursos[0]?.quantidadeOperacional).toBe(40);
    expect(neutro.unidades[0]?.recursos[0]?.unidadeQuantidadeOperacional).toBe("h");
    expect(neutro.unidades[0]?.recursos[0]?.custoTotal).toBe(4800);
  });

  it("mantem equivalencia para caminhao por km", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        unidades: [
          {
            id: "frente-transporte",
            nome: "Transporte",
            quantidade: 5560.66,
            unidade: "m3",
            produtividade: 504,
            prazoTeorico: 11.03,
            prazoAdotado: 10,
            origemPrazo: "AJUSTADO",
            modoCusto: "AUTO",
            custoManual: 0,
            recursos: [
              {
                id: "caminhao-14m3",
                unidadeOperacionalId: "frente-transporte",
                nomeTecnico: "Caminhao 14 m3",
                descricaoTecnica: "Caminhao 14 m3",
                quantidadeRecursos: 3,
                quantidadeOperacional: 5560.66,
                origemQuantidadeOperacional: "FRENTE",
                unidadeQuantidadeOperacional: "m3",
                custoUnitario: 8,
                unidadeCusto: "km",
                baseEconomica: "KM",
                valorCusto: 8,
                capacidadePorViagem: 14,
                unidadeCapacidade: "m3",
                distanciaViagemKm: 12
              }
            ]
          }
        ]
      })
    );

    const recurso = neutro.unidades[0]?.recursos[0];
    expect(recurso?.viagensOperacionais).toBe(398);
    expect(recurso?.custoPorViagem).toBe(96);
    expect(recurso?.custoTotal).toBe(38208);
  });

  it("mantem equivalencia para frente em m2 com caminhao em m3", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        unidades: [
          {
            id: "frente-mista",
            nome: "Base compactada",
            quantidade: 650,
            unidade: "m2",
            produtividade: 100,
            prazoTeorico: 6.5,
            modoCusto: "AUTO",
            custoManual: 0,
            recursos: [
              {
                id: "caminhao-volume",
                unidadeOperacionalId: "frente-mista",
                nomeTecnico: "Caminhao",
                descricaoTecnica: "Caminhao",
                quantidadeRecursos: 2,
                quantidadeOperacional: 936,
                origemQuantidadeOperacional: "PERSONALIZADA",
                unidadeQuantidadeOperacional: "m3",
                custoUnitario: 8,
                unidadeCusto: "km",
                baseEconomica: "KM",
                valorCusto: 8,
                capacidadePorViagem: 14,
                unidadeCapacidade: "m3",
                distanciaViagemKm: 12
              }
            ]
          }
        ]
      })
    );

    const recurso = neutro.unidades[0]?.recursos[0];
    expect(recurso?.quantidadeOperacional).toBe(936);
    expect(recurso?.unidadeQuantidadeOperacional).toBe("m3");
    expect(recurso?.viagensOperacionais).toBe(67);
  });

  it("preserva recurso personalizado", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        unidades: [
          {
            id: "frente-personalizada",
            nome: "Recurso personalizado",
            quantidade: 650,
            unidade: "m3",
            produtividade: 100,
            prazoTeorico: 6.5,
            modoCusto: "AUTO",
            custoManual: 0,
            recursos: [
              {
                id: "viagens-personalizadas",
                unidadeOperacionalId: "frente-personalizada",
                nomeTecnico: "Transporte",
                descricaoTecnica: "Transporte",
                quantidadeRecursos: 1,
                quantidadeOperacional: 10,
                origemQuantidadeOperacional: "PERSONALIZADA",
                unidadeQuantidadeOperacional: "viagens",
                custoUnitario: 500,
                unidadeCusto: "viagem",
                baseEconomica: "VIAGEM",
                valorCusto: 500,
                viagensTotais: 10
              }
            ]
          }
        ]
      })
    );

    const recurso = neutro.unidades[0]?.recursos[0];
    expect(recurso?.origemQuantidadeOperacional).toBe("PERSONALIZADA");
    expect(recurso?.quantidadeOperacional).toBe(10);
    expect(recurso?.unidadeQuantidadeOperacional).toBe("viagens");
  });

  it("preserva recurso herdado", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        unidades: [
          {
            id: "frente-herdada",
            nome: "Recurso herdado",
            quantidade: 22,
            unidade: "dia",
            produtividade: 1,
            prazoTeorico: 22,
            modoCusto: "AUTO",
            custoManual: 0,
            recursos: [
              {
                id: "escavadeira-herdada",
                unidadeOperacionalId: "frente-herdada",
                nomeTecnico: "Escavadeira herdada",
                descricaoTecnica: "Escavadeira herdada",
                quantidadeRecursos: 1,
                origemQuantidadeOperacional: "FRENTE",
                custoUnitario: 900,
                unidadeCusto: "dia",
                baseEconomica: "DIA",
                valorCusto: 900,
                origem: "HERDADO"
              }
            ]
          }
        ]
      })
    );

    const recurso = neutro.unidades[0]?.recursos[0];
    expect(recurso?.origemQuantidadeOperacional).toBe("FRENTE");
    expect(recurso?.unidadeQuantidadeOperacional).toBe("dia");
  });

  it("mantem custo manual sem recursos", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        unidades: [
          {
            id: "frente-manual",
            nome: "Frente manual",
            quantidade: 100,
            unidade: "m3",
            produtividade: 20,
            prazoTeorico: 5,
            modoCusto: "MANUAL",
            custoManual: 12345.67,
            recursos: []
          }
        ]
      })
    );

    expect(neutro.unidades[0]?.origemCusto).toBe("MANUAL");
    expect(neutro.consolidado.custoOperacionalTotal).toBe(12345.67);
  });

  it("adapta orcamento misto enviando somente dados tecnicos ao nucleo", () => {
    const entrada = adaptarOrcamentoParaEntradaNucleo({
      id: "orc-misto",
      codigo: "ORC-001",
      titulo: "Orcamento misto",
      frentes: [
        {
          localId: "frente-comercial",
          ordem: 1,
          natureza: "COMERCIAL",
          nome: "Tabela comercial",
          quantidadePrevista: 1,
          unidadeProducao: "un"
        },
        {
          localId: "frente-operacional",
          ordem: 2,
          natureza: "OPERACIONAL",
          nome: "Escavacao operacional",
          quantidadePrevista: 100,
          unidadeProducao: "m3",
          produtividadeDia: 20,
          prazoTeoricoDias: 5,
          modoCusto: "AUTO"
        }
      ],
      itens: [
        {
          localId: "item-referencial",
          frenteTempId: "frente-comercial",
          ordem: 1,
          tipoItem: "COMERCIAL",
          descricao: "Preco unitario referencial",
          quantidade: 1,
          custoUnitario: 0,
          unidade: "un"
        },
        {
          localId: "recurso-operacional",
          frenteTempId: "frente-operacional",
          ordem: 1,
          tipoItem: "RECURSO",
          descricao: "Escavadeira",
          recursoNome: "Escavadeira",
          quantidade: 1,
          custoUnitario: 1000,
          unidade: "dia",
          unidadeEconomicaCusto: "DIA",
          valorCusto: 1000
        }
      ]
    });

    expect(entrada.unidades).toHaveLength(1);
    expect(entrada.unidades[0]?.id).toBe("frente-operacional");
    expect(entrada.unidades[0]?.recursos).toHaveLength(1);
    expect(JSON.stringify(entrada)).not.toContain("Preco unitario referencial");

    expectEquivalencia(entrada);
  });

  it("mantem item referencial fora do contrato neutro", () => {
    const entrada = adaptarOrcamentoParaEntradaNucleo({
      codigo: "ORC-REF",
      frentes: [
        {
          localId: "frente-referencial",
          ordem: 1,
          natureza: "COMERCIAL",
          nome: "Precos referenciais"
        }
      ],
      itens: [
        {
          localId: "referencial",
          frenteTempId: "frente-referencial",
          tipoItem: "COMERCIAL",
          descricao: "Caminhao por carga",
          quantidade: 1,
          unidade: "carga",
          custoUnitario: 0
        }
      ]
    });

    expect(entrada.unidades).toEqual([]);
    expect(JSON.stringify(entrada)).not.toContain("formaApresentacaoComercial");
    expectEquivalencia(entrada);
  });

  it("preserva o baseline orcado L.Flex Frente 1 para aterro compactado", () => {
    const { neutro } = expectEquivalencia(
      baseInput({
        analiseId: "l-flex-frente-1",
        nomeTecnico: "L.Flex - Frente 1 - Aterro compactado",
        unidades: [
          {
            id: "l-flex-frente-1",
            nome: "Aterro compactado",
            quantidade: 650,
            unidade: "m3",
            produtividade: 130,
            prazoTeorico: 5,
            modoCusto: "AUTO",
            custoManual: 0,
            recursos: [
              {
                id: "rolo-compactador",
                unidadeOperacionalId: "l-flex-frente-1",
                nomeTecnico: "Rolo compactador",
                descricaoTecnica: "Rolo compactador",
                quantidadeRecursos: 1,
                custoUnitario: 850,
                unidadeCusto: "dia",
                baseEconomica: "DIA",
                valorCusto: 850
              },
              {
                id: "caminhoes-aterro",
                unidadeOperacionalId: "l-flex-frente-1",
                nomeTecnico: "Caminhoes",
                descricaoTecnica: "Caminhoes",
                quantidadeRecursos: 3,
                quantidadeOperacional: 936,
                origemQuantidadeOperacional: "PERSONALIZADA",
                unidadeQuantidadeOperacional: "m3",
                custoUnitario: 8,
                unidadeCusto: "km",
                baseEconomica: "KM",
                valorCusto: 8,
                capacidadePorViagem: 14,
                unidadeCapacidade: "m3",
                distanciaViagemKm: 12
              }
            ]
          }
        ]
      })
    );

    expect(neutro.unidades[0]?.recursos).toHaveLength(2);
    expect(neutro.unidades[0]?.recursos[1]?.viagensOperacionais).toBe(67);
  });
});

function entradaExecucaoPiloto(overrides: Partial<EntradaExecucao> = {}): EntradaExecucao {
  return {
    execucaoId: "exec-aterro-compactado",
    nomeTecnico: "Execucao - Aterro Compactado",
    unidades: [
      {
        id: "frente-executada-aterro",
        nome: "Aterro Compactado",
        quantidadeExecutada: 650,
        unidade: "m3",
        receitaRealizada: 45960.06,
        recursos: [
          {
            id: "truck-14m3",
            recursoId: "rec-truck-14m3",
            nome: "Truck 14 m3",
            quantidadeRealizada: 93,
            unidadeRealizada: "cargas",
            quantidadeRecursos: 1,
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
            id: "carreta-22m3",
            recursoId: "rec-carreta-22m3",
            nome: "Carreta 22 m3",
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
            id: "escavadeira-15t",
            recursoId: "rec-esc-15t",
            nome: "Escavadeira 15 t",
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
            id: "mini-v80",
            recursoId: "rec-mini-v80",
            nome: "Mini Escavadeira V80",
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
            id: "rolo-pe-carneiro",
            recursoId: "rec-rolo",
            nome: "Rolo Pe de Carneiro",
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
            id: "trator-esteira",
            recursoId: "rec-trator",
            nome: "Trator de Esteira",
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
            id: "encarregado",
            nome: "Encarregado",
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
    ],
    ...overrides
  };
}

describe("primeiro consumo do nucleo por Execucao e Resultado", () => {
  it("adapta execucao em memoria usando ContextoDeCalculo.EXECUCAO", () => {
    const entrada = adaptarExecucaoParaEntradaNucleo(entradaExecucaoPiloto());

    expect(entrada.contextoDeCalculo).toBe("EXECUCAO");
    expect(entrada.analiseId).toBe("exec-aterro-compactado");
    expect(entrada.unidades).toHaveLength(1);
    expect(entrada.unidades[0]?.receita).toBe(45960.06);
  });

  it("converte fatos realizados para entrada neutra sem custo total informado pelo usuario", () => {
    const entrada = adaptarExecucaoParaEntradaNucleo(entradaExecucaoPiloto());
    const recursos = entrada.unidades[0]?.recursos ?? [];

    expect(recursos[0]).toMatchObject({
      id: "truck-14m3",
      quantidadeOperacional: 93,
      unidadeQuantidadeOperacional: "cargas",
      baseEconomica: "CARGA",
      cargasTotais: 93,
      valorCusto: 120
    });
    expect(recursos[3]).toMatchObject({
      id: "mini-v80",
      quantidadeOperacional: 1,
      unidadeQuantidadeOperacional: "h",
      baseEconomica: "HORA",
      horasTotais: 1,
      valorCusto: 250
    });
    expect(JSON.stringify(entrada)).not.toContain("custoTotalInformado");
  });

  it("retorna custo realizado pelo nucleo e calcula resultado economico neutro", () => {
    const entrada = adaptarExecucaoParaEntradaNucleo(entradaExecucaoPiloto());
    const resultado = executarNucleoComMotorAtual(entrada);
    const custoEsperado = 18240;

    expect(resultado.consolidado.custoOperacionalTotal).toBe(custoEsperado);
    expect(resultado.consolidado.economia?.receita).toBe(45960.06);
    expect(resultado.consolidado.economia?.resultado).toBe(27720.06);
    expect(resultado.consolidado.economia?.margemPercentual).toBe(60.31);
    expect(resultado.unidades[0]?.economia?.receita).toBe(45960.06);
    expect(resultado.unidades[0]?.economia?.resultado).toBe(27720.06);
    expect(resultado.unidades[0]?.economia?.margemPercentual).toBe(60.31);
    expect(resultado.unidades[0]?.recursos.map((recurso) => recurso.custoTotal)).toEqual([
      11160,
      1980,
      1800,
      250,
      1700,
      1050,
      300
    ]);
  });

  it("calcula recurso realizado por km usando parametros economicos do snapshot", () => {
    const entrada = adaptarExecucaoParaEntradaNucleo({
      execucaoId: "exec-transporte-km",
      nomeTecnico: "Execucao transporte por km",
      unidades: [
        {
          id: "frente-transporte",
          nome: "Transporte executado",
          quantidadeExecutada: 12,
          unidade: "viagem",
          receitaRealizada: 5000,
          recursos: [
            {
              id: "truck-km",
              recursoId: "eq-truck",
              nome: "Truck por km",
              quantidadeRealizada: 12,
              unidadeRealizada: "viagem",
              quantidadeRecursos: 2,
              snapshotTecnicoEconomico: {
                categoria: "EQUIPAMENTO",
                baseEconomica: "KM",
                valorCusto: 8,
                unidadeCusto: "R$/km",
                quantidadeOperacional: 12,
                unidadeQuantidadeOperacional: "viagem",
                distanciaViagemKm: 18,
                metadados: {
                  origemCusto: "PERSONALIZADO_EXECUCAO"
                }
              }
            }
          ]
        }
      ]
    });
    const resultado = executarNucleoComMotorAtual(entrada);
    const recurso = resultado.unidades[0]?.recursos[0];

    expect(recurso?.baseEconomica).toBe("KM");
    expect(recurso?.viagensTotais).toBe(12);
    expect(recurso?.distanciaViagemKm).toBe(18);
    expect(recurso?.custoTotal).toBe(1728);
  });

  it("calcula diaria proporcional quando execucao aponta horas e base economica e DIA", () => {
    const entrada = adaptarExecucaoParaEntradaNucleo({
      execucaoId: "exec-dia-proporcional",
      nomeTecnico: "Execucao diaria proporcional",
      unidades: [
          {
            id: "frente-horas",
            nome: "Horas executadas",
            quantidadeExecutada: 4.47,
            unidade: "h",
            receitaRealizada: 1000,
            recursos: [
            {
              id: "esc-150",
              recursoId: "eq-esc-150",
              nome: "ESC 150 I - HYUNDAI",
              quantidadeRealizada: 4.47,
              unidadeRealizada: "h",
              quantidadeRecursos: 1,
              snapshotTecnicoEconomico: {
                categoria: "EQUIPAMENTO",
                baseEconomica: "DIA",
                valorCusto: 950,
                unidadeCusto: "R$/dia",
                quantidadeOperacional: 4.47,
                unidadeQuantidadeOperacional: "h"
              }
            }
          ]
        }
      ]
    });
    const resultado = executarNucleoComMotorAtual(entrada);
    const recurso = resultado.unidades[0]?.recursos[0];

    expect(recurso?.baseEconomica).toBe("DIA");
    expect(recurso?.horasDia).toBe(8);
    expect(recurso?.custoTotal).toBe(530.81);
  });

  it("mantem equivalencia entre Orcamento e Execucao para recurso em horas com base economica diaria", () => {
    const entradaOrcamento = adaptarOrcamentoParaEntradaNucleo({
      id: "orc-horas-dia",
      titulo: "Orcamento horas por diaria",
      frentes: [
        {
          tempId: "frente-horas",
          natureza: "OPERACIONAL",
          nome: "Horas executadas",
          unidadeProducao: "h",
          quantidadePrevista: 4.47,
          modoCusto: "AUTO"
        }
      ],
      itens: [
        {
          tempId: "orc-recurso-esc-150",
          frenteTempId: "frente-horas",
          tipoItem: "RECURSO",
          categoriaRecurso: "EQUIPAMENTO",
          descricao: "ESC 150 I - HYUNDAI",
          recursoNome: "ESC 150 I - HYUNDAI",
          recursoReferenciaId: "eq-esc-150",
          quantidade: 1,
          quantidadeOperacional: 4.47,
          origemQuantidadeOperacional: "PERSONALIZADA",
          unidadeQuantidadeOperacional: "h",
          unidade: "R$/dia",
          tipoCalculoRecurso: "AUTOMATICO",
          unidadeEconomicaCusto: "DIA",
          valorCusto: 950
        }
      ]
    });
    const entradaExecucao = adaptarExecucaoParaEntradaNucleo({
      execucaoId: "exec-horas-dia",
      nomeTecnico: "Execucao horas por diaria",
      unidades: [
        {
          id: "frente-horas",
          nome: "Horas executadas",
          quantidadeExecutada: 4.47,
          unidade: "h",
          receitaRealizada: 0,
          recursos: [
            {
              id: "exec-recurso-esc-150",
              recursoId: "eq-esc-150",
              nome: "ESC 150 I - HYUNDAI",
              quantidadeRealizada: 4.47,
              unidadeRealizada: "h",
              quantidadeRecursos: 1,
              snapshotTecnicoEconomico: {
                categoria: "EQUIPAMENTO",
                baseEconomica: "DIA",
                valorCusto: 950,
                unidadeCusto: "R$/dia",
                quantidadeOperacional: 4.47,
                unidadeQuantidadeOperacional: "h"
              }
            }
          ]
        }
      ]
    });

    const resultadoOrcamento = executarNucleoComMotorAtual(entradaOrcamento);
    const resultadoExecucao = executarNucleoComMotorAtual(entradaExecucao);

    expect(resultadoOrcamento.unidades[0]?.recursos[0]?.horasDia).toBe(8);
    expect(resultadoExecucao.unidades[0]?.recursos[0]?.horasDia).toBe(8);
    expect(resultadoOrcamento.consolidado.custoOperacionalTotal).toBe(530.81);
    expect(resultadoExecucao.consolidado.custoOperacionalTotal).toBe(530.81);
    expect(resultadoExecucao.consolidado.custoOperacionalTotal).toBe(
      resultadoOrcamento.consolidado.custoOperacionalTotal
    );
  });

  it("usa jornada diaria personalizada em Orcamento e Execucao sem criar regra propria", () => {
    const entradaOrcamento = adaptarOrcamentoParaEntradaNucleo({
      id: "orc-horas-dia-personalizado",
      titulo: "Orcamento horas por diaria personalizada",
      frentes: [
        {
          tempId: "frente-horas",
          natureza: "OPERACIONAL",
          nome: "Horas executadas",
          unidadeProducao: "h",
          quantidadePrevista: 4.47,
          modoCusto: "AUTO"
        }
      ],
      itens: [
        {
          tempId: "orc-recurso-esc-150",
          frenteTempId: "frente-horas",
          tipoItem: "RECURSO",
          categoriaRecurso: "EQUIPAMENTO",
          descricao: "ESC 150 I - HYUNDAI",
          recursoNome: "ESC 150 I - HYUNDAI",
          recursoReferenciaId: "eq-esc-150",
          quantidade: 1,
          quantidadeOperacional: 4.47,
          origemQuantidadeOperacional: "PERSONALIZADA",
          unidadeQuantidadeOperacional: "h",
          unidade: "R$/dia",
          tipoCalculoRecurso: "AUTOMATICO",
          unidadeEconomicaCusto: "DIA",
          valorCusto: 950,
          horasDia: 10
        }
      ]
    });
    const entradaExecucao = adaptarExecucaoParaEntradaNucleo({
      execucaoId: "exec-horas-dia-personalizado",
      nomeTecnico: "Execucao horas por diaria personalizada",
      unidades: [
        {
          id: "frente-horas",
          nome: "Horas executadas",
          quantidadeExecutada: 4.47,
          unidade: "h",
          receitaRealizada: 0,
          recursos: [
            {
              id: "exec-recurso-esc-150",
              recursoId: "eq-esc-150",
              nome: "ESC 150 I - HYUNDAI",
              quantidadeRealizada: 4.47,
              unidadeRealizada: "h",
              quantidadeRecursos: 1,
              snapshotTecnicoEconomico: {
                categoria: "EQUIPAMENTO",
                baseEconomica: "DIA",
                valorCusto: 950,
                unidadeCusto: "R$/dia",
                quantidadeOperacional: 4.47,
                unidadeQuantidadeOperacional: "h",
                horasDia: 10,
                metadados: {
                  jornadaPadraoOriginal: 8,
                  jornadaUtilizada: 10,
                  origemJornada: "PERSONALIZADA_EXECUCAO"
                }
              }
            }
          ]
        }
      ]
    });

    const resultadoOrcamento = executarNucleoComMotorAtual(entradaOrcamento);
    const resultadoExecucao = executarNucleoComMotorAtual(entradaExecucao);

    expect(resultadoOrcamento.unidades[0]?.recursos[0]?.horasDia).toBe(10);
    expect(resultadoExecucao.unidades[0]?.recursos[0]?.horasDia).toBe(10);
    expect(resultadoOrcamento.consolidado.custoOperacionalTotal).toBe(424.65);
    expect(resultadoExecucao.consolidado.custoOperacionalTotal).toBe(424.65);
    expect(resultadoExecucao.consolidado.custoOperacionalTotal).toBe(
      resultadoOrcamento.consolidado.custoOperacionalTotal
    );
  });

  it.each([
    { quantidade: 2.45, custo: 950, jornada: 8 },
    { quantidade: 4.47, custo: 950, jornada: 8 },
    { quantidade: 4.47, custo: 1200, jornada: 8 },
    { quantidade: 4.47, custo: 950, jornada: 10 }
  ])(
    "calcula custo por diaria dinamicamente para $quantidade h, custo $custo e jornada $jornada h/dia",
    ({ quantidade, custo, jornada }) => {
      const entrada = adaptarExecucaoParaEntradaNucleo({
        execucaoId: `exec-dinamico-${quantidade}-${custo}-${jornada}`,
        nomeTecnico: "Execucao dinamica horas por diaria",
        unidades: [
          {
            id: "frente-dinamica",
            nome: "Frente dinamica",
            quantidadeExecutada: quantidade,
            unidade: "h",
            receitaRealizada: 0,
            recursos: [
              {
                id: `recurso-${quantidade}-${custo}-${jornada}`,
                recursoId: "eq-esc-150",
                nome: "ESC 150 I - HYUNDAI",
                quantidadeRealizada: quantidade,
                unidadeRealizada: "h",
                quantidadeRecursos: 1,
                snapshotTecnicoEconomico: {
                  categoria: "EQUIPAMENTO",
                  baseEconomica: "DIA",
                  valorCusto: custo,
                  unidadeCusto: "R$/dia",
                  quantidadeOperacional: quantidade,
                  unidadeQuantidadeOperacional: "h",
                  horasDia: jornada
                }
              }
            ]
          }
        ]
      });
      const resultado = executarNucleoComMotorAtual(entrada);
      const esperado = roundMoneyTest((quantidade / jornada) * custo);

      expect(resultado.unidades[0]?.recursos[0]?.custoTotal).toBe(esperado);
      expect(resultado.consolidado.custoOperacionalTotal).toBe(esperado);
    }
  );

  it("mantem equivalencia entre Orcamento e Execucao apenas para entradas tecnicas iguais", () => {
    const recursoBase = {
      categoria: "EQUIPAMENTO",
      baseEconomica: "DIA" as const,
      valorCusto: 950,
      unidadeCusto: "R$/dia",
      quantidadeOperacional: 4.47,
      unidadeQuantidadeOperacional: "h",
      horasDia: 8
    };
    const entradaOrcamento = adaptarOrcamentoParaEntradaNucleo({
      id: "orc-equivalencia-dinamica",
      titulo: "Orcamento equivalencia dinamica",
      frentes: [
        {
          tempId: "frente-equivalencia",
          natureza: "OPERACIONAL",
          nome: "Horas executadas",
          unidadeProducao: "h",
          quantidadePrevista: 4.47,
          modoCusto: "AUTO"
        }
      ],
      itens: [
        {
          tempId: "orc-recurso-equivalencia",
          frenteTempId: "frente-equivalencia",
          tipoItem: "RECURSO",
          categoriaRecurso: "EQUIPAMENTO",
          descricao: "ESC 150 I - HYUNDAI",
          recursoNome: "ESC 150 I - HYUNDAI",
          recursoReferenciaId: "eq-esc-150",
          quantidade: 1,
          quantidadeOperacional: 4.47,
          origemQuantidadeOperacional: "PERSONALIZADA",
          unidadeQuantidadeOperacional: "h",
          unidade: "R$/dia",
          tipoCalculoRecurso: "AUTOMATICO",
          unidadeEconomicaCusto: "DIA",
          valorCusto: 950,
          horasDia: 8
        }
      ]
    });
    const entradaExecucaoIgual = adaptarExecucaoParaEntradaNucleo({
      execucaoId: "exec-equivalencia-dinamica",
      nomeTecnico: "Execucao equivalencia dinamica",
      unidades: [
        {
          id: "frente-equivalencia",
          nome: "Horas executadas",
          quantidadeExecutada: 4.47,
          unidade: "h",
          receitaRealizada: 0,
          recursos: [
            {
              id: "exec-recurso-equivalencia",
              recursoId: "eq-esc-150",
              nome: "ESC 150 I - HYUNDAI",
              quantidadeRealizada: 4.47,
              unidadeRealizada: "h",
              quantidadeRecursos: 1,
              snapshotTecnicoEconomico: recursoBase
            }
          ]
        }
      ]
    });
    const entradaExecucaoDiferente = adaptarExecucaoParaEntradaNucleo({
      execucaoId: "exec-equivalencia-dinamica-diferente",
      nomeTecnico: "Execucao equivalencia dinamica diferente",
      unidades: [
        {
          id: "frente-equivalencia",
          nome: "Horas executadas",
          quantidadeExecutada: 2.45,
          unidade: "h",
          receitaRealizada: 0,
          recursos: [
            {
              id: "exec-recurso-equivalencia-diferente",
              recursoId: "eq-esc-150",
              nome: "ESC 150 I - HYUNDAI",
              quantidadeRealizada: 2.45,
              unidadeRealizada: "h",
              quantidadeRecursos: 1,
              snapshotTecnicoEconomico: {
                ...recursoBase,
                quantidadeOperacional: 2.45
              }
            }
          ]
        }
      ]
    });

    const resultadoOrcamento = executarNucleoComMotorAtual(entradaOrcamento);
    const resultadoExecucaoIgual = executarNucleoComMotorAtual(entradaExecucaoIgual);
    const resultadoExecucaoDiferente = executarNucleoComMotorAtual(entradaExecucaoDiferente);

    expect(resultadoExecucaoIgual.consolidado.custoOperacionalTotal).toBe(resultadoOrcamento.consolidado.custoOperacionalTotal);
    expect(resultadoExecucaoDiferente.consolidado.custoOperacionalTotal).not.toBe(resultadoExecucaoIgual.consolidado.custoOperacionalTotal);
  });

  it("nao deixa jornada diaria alterar recurso com base economica por hora", () => {
    const entradaBase = {
      execucaoId: "exec-hora",
      nomeTecnico: "Execucao por hora",
      unidades: [
        {
          id: "frente-horas",
          nome: "Horas executadas",
          quantidadeExecutada: 4.47,
          unidade: "h",
          receitaRealizada: 0,
          recursos: [
            {
              id: "exec-recurso-hora",
              recursoId: "eq-hora",
              nome: "Recurso por hora",
              quantidadeRealizada: 4.47,
              unidadeRealizada: "h",
              quantidadeRecursos: 1,
              snapshotTecnicoEconomico: {
                categoria: "EQUIPAMENTO",
                baseEconomica: "HORA" as const,
                valorCusto: 100,
                unidadeCusto: "R$/h",
                quantidadeOperacional: 4.47,
                unidadeQuantidadeOperacional: "h"
              }
            }
          ]
        }
      ]
    };
    const resultadoPadrao = executarNucleoComMotorAtual(adaptarExecucaoParaEntradaNucleo({
      ...entradaBase,
      unidades: entradaBase.unidades.map((unidade) => ({
        ...unidade,
        recursos: unidade.recursos.map((recurso) => ({
          ...recurso,
          snapshotTecnicoEconomico: {
            ...recurso.snapshotTecnicoEconomico,
            horasDia: 8
          }
        }))
      }))
    }));
    const resultadoPersonalizado = executarNucleoComMotorAtual(adaptarExecucaoParaEntradaNucleo({
      ...entradaBase,
      unidades: entradaBase.unidades.map((unidade) => ({
        ...unidade,
        recursos: unidade.recursos.map((recurso) => ({
          ...recurso,
          snapshotTecnicoEconomico: {
            ...recurso.snapshotTecnicoEconomico,
            horasDia: 10
          }
        }))
      }))
    }));

    expect(resultadoPadrao.consolidado.custoOperacionalTotal).toBe(447);
    expect(resultadoPersonalizado.consolidado.custoOperacionalTotal).toBe(447);
    expect(resultadoPersonalizado.consolidado.custoOperacionalTotal).toBe(resultadoPadrao.consolidado.custoOperacionalTotal);
  });

  it("nao calcula margem percentual quando receita e zero", () => {
    const entrada = adaptarExecucaoParaEntradaNucleo(
      entradaExecucaoPiloto({
        unidades: [
          {
            ...entradaExecucaoPiloto().unidades[0],
            receitaRealizada: 0
          }
        ]
      })
    );
    const resultado = executarNucleoComMotorAtual(entrada);

    expect(resultado.consolidado.economia?.receita).toBe(0);
    expect(resultado.consolidado.economia?.resultado).toBe(-18240);
    expect(resultado.consolidado.economia?.margemPercentual).toBeNull();
    expect(resultado.unidades[0]?.economia?.margemPercentual).toBeNull();
  });

  it("soma resultado total a partir das unidades executadas", () => {
    const base = entradaExecucaoPiloto().unidades[0];
    const entrada = adaptarExecucaoParaEntradaNucleo({
      execucaoId: "exec-duas-frentes",
      nomeTecnico: "Execucao com duas frentes",
      unidades: [
        base,
        {
          id: "apoio-final",
          nome: "Apoio final",
          quantidadeExecutada: 8,
          unidade: "h",
          receitaRealizada: 2000,
          recursos: [
            {
              id: "apoio-hora",
              nome: "Apoio horario",
              quantidadeRealizada: 4,
              unidadeRealizada: "h",
              quantidadeRecursos: 1,
              snapshotTecnicoEconomico: {
                categoria: "EQUIPE",
                baseEconomica: "HORA",
                valorCusto: 100,
                unidadeCusto: "R$/h"
              }
            }
          ]
        }
      ]
    });
    const resultado = executarNucleoComMotorAtual(entrada);

    expect(resultado.unidades).toHaveLength(2);
    expect(resultado.consolidado.economia?.receita).toBe(47960.06);
    expect(resultado.consolidado.custoOperacionalTotal).toBe(18640);
    expect(resultado.consolidado.economia?.resultado).toBe(29320.06);
  });

  it("centraliza a formula economica neutra no engineering-core", () => {
    expect(calcularResultadoEconomicoNucleo({ receita: 1000, custo: 750 })).toEqual({
      receita: 1000,
      custo: 750,
      resultado: 250,
      margemPercentual: 25
    });
  });
});
