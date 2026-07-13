import { describe, expect, it } from "vitest";
import { calcularMotorCustos, JORNADA_PADRAO_HORAS_DIA } from "@/lib/orcamentos/cost-engine";

describe("Motor de custos do orcamento operacional", () => {
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

  it("converte recurso com unidade igual a unidade da frente por quantidade produzida", () => {
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

    expect(result.custoDiretoTotal).toBe(1000);
    expect(result.custoDiretoUnitarioMedio).toBe(10);
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

    expect(result.custoDiretoTotal).toBe(11000);
    expect(result.unidadesHomogeneas).toBe(false);
    expect(result.quantidadeTotal).toBe(0);
    expect(result.custoDiretoUnitarioMedio).toBe(0);
    expect(result.gruposUnidade).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unidade: "m3", quantidadeTotal: 100, custoDireto: 1000 }),
        expect.objectContaining({ unidade: "mes", quantidadeTotal: 2, custoDireto: 10000 })
      ])
    );
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

    expect(result.custoDiretoTotal).toBe(400);
    expect(result.memoria).toHaveLength(1);
    expect(result.memoria[0]?.descricao).toBe("Escavadeira 15 ton");
    expect(result.memoria[0]?.quantidadeRecursos).toBe(2);
    expect(result.memoria[0]?.custoTotal).toBe(400);
  });
});
