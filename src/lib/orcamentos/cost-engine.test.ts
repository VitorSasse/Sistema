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
});
