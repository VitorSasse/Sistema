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

  it("normaliza descricao de recurso reidratado a partir do nome do recurso", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "RECURSO",
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "CAMINHAO BASCULANTE",
      recursoNome: "CAMINHAO BASCULANTE 14m3",
      ordem: 1,
      descricao: "",
      unidade: "UN",
      quantidade: 2,
      custoUnitario: 900,
      tipoCalculoRecurso: "AUTOMATICO",
      unidadeEconomicaCusto: "CUSTO_FIXO",
      valorCusto: 900,
      valorUnitario: 0
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(true);
    expect(result.data?.itens[0]?.descricao).toBe("CAMINHAO BASCULANTE 14m3");
  });

  it("bloqueia recurso sem descricao, nome ou identificacao valida com mensagem acionavel", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "RECURSO",
      categoriaRecurso: "EQUIPAMENTO",
      ordem: 1,
      descricao: "",
      unidade: "UN",
      quantidade: 1,
      custoUnitario: 900,
      tipoCalculoRecurso: "AUTOMATICO",
      unidadeEconomicaCusto: "CUSTO_FIXO",
      valorCusto: 900,
      valorUnitario: 0
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["itens", 0, "recursoReferenciaId"],
          message: "O recurso deste item nao possui cadastro ou identificacao valida. Selecione novamente o recurso."
        })
      ])
    );
  });

  it("normaliza unidade operacional automatica por dia antes da validacao", () => {
    const payload = {
      ...baseOrcamento(),
      frentes: [
        {
          tempId: "frente-1",
          ordem: 1,
          natureza: "OPERACIONAL",
          nome: "Frente 1",
          unidadeProducao: "m3",
          quantidadePrevista: 100,
          produtividadeDia: 33.33,
          prazoEstimadoDias: 3,
          prazoTeoricoDias: 3,
          prazoAdotadoDias: null,
          modoCusto: "AUTO",
          custoManual: 0
        }
      ]
    };
    payload.itens.push({
      frenteTempId: "frente-1",
      tipoItem: "RECURSO",
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "ESCAVADEIRA",
      recursoNome: "ESCAVADEIRA 15 TON",
      ordem: 1,
      descricao: "",
      unidade: "UN",
      quantidade: 1,
      custoUnitario: 900,
      tipoCalculoRecurso: "AUTOMATICO",
      unidadeEconomicaCusto: "DIA",
      valorCusto: 900,
      quantidadeOperacional: null,
      origemQuantidadeOperacional: "FRENTE",
      unidadeQuantidadeOperacional: null,
      valorUnitario: 0
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(true);
    expect(result.data?.itens[0]?.quantidadeOperacional).toBe(3);
    expect(result.data?.itens[0]?.unidadeQuantidadeOperacional).toBe("dias");
    expect(result.data?.itens[0]?.origemQuantidadeOperacional).toBe("FRENTE");
  });

  it("bloqueia somente recurso realmente personalizado sem unidade operacional", () => {
    const payload = baseOrcamento();
    payload.itens.push({
      tipoItem: "RECURSO",
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "ESCAVADEIRA",
      recursoNome: "ESCAVADEIRA 15 TON",
      ordem: 1,
      descricao: "",
      unidade: "UN",
      quantidade: 1,
      custoUnitario: 900,
      tipoCalculoRecurso: "AUTOMATICO",
      unidadeEconomicaCusto: "DIA",
      valorCusto: 900,
      quantidadeOperacional: 10,
      origemQuantidadeOperacional: "PERSONALIZADA",
      unidadeQuantidadeOperacional: "",
      valorUnitario: 0
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["itens", 0, "unidadeQuantidadeOperacional"],
          message: "Informe a unidade da quantidade operacional personalizada para o recurso."
        })
      ])
    );
  });

  it("permite frente em m2 com caminhao em m3 quando a quantidade operacional personalizada esta em m3", () => {
    const payload = {
      ...baseOrcamento(),
      frentes: [
        {
          tempId: "frente-1",
          ordem: 1,
          natureza: "OPERACIONAL",
          nome: "Limpeza de terreno",
          unidadeProducao: "m2",
          quantidadePrevista: 1000,
          produtividadeDia: 500,
          prazoEstimadoDias: 2,
          prazoTeoricoDias: 2,
          modoCusto: "AUTO",
          custoManual: 0
        }
      ]
    };
    payload.itens.push({
      frenteTempId: "frente-1",
      tipoItem: "RECURSO",
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "CAMINHAO BASCULANTE",
      recursoNome: "CAMINHAO BASCULANTE 14m3",
      ordem: 1,
      descricao: "",
      unidade: "UN",
      quantidade: 1,
      custoUnitario: 8,
      tipoCalculoRecurso: "AUTOMATICO",
      unidadeEconomicaCusto: "KM",
      valorCusto: 8,
      quantidadeOperacional: 150,
      origemQuantidadeOperacional: "PERSONALIZADA",
      unidadeQuantidadeOperacional: "m3",
      capacidadePorViagem: 14,
      unidadeCapacidade: "m3",
      distanciaViagemKm: 26,
      valorUnitario: 0
    });

    expect(orcamentoSchema.safeParse(payload).success).toBe(true);
  });

  it("bloqueia transporte quando quantidade operacional e capacidade usam unidades incompativeis", () => {
    const payload = {
      ...baseOrcamento(),
      frentes: [
        {
          tempId: "frente-1",
          ordem: 1,
          natureza: "OPERACIONAL",
          nome: "Transporte",
          unidadeProducao: "m2",
          quantidadePrevista: 1000,
          modoCusto: "AUTO",
          custoManual: 0
        }
      ]
    };
    payload.itens.push({
      frenteTempId: "frente-1",
      tipoItem: "RECURSO",
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "CAMINHAO BASCULANTE",
      recursoNome: "CAMINHAO BASCULANTE",
      ordem: 1,
      descricao: "",
      unidade: "UN",
      quantidade: 1,
      custoUnitario: 8,
      tipoCalculoRecurso: "AUTOMATICO",
      unidadeEconomicaCusto: "KM",
      valorCusto: 8,
      quantidadeOperacional: 150,
      origemQuantidadeOperacional: "PERSONALIZADA",
      unidadeQuantidadeOperacional: "m3",
      capacidadePorViagem: 14,
      unidadeCapacidade: "ton",
      distanciaViagemKm: 26,
      valorUnitario: 0
    });

    const result = orcamentoSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["itens", 0, "unidadeCapacidade"],
          message: expect.stringContaining("quantidade operacional e a capacidade usam unidades diferentes")
        })
      ])
    );
  });
});
