import { describe, expect, it } from "vitest";
import {
  calcularPlanejamentoFrente,
  calcularMotorCustos,
  JORNADA_PADRAO_HORAS_DIA,
  resolveFrontCost
} from "@/lib/orcamentos/cost-engine";

describe("Motor de custos do orcamento operacional", () => {
  it("usa o custo manual quando a frente nao possui recursos validos", () => {
    const result = resolveFrontCost(
      { ref: "frente-manual", nome: "Frente manual", modoCusto: "MANUAL", custoManual: 12500 },
      []
    );

    expect(result.origemCusto).toBe("MANUAL");
    expect(result.custoFrente).toBe(12500);
    expect(result.recursos).toHaveLength(0);
  });

  it("prioriza recursos validos mesmo quando existe custo manual", () => {
    const result = resolveFrontCost(
      { ref: "frente-automatica", modoCusto: "MANUAL", custoManual: 50000 },
      [
        {
          frenteRef: "frente-automatica",
          descricao: "Equipamento",
          quantidade: 2,
          custoOperacional: 1500,
          unidadeCusto: "UN"
        }
      ]
    );

    expect(result.origemCusto).toBe("RECURSOS");
    expect(result.custoFrente).toBe(3000);
    expect(result.custoManual).toBe(50000);
    expect(result.custoCalculadoRecursos).toBe(3000);
    expect(result.recursos).toHaveLength(1);
  });

  it("nao mantem custo automatico antigo quando todos os recursos sao removidos", () => {
    const frente = { ref: "frente-1", modoCusto: "AUTO" as const, custoManual: 0 };
    const comRecurso = resolveFrontCost(frente, [
      {
        frenteRef: "frente-1",
        descricao: "Recurso temporario",
        quantidade: 1,
        custoOperacional: 2500,
        unidadeCusto: "UN"
      }
    ]);
    const semRecursos = resolveFrontCost(frente, []);

    expect(comRecurso.custoFrente).toBe(2500);
    expect(comRecurso.origemCusto).toBe("RECURSOS");
    expect(semRecursos.custoFrente).toBe(0);
    expect(semRecursos.origemCusto).toBe("MANUAL");

    const informadoManualmente = resolveFrontCost(
      { ...frente, modoCusto: "MANUAL", custoManual: 7000 },
      []
    );
    expect(informadoManualmente.custoFrente).toBe(7000);
    expect(informadoManualmente.origemCusto).toBe("MANUAL");
  });

  it("recalcula recursos sem somar o custo manual armazenado", () => {
    const frente = { ref: "frente-1", modoCusto: "MANUAL" as const, custoManual: 7000 };
    const inicial = resolveFrontCost(frente, [
      { frenteRef: "frente-1", quantidade: 2, custoOperacional: 100, unidadeCusto: "UN" }
    ]);
    const atualizado = resolveFrontCost(frente, [
      { frenteRef: "frente-1", quantidade: 3, custoOperacional: 120, unidadeCusto: "UN" }
    ]);

    expect(inicial.custoFrente).toBe(200);
    expect(atualizado.custoFrente).toBe(360);
    expect(inicial.custoCalculadoRecursos).toBe(200);
    expect(atualizado.custoCalculadoRecursos).toBe(360);
  });

  it("mantem a soma atual dos recursos independente do modo legado", () => {
    const recursos = [
      { frenteRef: "frente-1", quantidade: 3, custoOperacional: 120, unidadeCusto: "UN" }
    ];
    const manual = resolveFrontCost(
      { ref: "frente-1", modoCusto: "MANUAL", custoManual: 7000 },
      recursos
    );
    const automatico = resolveFrontCost(
      { ref: "frente-1", modoCusto: "AUTO", custoManual: 0 },
      recursos
    );

    expect(manual.custoFrente).toBe(360);
    expect(manual.origemCusto).toBe("RECURSOS");
    expect(automatico.custoFrente).toBe(360);
    expect(automatico.origemCusto).toBe("RECURSOS");
  });

  it("recalcula imediatamente quando quantidade ou custo do recurso muda", () => {
    const frente = { ref: "frente-1", modoCusto: "AUTO" as const, custoManual: 0 };
    const inicial = resolveFrontCost(frente, [
      { frenteRef: "frente-1", quantidade: 2, custoOperacional: 100, unidadeCusto: "UN" }
    ]);
    const atualizado = resolveFrontCost(frente, [
      { frenteRef: "frente-1", quantidade: 3, custoOperacional: 120, unidadeCusto: "UN" }
    ]);

    expect(inicial.custoFrente).toBe(200);
    expect(atualizado.custoFrente).toBe(360);
  });

  it("soma frentes automaticas e manuais sem misturar as origens", () => {
    const result = calcularMotorCustos({
      frentes: [
        { ref: "automatica", unidadeProducao: "m3", quantidadePrevista: 10, modoCusto: "AUTO", custoManual: 9000 },
        { ref: "manual", unidadeProducao: "mes", quantidadePrevista: 2, modoCusto: "MANUAL", custoManual: 4000 }
      ],
      recursos: [
        {
          frenteRef: "automatica",
          descricao: "Escavadeira",
          quantidade: 2,
          custoOperacional: 1000,
          unidadeCusto: "UN"
        }
      ]
    });

    expect(result.custoDiretoTotal).toBe(6000);
    expect(result.frentes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ref: "automatica", custoDireto: 2000, origemCusto: "RECURSOS" }),
        expect.objectContaining({ ref: "manual", custoDireto: 4000, origemCusto: "MANUAL" })
      ])
    );
    expect(result.unidadesHomogeneas).toBe(false);
  });

  it("converte recursos por hora para custo direto da frente usando prazo e jornada padrao", () => {
    const result = calcularMotorCustos({
      frentes: [
        {
          ref: "frente-1",
          nome: "Movimentacao de solo",
          unidadeProducao: "m3",
          quantidadePrevista: 28000,
          produtividadeDia: 450
        }
      ],
      recursos: [
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Escavadeira",
          quantidade: 1,
          custoOperacional: 380,
          unidadeCusto: "R$/h"
        },
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Caminhoes",
          quantidade: 3,
          custoOperacional: 220,
          unidadeCusto: "R$/h"
        }
      ]
    });

    const prazo = 28000 / 450;
    const horas = prazo * JORNADA_PADRAO_HORAS_DIA;
    const esperado = (1 * 380 * horas) + (3 * 220 * horas);

    expect(result.prazoEstimadoTotalDias).toBe(62.22);
    expect(result.custoDiretoTotal).toBeCloseTo(esperado, 2);
    expect(result.memoria).toHaveLength(2);
    expect(result.avisos.some((aviso) => aviso.includes("jornada padrao"))).toBe(true);
  });

  it("usa uma unica vez a quantidade total do recurso quando sua unidade coincide com a frente", () => {
    const result = calcularMotorCustos({
      frentes: [
        {
          ref: "frente-1",
          unidadeProducao: "m3",
          quantidadePrevista: 100,
          produtividadeDia: 20
        }
      ],
      recursos: [
        {
          frenteRef: "frente-1",
          categoria: "MATERIAL",
          descricao: "Insumo por volume",
          quantidade: 2,
          custoOperacional: 5,
          unidadeCusto: "R$/m3"
        }
      ]
    });

    expect(result.custoDiretoTotal).toBe(10);
    expect(result.custoDiretoUnitarioMedio).toBe(0.1);
  });

  it("converte recurso diario usando o prazo estimado da frente", () => {
    const result = calcularMotorCustos({
      frentes: [
        {
          ref: "frente-1",
          unidadeProducao: "carga",
          quantidadePrevista: 50,
          prazoEstimadoDias: 10
        }
      ],
      recursos: [
        {
          frenteRef: "frente-1",
          categoria: "TERCEIRO",
          descricao: "Equipe de apoio",
          quantidade: 2,
          custoOperacional: 1000,
          unidadeCusto: "R$/dia"
        }
      ]
    });

    expect(result.custoDiretoTotal).toBe(20000);
    expect(result.frentes[0]?.custoDiretoUnitario).toBe(400);
  });

  it("consolida financeiramente por soma de frentes sem somar quantidades de unidades diferentes", () => {
    const result = calcularMotorCustos({
      frentes: [
        {
          ref: "escavacao",
          nome: "Escavacoes",
          unidadeProducao: "m3",
          quantidadePrevista: 100,
          produtividadeDia: 20
        },
        {
          ref: "apoio",
          nome: "Apoio operacional",
          unidadeProducao: "mes",
          quantidadePrevista: 2
        }
      ],
      recursos: [
        {
          frenteRef: "escavacao",
          categoria: "EQUIPAMENTO",
          descricao: "Escavadeira",
          quantidade: 1,
          custoOperacional: 10,
          unidadeCusto: "R$/m3"
        },
        {
          frenteRef: "apoio",
          categoria: "TERCEIRO",
          descricao: "Equipe mensal",
          quantidade: 1,
          custoOperacional: 5000,
          unidadeCusto: "R$/mes"
        }
      ]
    });

    expect(result.custoDiretoTotal).toBe(5010);
    expect(result.unidadesHomogeneas).toBe(false);
    expect(result.quantidadeTotal).toBe(0);
    expect(result.custoDiretoUnitarioMedio).toBe(0);
    expect(result.gruposUnidade).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unidade: "m3", quantidadeTotal: 100, custoDireto: 10 }),
        expect.objectContaining({ unidade: "mes", quantidadeTotal: 2, custoDireto: 5000 })
      ])
    );
  });

  it("calcula a Frente 1 homologada com todos os quatro recursos", () => {
    const result = calcularMotorCustos({
      frentes: [
        {
          ref: "frente-1",
          nome: "Escavacao de Terraplenagem",
          unidadeProducao: "m3",
          quantidadePrevista: 5560.66,
          produtividadeDia: 504,
          prazoEstimadoDias: 11.03
        }
      ],
      recursos: [
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Escavadeira 15 t",
          quantidade: 1,
          custoOperacional: 9929.75,
          unidadeCusto: "UN"
        },
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Caminhao Basculante",
          quantidade: 3,
          custoOperacional: 12710.08,
          unidadeCusto: "UN"
        },
        {
          frenteRef: "frente-1",
          categoria: "TERCEIRO",
          descricao: "MTR",
          quantidade: 5560.66,
          custoOperacional: 7,
          unidadeCusto: "m3"
        },
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Escavadeira 22 t",
          quantidade: 1,
          custoOperacional: 10000,
          unidadeCusto: "UN"
        }
      ]
    });

    expect(result.frentes[0]?.recursos).toHaveLength(4);
    expect(result.frentes[0]?.custoDireto).toBe(96984.61);
    expect(result.custoDiretoTotal).toBe(96984.61);
  });

  it("remove recursos zerados e consolida duplicidades na memoria de calculo", () => {
    const result = calcularMotorCustos({
      frentes: [
        {
          ref: "frente-1",
          unidadeProducao: "dia",
          quantidadePrevista: 2
        }
      ],
      recursos: [
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Escavadeira 15 ton",
          quantidade: 1,
          custoOperacional: 100,
          unidadeCusto: "R$/dia"
        },
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Escavadeira 15 ton",
          quantidade: 1,
          custoOperacional: 100,
          unidadeCusto: "R$/dia"
        },
        {
          frenteRef: "frente-1",
          categoria: "EQUIPAMENTO",
          descricao: "Caminhao vazio",
          quantidade: 1,
          custoOperacional: 0,
          unidadeCusto: "R$/dia"
        }
      ]
    });

    expect(result.custoDiretoTotal).toBe(200);
    expect(result.memoria).toHaveLength(1);
    expect(result.memoria[0]?.descricao).toBe("Escavadeira 15 ton");
    expect(result.memoria[0]?.quantidadeRecursos).toBe(2);
    expect(result.memoria[0]?.custoTotal).toBe(200);
  });
});

