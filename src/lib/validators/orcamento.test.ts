import { describe, expect, it } from "vitest";
import { orcamentoSchema } from "@/lib/validators/orcamento";

const clienteId = "11111111-1111-4111-8111-111111111111";

function baseOrcamento() {
  return {
    tipo: "OPERACIONAL",
    status: "RASCUNHO",
    clienteId,
    dataOrcamento: "2026-07-15",
    itens: [] as Record<string, unknown>[]
  };
}

describe("orcamentoSchema", () => {
  it("aceita unidade de capacidade nula em itens antigos que nao dependem dela", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "SERVICO_PRINCIPAL",
      ordem: 1,
      descricao: "Escavacao de terraplenagem",
      unidade: "m3",
      quantidade: 100,
      custoUnitario: 0,
      valorUnitario: 0,
      unidadeCapacidade: null
    });

    expect(orcamentoSchema.safeParse(payload).success).toBe(true);
  });

  it("mantem a validacao especifica da unidade para transporte automatico por km", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "RECURSO",
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "Caminhao basculante",
      ordem: 1,
      descricao: "Caminhao basculante 14 m3",
      unidade: "UN",
      quantidade: 1,
      custoUnitario: 0,
      tipoCalculoRecurso: "AUTOMATICO",
      unidadeEconomicaCusto: "KM",
      capacidadePorViagem: 14,
      unidadeCapacidade: null,
      distanciaViagemKm: 12,
      valorUnitario: 0
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["itens", 0, "unidadeCapacidade"],
          message: "Informe a unidade da capacidade por viagem."
        })
      ])
    );
  });
});
