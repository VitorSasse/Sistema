import { describe, expect, it } from "vitest";
import {
  normalizeItemsForPayload,
  validateItemsBeforeSubmit
} from "@/features/orcamentos/orcamentos-manager";

type ItemInput = Parameters<typeof normalizeItemsForPayload>[0][number];

function makeItem(overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    localId: "item-1",
    frenteTempId: "frente-1",
    tipoItem: "COMERCIAL",
    origemItemComercial: "MANUAL",
    descricaoManualComercial: "",
    servicoId: "",
    materialId: "",
    equipamentoId: "",
    referenciaTecnicaRecursoId: "",
    formaCusteioRecursoId: "",
    formaCusteioSnapshot: null,
    valorReferenciaCusteio: "",
    valorAplicadoCusteio: "",
    categoriaRecurso: "EQUIPAMENTO",
    classeOperacional: "",
    recursoReferenciaId: "",
    recursoNome: "",
    modoPrecificacao: "PRECO_DIRETO",
    formaApresentacaoComercial: "QUANTIDADE_DEFINIDA",
    precoCompra: "",
    markupPercentual: "",
    precoVendaSobrescrito: false,
    custoCalculadoOriginal: "",
    custoBaseSobrescrito: "",
    custoBaseAplicado: "",
    origemCustoAplicado: "CALCULADO_AUTOMATICAMENTE",
    precoCalculado: "",
    precoAplicado: "",
    origemValorAplicado: "CALCULADO_AUTOMATICAMENTE",
    motivoSobrescrita: "",
    fornecedorPreferencialId: "",
    exibirNoPdf: true,
    observacaoComercial: "",
    ordem: 1,
    codigo: "",
    descricao: "",
    unidade: "UN",
    quantidade: "1",
    quantidadeOperacional: "",
    origemQuantidadeOperacional: "FRENTE",
    unidadeQuantidadeOperacional: "",
    produtividade: "",
    custoUnitario: "0",
    tipoCalculoRecurso: "AUTOMATICO",
    unidadeEconomicaCusto: "CUSTO_FIXO",
    valorCusto: "0",
    horasDia: "8",
    horasTotais: "",
    viagensDia: "",
    viagensTotais: "",
    distanciaViagemKm: "",
    quilometrosTotais: "",
    capacidadePorViagem: "",
    unidadeCapacidade: "",
    caracteristicasRecursoSnapshot: null,
    camposTecnicosPersonalizados: [],
    cargasTotais: "",
    mesesTotais: "",
    diasTrabalhadosMes: "22",
    custoTotalCalculado: "0",
    memoriaCalculo: "",
    valorUnitario: "0",
    observacao: "",
    ...overrides
  };
}

function makeForm(itens: ItemInput[]) {
  return {
    frentes: [makeFrente()],
    itens
  } as Parameters<typeof validateItemsBeforeSubmit>[0];
}

function makeFrente(overrides: Record<string, unknown> = {}) {
  return {
    localId: "frente-1",
    cenarioTempId: "cenario-1",
    ordem: 1,
    natureza: "OPERACIONAL" as const,
    nome: "Frente 1",
    descricao: "",
    metodoExecutivo: "",
    unidadeProducao: "m3",
    quantidadePrevista: "100",
    produtividadeDia: "",
    prazoEstimadoDias: "3",
    prazoTeoricoDias: "3",
    prazoAdotadoDias: "",
    origemPrazo: "AUTOMATICO" as const,
    modoCusto: "AUTO" as const,
    custoManual: "0",
    observacao: "",
    ...overrides
  };
}

