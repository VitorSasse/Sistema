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
  it("aceita item comercial vinculado a equipamento sem servico", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "COMERCIAL",
      origemItemComercial: "RESOURCE",
      equipamentoId: "22222222-2222-4222-8222-222222222222",
      servicoId: null,
      ordem: 1,
      descricao: "Escavadeira hidraulica 15 t",
      unidade: "DIARIA",
      quantidade: 1,
      custoUnitario: 0,
      valorUnitario: 2800
    });

    expect(orcamentoSchema.safeParse(payload).success).toBe(true);
  });

  it("bloqueia item comercial com servico e equipamento simultaneos", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "COMERCIAL",
      origemItemComercial: "RESOURCE",
      servicoId: "33333333-3333-4333-8333-333333333333",
      equipamentoId: "22222222-2222-4222-8222-222222222222",
      ordem: 1,
      descricao: "Item duplicado",
      unidade: "UN",
      quantidade: 1,
      custoUnitario: 0,
      valorUnitario: 100
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["itens", 0, "origemItemComercial"],
          message: "O item comercial nao pode usar servico e equipamento ao mesmo tempo."
        })
      ])
    );
  });

  it("exige equipamento quando a origem comercial for recurso", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "COMERCIAL",
      origemItemComercial: "RESOURCE",
      ordem: 1,
      descricao: "Locacao de equipamento",
      unidade: "DIARIA",
      quantidade: 1,
      custoUnitario: 0,
      valorUnitario: 100
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["itens", 0, "equipamentoId"],
          message: "Selecione o equipamento ou recurso comercial deste item."
        })
      ])
    );
  });

  it("aceita item comercial manual sem servico e sem equipamento", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "COMERCIAL",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Locacao especial nao cadastrada",
      ordem: 1,
      descricao: "Locacao especial nao cadastrada",
      unidade: "DIARIA",
      quantidade: 1,
      custoUnitario: 0,
      valorUnitario: 500
    });

    expect(orcamentoSchema.safeParse(payload).success).toBe(true);
  });

  it("bloqueia item comercial manual sem nome com mensagem especifica", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "COMERCIAL",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "",
      codigo: "10000161",
      ordem: 1,
      descricao: "Descricao complementar nao substitui o nome",
      unidade: "m3",
      quantidade: 3343.5,
      custoUnitario: 0,
      valorUnitario: 35
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["itens", 0, "descricaoManualComercial"],
          message: "Informe o nome do item comercial."
        })
      ])
    );
  });

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
