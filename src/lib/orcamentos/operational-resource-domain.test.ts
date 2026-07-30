import { describe, expect, it } from "vitest";
import {
  normalizeOperationalResource,
  resolveOperationalResourceDescription,
  validateTransportCapacityCompatibility
} from "./operational-resource-domain";

describe("contrato de dominio do recurso operacional", () => {
  it("resolve recurso herdado por dia com quantidade, unidade e origem deterministicas", () => {
    const recurso = normalizeOperationalResource(
      {
        descricao: "Escavadeira",
        quantidade: 1,
        unidadeEconomicaCusto: "DIA",
        valorCusto: 900
      },
      {
        quantidadePrevista: 100,
        unidadeProducao: "m3",
        prazoEstimadoDias: 3
      }
    );

    expect(recurso).toMatchObject({
      descricaoResolvida: "Escavadeira",
      quantidadeOperacionalResolvida: 3,
      unidadeOperacionalResolvida: "dias",
      origemQuantidadeOperacional: "FRENTE",
      origemQuantidadeOperacionalDetalhada: "PRAZO_FRENTE"
    });
  });

  it("preserva quantidade e unidade personalizadas sem depender da frente", () => {
    const recurso = normalizeOperationalResource(
      {
        descricao: "Equipe",
        quantidade: 1,
        quantidadeOperacional: 10,
        unidadeQuantidadeOperacional: "h",
        origemQuantidadeOperacional: "PERSONALIZADA",
        unidadeEconomicaCusto: "DIA"
      },
      {
        quantidadePrevista: 700,
        unidadeProducao: "m3",
        prazoEstimadoDias: 4
      }
    );

    expect(recurso).toMatchObject({
      quantidadeOperacionalResolvida: 10,
      unidadeOperacionalResolvida: "h",
      origemQuantidadeOperacional: "PERSONALIZADA",
      origemQuantidadeOperacionalDetalhada: "PERSONALIZADA"
    });
  });

  it("resolve descricao a partir do nome do recurso quando descricao esta vazia", () => {
    expect(
      resolveOperationalResourceDescription({
        descricao: "",
        recursoNome: "CAMINHAO BASCULANTE 14m3",
        classeOperacional: "CAMINHAO"
      })
    ).toBe("CAMINHAO BASCULANTE 14m3");
  });

  it("valida transporte por km comparando quantidade operacional com capacidade, nao com a frente", () => {
    const compatibilidade = validateTransportCapacityCompatibility({
      unidadeOperacional: "m3",
      unidadeCapacidade: "m3"
    });

    expect(compatibilidade.valid).toBe(true);
  });

  it("permite viagem conhecida sem exigir compatibilidade de capacidade", () => {
    const compatibilidade = validateTransportCapacityCompatibility({
      unidadeOperacional: "viagem",
      unidadeCapacidade: ""
    });

    expect(compatibilidade.valid).toBe(true);
  });
});