describe("normalizacao dos itens do orcamento", () => {
  it("remove duas linhas visuais completamente vazias", () => {
    const itens = normalizeItemsForPayload([
      makeItem({ localId: "item-1", ordem: 1 }),
      makeItem({ localId: "item-2", ordem: 2 })
    ]);

    expect(itens).toHaveLength(0);
  });

  it("nao mantem item excluido antes de salvar", () => {
    const itemMantido = makeItem({
      localId: "item-2",
      ordem: 2,
      descricaoManualComercial: "Escavacao",
      unidade: "m3",
      quantidade: "10",
      valorUnitario: "20"
    });

    const itens = normalizeItemsForPayload([itemMantido]);

    expect(itens).toHaveLength(1);
    expect(itens[0].localId).toBe("item-2");
  });

  it("remove item com apenas espacos em branco", () => {
    const itens = normalizeItemsForPayload([
      makeItem({ descricao: "   ", descricaoManualComercial: "   " })
    ]);

    expect(itens).toHaveLength(0);
  });

  it("bloqueia item real com apenas um caractere na descricao", () => {
    const validation = validateItemsBeforeSubmit(
      makeForm([makeItem({ descricao: "A", unidade: "m3", quantidade: "2" })])
    );

    expect(Object.values(validation.errors)).toContain(
      "Item 1: informe uma descricao com pelo menos 2 caracteres."
    );
  });

  it("aceita item valido com dois ou mais caracteres", () => {
    const validation = validateItemsBeforeSubmit(
      makeForm([makeItem({ descricao: "AB", unidade: "m3", quantidade: "2" })])
    );

    expect(validation.errors).toEqual({});
  });

  it("descarta item residual vazio de orcamento antigo", () => {
    const itens = normalizeItemsForPayload([
      makeItem({ descricao: "", unidade: "UN", quantidade: "1", valorUnitario: "0" })
    ]);

    expect(itens).toHaveLength(0);
  });

  it("resolve descricao de recurso reidratado pelo nome do recurso", () => {
    const itens = normalizeItemsForPayload([
      makeItem({
        tipoItem: "RECURSO",
        descricao: "",
        recursoNome: "CAMINHAO BASCULANTE 14m3",
        classeOperacional: "CAMINHAO BASCULANTE",
        quantidade: "2",
        custoUnitario: "900"
      })
    ]);

    expect(itens).toHaveLength(1);
    expect(itens[0].descricao).toBe("CAMINHAO BASCULANTE 14m3");
  });

  it("permite salvar recurso reidratado com descricao vazia quando possui nome valido", () => {
    const validation = validateItemsBeforeSubmit(
      makeForm([
        makeItem({
          tipoItem: "RECURSO",
          descricao: "",
          recursoNome: "ESCAVADEIRA 15 TON",
          classeOperacional: "ESCAVADEIRA",
          quantidade: "1",
          custoUnitario: "900"
        })
      ])
    );

    expect(validation.errors).toEqual({});
  });

  it("bloqueia recurso sem descricao, nome ou identificacao valida", () => {
    const validation = validateItemsBeforeSubmit(
      makeForm([
        makeItem({
          tipoItem: "RECURSO",
          descricao: "",
          recursoNome: "",
          classeOperacional: "",
          recursoReferenciaId: "",
          quantidade: "1",
          custoUnitario: "900"
        })
      ])
    );

    expect(Object.values(validation.errors)).toContain(
      "Item 1: o recurso nao possui identificacao valida. Selecione novamente o recurso."
    );
  });

  it("resolve quantidade e unidade operacional automatica para recurso por dia", () => {
    const itens = normalizeItemsForPayload(
      [
        makeItem({
          tipoItem: "RECURSO",
          descricao: "",
          recursoNome: "ESCAVADEIRA 15 TON",
          quantidade: "1",
          origemQuantidadeOperacional: "FRENTE",
          unidadeQuantidadeOperacional: "",
          unidadeEconomicaCusto: "DIA",
          valorCusto: "900",
          custoUnitario: "900"
        })
      ],
      [makeFrente()]
    );

    expect(itens).toHaveLength(1);
    expect(itens[0].quantidadeOperacional).toBe("3");
    expect(itens[0].unidadeQuantidadeOperacional).toBe("dias");
    expect(itens[0].origemQuantidadeOperacional).toBe("FRENTE");
  });

  it("permite salvar recurso personalizado com unidade operacional informada", () => {
    const validation = validateItemsBeforeSubmit(
      makeForm([
        makeItem({
          tipoItem: "RECURSO",
          descricao: "",
          recursoNome: "ESCAVADEIRA 15 TON",
          quantidade: "1",
          quantidadeOperacional: "10",
          origemQuantidadeOperacional: "PERSONALIZADA",
          unidadeQuantidadeOperacional: "h",
          unidadeEconomicaCusto: "DIA",
          valorCusto: "900",
          custoUnitario: "900"
        })
      ])
    );

    expect(validation.errors).toEqual({});
  });

  it("bloqueia recurso personalizado sem unidade operacional", () => {
    const validation = validateItemsBeforeSubmit(
      makeForm([
        makeItem({
          tipoItem: "RECURSO",
          descricao: "",
          recursoNome: "ESCAVADEIRA 15 TON",
          quantidade: "1",
          quantidadeOperacional: "10",
          origemQuantidadeOperacional: "PERSONALIZADA",
          unidadeQuantidadeOperacional: "",
          unidadeEconomicaCusto: "DIA",
          valorCusto: "900",
          custoUnitario: "900"
        })
      ])
    );

    expect(Object.values(validation.errors)).toContain(
      "Item 1: informe a unidade da quantidade operacional personalizada para o recurso."
    );
  });

  it("preserva recurso com referencia tecnica estruturada e forma de custeio", () => {
    const itens = normalizeItemsForPayload([
      makeItem({
        tipoItem: "RECURSO",
        categoriaRecurso: "EQUIPAMENTO",
        referenciaTecnicaRecursoId: "11111111-1111-4111-8111-111111111111",
        formaCusteioRecursoId: "22222222-2222-4222-8222-222222222222",
        formaCusteioSnapshot: {
          versao: 1,
          origem: "REFERENCIA_TECNICA",
          referenciaTecnicaRecursoId: "11111111-1111-4111-8111-111111111111",
          referenciaTecnicaNome: "Escavadeira Hidraulica 15 t",
          formaCusteioRecursoId: "22222222-2222-4222-8222-222222222222",
          formaCusteioNome: "Diaria",
          unidadeCusteioId: "33333333-3333-4333-8333-333333333333",
          unidadeCusteioCodigo: "DIA",
          unidadeCusteioRotulo: "R$/dia",
          baseEconomica: "DIA",
          sufixo: "R$/dia",
          valorReferencia: 950,
          valorAplicado: 900
        },
        valorReferenciaCusteio: "950",
        valorAplicadoCusteio: "900",
        classeOperacional: "Escavadeira Hidraulica 15 t",
        recursoReferenciaId: "11111111-1111-4111-8111-111111111111",
        recursoNome: "Escavadeira Hidraulica 15 t",
        descricao: "Escavadeira Hidraulica 15 t",
        unidadeEconomicaCusto: "DIA",
        valorCusto: "900",
        custoUnitario: "900"
      })
    ]);

    expect(itens).toHaveLength(1);
    expect(itens[0].referenciaTecnicaRecursoId).toBe("11111111-1111-4111-8111-111111111111");
    expect(itens[0].formaCusteioRecursoId).toBe("22222222-2222-4222-8222-222222222222");
    expect(itens[0].valorAplicadoCusteio).toBe("900");
    expect(itens[0].valorCusto).toBe("900");
  });
});
