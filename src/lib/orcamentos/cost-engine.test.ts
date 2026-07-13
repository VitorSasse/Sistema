import { describe, expect, it } from "vitest";
import {
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

  it("permite sobrescrever manualmente uma frente que possui recursos", () => {
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

    expect(result.origemCusto).toBe("MANUAL");
    expect(result.custoFrente).toBe(50000);
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
    expect(semRecursos.origemCusto).toBe("RECURSOS");

    const informadoManualmente = resolveFrontCost(
      { ...frente, modoCusto: "MANUAL", custoManual: 7000 },
      []
    );
    expect(informadoManualmente.custoFrente).toBe(7000);
    expect(informadoManualmente.origemCusto).toBe("MANUAL");
  });

  it("atualiza a memoria sem alterar o custo oficial enquanto a frente esta manual", () => {
    const frente = { ref: "frente-1", modoCusto: "MANUAL" as const, custoManual: 7000 };
    const inicial = resolveFrontCost(frente, [
      { frenteRef: "frente-1", quantidade: 2, custoOperacional: 100, unidadeCusto: "UN" }
    ]);
    const atualizado = resolveFrontCost(frente, [
      { frenteRef: "frente-1", quantidade: 3, custoOperacional: 120, unidadeCusto: "UN" }
    ]);

    expect(inicial.custoFrente).toBe(7000);
    expect(atualizado.custoFrente).toBe(7000);
    expect(inicial.custoCalculadoRecursos).toBe(200);
    expect(atualizado.custoCalculadoRecursos).toBe(360);
  });

  it("retorna ao calculo automatico usando a soma atual dos recursos", () => {
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

    expect(manual.custoFrente).toBe(7000);
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