describe("Evolucao do prazo e das unidades economicas", () => {
  const frenteBase = {
    ref: "frente-operacional",
    nome: "Escavacao",
    unidadeProducao: "m3",
    quantidadePrevista: 1000,
    produtividadeDia: 100
  };

  function calcularRecurso(
    unidadeEconomicaCusto: "CUSTO_FIXO" | "DIA" | "HORA" | "KM" | "M3" | "M2" | "VIAGEM" | "CARGA" | "MES" | "UNIDADE_PRODUZIDA" | "UNIDADE" | "VALOR_TOTAL",
    overrides: Record<string, unknown> = {},
    frente: Record<string, unknown> = frenteBase
  ) {
    return calcularMotorCustos({
      frentes: [frente as typeof frenteBase],
      recursos: [{
        ref: "recurso-1",
        frenteRef: "frente-operacional",
        descricao: "Recurso teste",
        quantidade: 1,
        valorCusto: 100,
        unidadeEconomicaCusto,
        tipoCalculo: "AUTOMATICO",
        ...overrides
      }]
    });
  }

  it("calcula o prazo teorico pela quantidade e produtividade", () => {
    const planejamento = calcularPlanejamentoFrente({
      ref: "frente-1",
      quantidadePrevista: 28000,
      produtividadeDia: 500
    });

    expect(planejamento.prazoTeorico).toBe(56);
    expect(planejamento.origemPrazo).toBe("AUTOMATICO");
  });

  it("recalcula a produtividade quando existe prazo adotado", () => {
    const planejamento = calcularPlanejamentoFrente({
      ref: "frente-1",
      quantidadePrevista: 28000,
      produtividadeDia: 500,
      prazoTeoricoDias: 56,
      prazoAdotadoDias: 40,
      origemPrazo: "AJUSTADO"
    });

    expect(planejamento.produtividadeAjustada).toBe(700);
    expect(planejamento.produtividadeResultante).toBe(700);
    expect(planejamento.produtividadeInformada).toBe(500);
    expect(planejamento.prazoTeorico).toBe(56);
  });

  it("preserva a produtividade planejada e calcula prazo adotado e produtividade resultante", () => {
    const planejamentoAutomatico = calcularPlanejamentoFrente({
      ref: "frente-escavacao",
      quantidadePrevista: 5560.66,
      produtividadeDia: 504
    });
    const planejamentoAdotado = calcularPlanejamentoFrente({
      ref: "frente-escavacao",
      quantidadePrevista: 5560.66,
      produtividadeDia: 504,
      prazoAdotadoDias: 10,
      origemPrazo: "AJUSTADO"
    });
    const custoComPrazoAdotado = calcularRecurso("DIA", {
      quantidade: 1,
      valorCusto: 900
    }, {
      ...frenteBase,
      quantidadePrevista: 5560.66,
      produtividadeDia: 504,
      prazoAdotadoDias: 10,
      origemPrazo: "AJUSTADO"
    });

    expect(planejamentoAutomatico.prazoTeorico).toBe(11.03);
    expect(planejamentoAutomatico.prazoUtilizado).toBe(11.03);
    expect(planejamentoAdotado.produtividadeInformada).toBe(504);
    expect(planejamentoAdotado.produtividadeResultante).toBe(556.066);
    expect(planejamentoAdotado.prazoUtilizado).toBe(10);
    expect(custoComPrazoAdotado.custoDiretoTotal).toBe(9000);
  });

  it("usa o prazo adotado no custo diario", () => {
    const result = calcularRecurso("DIA", { valorCusto: 900 }, {
      ...frenteBase,
      prazoAdotadoDias: 12,
      origemPrazo: "AJUSTADO"
    });

    expect(result.custoDiretoTotal).toBe(10800);
    expect(result.frentes[0]?.prazoDias).toBe(12);
  });

  it("calcula recurso em reais por dia", () => {
    expect(calcularRecurso("DIA", { quantidade: 2, valorCusto: 900 }).custoDiretoTotal).toBe(18000);
  });

  it("calcula 1 recurso de R$ 900 por dia durante 11,03 dias", () => {
    const result = calcularRecurso("DIA", { quantidade: 1, valorCusto: 900 }, {
      ...frenteBase,
      quantidadePrevista: 5560.66,
      produtividadeDia: 504
    });

    expect(result.custoDiretoTotal).toBe(9927);
    expect(result.memoria[0]?.formula).toContain("11,03 dias");
    expect(result.memoria[0]?.unidadeCustoFormatada).toBe("R$/dia");
  });

  it("calcula recurso de custo fixo pela quantidade", () => {
    expect(calcularRecurso("CUSTO_FIXO", { quantidade: 2, valorCusto: 450 }).custoDiretoTotal).toBe(900);
  });

  it("calcula recurso em reais por hora", () => {
    expect(calcularRecurso("HORA", { quantidade: 2, valorCusto: 100, horasTotais: 80 }).custoDiretoTotal).toBe(16000);
  });

  it("calcula recurso em reais por metro cubico", () => {
    expect(calcularRecurso("M3", { quantidade: 1, valorCusto: 7 }).custoDiretoTotal).toBe(7000);
  });

  it("calcula transporte por km a partir do volume e da capacidade por viagem", () => {
    const result = calcularRecurso("KM", {
      descricao: "Caminhao Basculante 14 m3",
      quantidade: 3,
      valorCusto: 8,
      capacidadePorViagem: 14,
      unidadeCapacidade: "m3",
      distanciaViagemKm: 12
    }, {
      ...frenteBase,
      quantidadePrevista: 5560.66,
      unidadeProducao: "m3"
    });

    expect(result.custoDiretoTotal).toBe(38208);
    expect(result.memoria[0]).toMatchObject({
      viagensTeoricas: 397.19,
      viagensOperacionais: 398,
      custoPorViagem: 96,
      viagensMediasPorRecurso: 132.67,
      custoTotal: 38208,
      statusCalculo: "CALCULADO"
    });
    expect(result.memoria[0]?.formula.replace(/\u00a0/g, " ")).toContain(
      "398 viagens x R$ 96,00/viagem = R$ 38.208,00"
    );
  });

  it("mantem quantidade operacional personalizada independente da quantidade da frente", () => {
    const recursos = [
      {
        ref: "caminhao-herdado",
        frenteRef: "frente-operacional",
        descricao: "Caminhao herdado",
        quantidade: 1,
        valorCusto: 8,
        unidadeEconomicaCusto: "KM" as const,
        tipoCalculo: "AUTOMATICO" as const,
        capacidadePorViagem: 14,
        unidadeCapacidade: "m3",
        distanciaViagemKm: 12,
        origemQuantidadeOperacional: "FRENTE" as const
      },
      {
        ref: "caminhao-personalizado",
        frenteRef: "frente-operacional",
        descricao: "Caminhao personalizado",
        quantidade: 1,
        valorCusto: 8,
        unidadeEconomicaCusto: "KM" as const,
        tipoCalculo: "AUTOMATICO" as const,
        capacidadePorViagem: 14,
        unidadeCapacidade: "m3",
        distanciaViagemKm: 12,
        quantidadeOperacional: 936,
        origemQuantidadeOperacional: "PERSONALIZADA" as const
      }
    ];

    const calcular = (quantidadePrevista: number) => calcularMotorCustos({
      frentes: [{
        ...frenteBase,
        quantidadePrevista,
        unidadeProducao: "m3"
      }],
      recursos
    });
    const inicial = calcular(650);
    const atualizado = calcular(700);
    const herdadoInicial = inicial.memoria.find((item) => item.recursoRef === "caminhao-herdado");
    const personalizadoInicial = inicial.memoria.find(
      (item) => item.recursoRef === "caminhao-personalizado"
    );
    const herdadoAtualizado = atualizado.memoria.find(
      (item) => item.recursoRef === "caminhao-herdado"
    );
    const personalizadoAtualizado = atualizado.memoria.find(
      (item) => item.recursoRef === "caminhao-personalizado"
    );

    expect(herdadoInicial).toMatchObject({
      quantidadeOperacional: 650,
      origemQuantidadeOperacional: "FRENTE",
      viagensOperacionais: 47
    });
    expect(personalizadoInicial).toMatchObject({
      quantidadeOperacional: 936,
      origemQuantidadeOperacional: "PERSONALIZADA",
      viagensOperacionais: 67
    });
    expect(personalizadoInicial?.viagensTeoricas).toBeCloseTo(66.8571, 4);
    expect(herdadoAtualizado).toMatchObject({
      quantidadeOperacional: 700,
      viagensOperacionais: 50
    });
    expect(personalizadoAtualizado).toMatchObject({
      quantidadeOperacional: 936,
      viagensOperacionais: 67
    });
  });

  it("calcula a demanda diaria do transporte sem alterar o custo total", () => {
    const result = calcularRecurso("KM", {
      descricao: "Caminhao Basculante 14 m3",
      quantidade: 2,
      valorCusto: 8,
      capacidadePorViagem: 14,
      unidadeCapacidade: "m3",
      distanciaViagemKm: 12
    }, {
      ...frenteBase,
      quantidadePrevista: 529.62,
      produtividadeDia: 265,
      prazoAdotadoDias: 2,
      origemPrazo: "AJUSTADO",
      unidadeProducao: "m3"
    });

    expect(result.custoDiretoTotal).toBe(3648);
    expect(result.memoria[0]).toMatchObject({
      demandaLogisticaCalculavel: true,
      prazoUtilizadoDemanda: 2,
      viagensOperacionais: 38,
      volumeDiarioExigidoFrota: 264.81,
      volumeDiarioExigidoPorCaminhao: 132.405,
      viagensPorDiaFrota: 19,
      viagensPorCaminhaoPorDia: 9.5,
      custoTotal: 3648
    });
  });

  it("mantem o custo do transporte e orienta quando nao existe prazo valido", () => {
    const result = calcularRecurso("KM", {
      quantidade: 2,
      valorCusto: 8,
      capacidadePorViagem: 14,
      unidadeCapacidade: "m3",
      distanciaViagemKm: 12
    }, {
      ...frenteBase,
      quantidadePrevista: 529.62,
      produtividadeDia: null,
      unidadeProducao: "m3"
    });

    expect(result.custoDiretoTotal).toBe(3648);
    expect(result.memoria[0]?.demandaLogisticaCalculavel).toBe(false);
    expect(result.memoria[0]?.statusCalculo).toBe("CALCULADO");
    expect(result.memoria[0]?.observacoes).toEqual(expect.arrayContaining([
      expect.stringContaining("produtividade ou o prazo")
    ]));
  });

  it("marca o transporte como pendente quando a frota informada e invalida", () => {
    const result = calcularRecurso("KM", {
      quantidade: 0,
      valorCusto: 8,
      capacidadePorViagem: 14,
      unidadeCapacidade: "m3",
      distanciaViagemKm: 12
    }, {
      ...frenteBase,
      quantidadePrevista: 529.62,
      prazoAdotadoDias: 2,
      unidadeProducao: "m3"
    });

    expect(result.custoDiretoTotal).toBe(0);
    expect(result.memoria[0]).toMatchObject({
      statusCalculo: "PENDENTE",
      demandaLogisticaCalculavel: false,
      viagensPorCaminhaoPorDia: 0
    });
  });

  it("nao multiplica o custo total do transporte pela quantidade de caminhoes", () => {
    const transporte = {
      valorCusto: 8,
      capacidadePorViagem: 14,
      unidadeCapacidade: "m3",
      distanciaViagemKm: 12
    };
    const frente = {
      ...frenteBase,
      quantidadePrevista: 5560.66,
      unidadeProducao: "m3"
    };
    const umCaminhao = calcularRecurso("KM", { ...transporte, quantidade: 1 }, frente);
    const tresCaminhoes = calcularRecurso("KM", { ...transporte, quantidade: 3 }, frente);

    expect(umCaminhao.custoDiretoTotal).toBe(38208);
    expect(tresCaminhoes.custoDiretoTotal).toBe(38208);
    expect(umCaminhao.memoria[0]?.viagensMediasPorRecurso).toBe(398);
    expect(tresCaminhoes.memoria[0]?.viagensMediasPorRecurso).toBe(132.67);
  });

  it("mantem transporte incompleto como pendente sem gerar custo incorreto", () => {
    const result = calcularMotorCustos({
      frentes: [{
        ...frenteBase,
        custoManual: 2500,
        quantidadePrevista: 5560.66,
        unidadeProducao: "m3"
      }],
      recursos: [{
        ref: "caminhao-pendente",
        frenteRef: "frente-operacional",
        descricao: "Caminhao sem capacidade",
        quantidade: 3,
        valorCusto: 8,
        unidadeEconomicaCusto: "KM",
        tipoCalculo: "AUTOMATICO",
        distanciaViagemKm: 12
      }]
    });

    expect(result.custoDiretoTotal).toBe(2500);
    expect(result.memoria[0]).toMatchObject({
      statusCalculo: "PENDENTE",
      custoTotal: 0,
      viagensOperacionais: 0
    });
    expect(result.avisos).toEqual(expect.arrayContaining([
      expect.stringContaining("capacidade por viagem")
    ]));
  });

  it("rejeita o calculo quando a unidade da capacidade nao corresponde a frente", () => {
    const result = calcularRecurso("KM", {
      quantidade: 3,
      valorCusto: 8,
      capacidadePorViagem: 14,
      unidadeCapacidade: "m2",
      distanciaViagemKm: 12
    }, {
      ...frenteBase,
      quantidadePrevista: 5560.66,
      unidadeProducao: "m3"
    });

    expect(result.custoDiretoTotal).toBe(0);
    expect(result.memoria[0]?.statusCalculo).toBe("PENDENTE");
    expect(result.memoria[0]?.observacoes).toEqual(expect.arrayContaining([
      expect.stringContaining("compativel")
    ]));
  });

  it("calcula recurso em reais por viagem", () => {
    const result = calcularRecurso("VIAGEM", {
      valorCusto: 100,
      viagensTotais: 80
    });
    expect(result.custoDiretoTotal).toBe(8000);
  });

  it("calcula recurso por carga informada", () => {
    expect(calcularRecurso("CARGA", { valorCusto: 250, cargasTotais: 12 }).custoDiretoTotal).toBe(3000);
  });

  it("calcula por m2 e por unidade produzida usando a quantidade da frente", () => {
    expect(calcularRecurso("M2", { valorCusto: 3 }).custoDiretoTotal).toBe(3000);
    expect(calcularRecurso("UNIDADE_PRODUZIDA", { valorCusto: 4 }).custoDiretoTotal).toBe(4000);
  });

  it("calcula recurso mensal pela quantidade de meses da frente", () => {
    const result = calcularRecurso("MES", { valorCusto: 5000 }, {
      ...frenteBase,
      unidadeProducao: "mes",
      quantidadePrevista: 3.2,
      produtividadeDia: null
    });
    expect(result.custoDiretoTotal).toBe(16000);
  });

  it("prioriza o total de meses informado no recurso", () => {
    expect(calcularRecurso("MES", { quantidade: 2, valorCusto: 5000, mesesTotais: 1.5 }).custoDiretoTotal).toBe(15000);
  });

  it("usa 22 dias por mes como padrao no recurso diario mensal", () => {
    const result = calcularRecurso("DIA", { valorCusto: 900 }, {
      ...frenteBase,
      unidadeProducao: "mes",
      quantidadePrevista: 3.2,
      produtividadeDia: null
    });
    expect(result.custoDiretoTotal).toBe(63360);
  });

  it("permite ajustar os dias trabalhados por mes", () => {
    const result = calcularRecurso("DIA", { valorCusto: 900, diasTrabalhadosMes: 24 }, {
      ...frenteBase,
      unidadeProducao: "mes",
      quantidadePrevista: 3.2,
      produtividadeDia: null
    });
    expect(result.custoDiretoTotal).toBe(69120);
  });

  it("mantem o modo manual por quantidade e custo informado", () => {
    const result = calcularRecurso("UNIDADE", {
      tipoCalculo: "VALOR_TOTAL_MANUAL",
      quantidade: 2,
      valorCusto: 450
    });
    expect(result.custoDiretoTotal).toBe(900);
  });

  it("usa diretamente a unidade economica valor total", () => {
    expect(calcularRecurso("VALOR_TOTAL", { quantidade: 0, valorCusto: 1234.56 }).custoDiretoTotal).toBe(1234.56);
  });

  it("soma todos os recursos e todas as frentes", () => {
    const result = calcularMotorCustos({
      frentes: [
        { ...frenteBase, ref: "f1" },
        { ...frenteBase, ref: "f2", quantidadePrevista: 500, produtividadeDia: 100 }
      ],
      recursos: [
        { ref: "r1", frenteRef: "f1", quantidade: 1, valorCusto: 100, unidadeEconomicaCusto: "DIA" },
        { ref: "r2", frenteRef: "f1", quantidade: 2, valorCusto: 50, unidadeEconomicaCusto: "DIA" },
        { ref: "r3", frenteRef: "f2", quantidade: 1, valorCusto: 200, unidadeEconomicaCusto: "DIA" }
      ]
    });
    expect(result.frentes[0]?.custoDireto).toBe(2000);
    expect(result.frentes[1]?.custoDireto).toBe(1000);
    expect(result.custoDiretoTotal).toBe(3000);
  });

  it("recalcula imediatamente ao alterar produtividade ou prazo", () => {
    const automatico = calcularRecurso("DIA", { valorCusto: 100 });
    const produtividadeAlterada = calcularRecurso("DIA", { valorCusto: 100 }, {
      ...frenteBase,
      produtividadeDia: 200
    });
    const prazoAlterado = calcularRecurso("DIA", { valorCusto: 100 }, {
      ...frenteBase,
      prazoAdotadoDias: 4,
      origemPrazo: "AJUSTADO"
    });

    expect(automatico.custoDiretoTotal).toBe(1000);
    expect(produtividadeAlterada.custoDiretoTotal).toBe(500);
    expect(prazoAlterado.custoDiretoTotal).toBe(400);
  });
});
