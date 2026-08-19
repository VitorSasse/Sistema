import { describe, expect, it } from "vitest";
import {
  buildPayload,
  buildVendasFrentesFromMotor,
  normalizeItemsForPayload,
  validateItemsBeforeSubmit
} from "@/features/orcamentos/orcamentos-manager";
import {
  calcularMotorCustos,
  type CostEngineFrenteInput,
  type CostEngineRecursoInput
} from "@/lib/orcamentos/cost-engine";
import { orcamentoSchema } from "@/lib/validators/orcamento";

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

function makeOrcamentoForm(itens: ItemInput[]) {
  return {
    id: undefined,
    tipo: "OPERACIONAL",
    status: "RASCUNHO",
    clienteId: "11111111-1111-4111-8111-111111111111",
    obraId: "",
    responsavelId: "",
    dataOrcamento: "2026-08-18",
    validadeAte: "",
    titulo: "Orcamento teste",
    objeto: "",
    observacaoInterna: "",
    observacaoCliente: "",
    valorDesconto: "0",
    valorAcrescimo: "0",
    formacaoPreco: {
      modoCusto: "SIMPLIFICADO",
      custoDireto: "0",
      custoIndireto: "0",
      impostosPercentual: "0",
      impostosValor: "0",
      margemPercentual: "0",
      margemValor: "0",
      precoSugerido: "0",
      ajusteComercial: "0",
      precoFinal: "0",
      observacao: ""
    },
    cenarios: [
      {
        localId: "cenario-1",
        ordem: 1,
        nome: "Cenario padrao",
        descricao: "",
        metodoExecutivo: "",
        observacao: "",
        isPadrao: true,
        status: "EM_ESTUDO"
      }
    ],
    propostasComerciais: [],
    frentes: [makeFrente()],
    itens,
    premissas: []
  } as Parameters<typeof buildPayload>[0];
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

  it("reidrata item comercial manual legado mantendo o nome no campo validado", () => {
    const itens = normalizeItemsForPayload([
      makeItem({
        tipoItem: "SERVICO_PRINCIPAL",
        origemItemComercial: "MANUAL",
        descricaoManualComercial: "",
        descricao: "Aterro compactado",
        unidade: "m3",
        quantidade: "100",
        modoPrecificacao: "COMPOSICAO"
      })
    ]);

    expect(itens).toHaveLength(1);
    expect(itens[0].descricaoManualComercial).toBe("Aterro compactado");
    expect(itens[0].descricao).toBe("");
    expect(validateItemsBeforeSubmit(makeForm(itens)).errors).toEqual({});

    const payload = buildPayload(makeOrcamentoForm(itens));
    expect(payload.itens[0]).toMatchObject({
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Aterro compactado",
      descricao: ""
    });
  });

  it("mantem descricaoManualComercial no payload ao adicionar nova frente em orcamento existente", () => {
    const frenteExistente = makeFrente({ localId: "frente-existente", ordem: 1, nome: "Frente existente" });
    const novaFrente = makeFrente({ localId: "frente-nova", ordem: 2, nome: "Nova frente" });
    const itemExistente = makeItem({
      localId: "servico-existente",
      frenteTempId: "frente-existente",
      tipoItem: "SERVICO_PRINCIPAL",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Escavacao existente",
      unidade: "m3",
      quantidade: "10",
      modoPrecificacao: "COMPOSICAO"
    });
    const itemVisualVazioDaNovaFrente = makeItem({
      localId: "item-vazio-nova-frente",
      frenteTempId: "frente-nova",
      ordem: 2
    });
    const servicoPrincipalNovo = makeItem({
      localId: "servico-principal-novo",
      frenteTempId: "frente-nova",
      ordem: 3,
      tipoItem: "SERVICO_PRINCIPAL",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "",
      descricao: "Aterro compactado",
      unidade: "m3",
      quantidade: "100",
      modoPrecificacao: "COMPOSICAO"
    });
    const servicoAuxiliarNovo = makeItem({
      localId: "servico-auxiliar-novo",
      frenteTempId: "frente-nova",
      ordem: 4,
      tipoItem: "SERVICO_AUXILIAR",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Regularizacao",
      descricao: "Regularizacao",
      unidade: "m3",
      quantidade: "100",
      modoPrecificacao: "PRECO_DIRETO",
      valorUnitario: "2"
    });
    const recursoNovo = makeItem({
      localId: "recurso-novo",
      frenteTempId: "frente-nova",
      ordem: 5,
      tipoItem: "RECURSO",
      descricao: "Caminhao basculante",
      recursoNome: "Caminhao basculante",
      classeOperacional: "Caminhao",
      quantidade: "2",
      unidadeEconomicaCusto: "CARGA",
      valorCusto: "150",
      custoUnitario: "150",
      cargasTotais: "10"
    });
    const form = {
      ...makeOrcamentoForm([
        itemExistente,
        itemVisualVazioDaNovaFrente,
        servicoPrincipalNovo,
        servicoAuxiliarNovo,
        recursoNovo
      ]),
      frentes: [frenteExistente, novaFrente]
    } as Parameters<typeof buildPayload>[0];

    const validation = validateItemsBeforeSubmit(form);
    const payload = buildPayload(form);

    expect(validation.errors).toEqual({});
    expect(orcamentoSchema.safeParse(payload).success).toBe(true);
    expect(payload.itens.find((item) => item.tempId === "item-vazio-nova-frente")).toBeUndefined();
    expect(payload.itens.find((item) => item.tempId === "servico-principal-novo")).toMatchObject({
      tipoItem: "SERVICO_PRINCIPAL",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Aterro compactado",
      descricao: ""
    });
    expect(payload.itens.find((item) => item.tempId === "servico-auxiliar-novo")).toMatchObject({
      tipoItem: "SERVICO_AUXILIAR",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Regularizacao",
      descricao: ""
    });
    expect(payload.itens.find((item) => item.tempId === "recurso-novo")).toMatchObject({
      tipoItem: "RECURSO",
      origemItemComercial: null
    });

    const itensReabertos = payload.itens.map((item) =>
      makeItem({
        localId: String(item.tempId),
        frenteTempId: String(item.frenteTempId),
        tipoItem: item.tipoItem,
        origemItemComercial: item.origemItemComercial ?? "MANUAL",
        descricaoManualComercial: item.descricaoManualComercial ?? "",
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: String(item.quantidade),
        modoPrecificacao: item.modoPrecificacao,
        formaApresentacaoComercial: item.formaApresentacaoComercial,
        recursoNome: item.recursoNome ?? "",
        classeOperacional: item.classeOperacional ?? "",
        unidadeEconomicaCusto: item.unidadeEconomicaCusto ?? "CUSTO_FIXO",
        valorCusto: String(item.valorCusto ?? 0),
        custoUnitario: String(item.custoUnitario ?? 0),
        cargasTotais: String(item.cargasTotais ?? "")
      })
    );
    const formReaberto = {
      ...form,
      itens: itensReabertos
    };
    const payloadSegundoSave = buildPayload(formReaberto);

    expect(validateItemsBeforeSubmit(formReaberto).errors).toEqual({});
    expect(orcamentoSchema.safeParse(payloadSegundoSave).success).toBe(true);
    expect(payloadSegundoSave.itens.find((item) => item.tempId === "servico-principal-novo")).toMatchObject({
      tipoItem: "SERVICO_PRINCIPAL",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Aterro compactado"
    });
  });

  it("nao altera o estado local quando a validacao de item manual falha", () => {
    const form = makeForm([
      makeItem({
        localId: "servico-invalido",
        tipoItem: "SERVICO_PRINCIPAL",
        origemItemComercial: "MANUAL",
        descricaoManualComercial: "A",
        descricao: "",
        unidade: "m3",
        quantidade: "10"
      })
    ]);
    const snapshotAntes = JSON.stringify(form);
    const validation = validateItemsBeforeSubmit(form);

    expect(Object.values(validation.errors)).toContain(
      "Item 1: informe uma descricao com pelo menos 2 caracteres."
    );
    expect(JSON.stringify(form)).toBe(snapshotAntes);
  });

  it("mantem o resumo da frente em composicao sincronizado com o custo atual dos recursos", () => {
    const servicoPrincipal = makeItem({
      localId: "servico-1",
      tipoItem: "SERVICO_PRINCIPAL",
      origemItemComercial: "MANUAL",
      descricaoManualComercial: "Aterro compactado",
      unidade: "m3",
      quantidade: "100",
      modoPrecificacao: "COMPOSICAO",
      valorUnitario: "0"
    });
    const recurso = makeItem({
      localId: "recurso-1",
      tipoItem: "RECURSO",
      descricao: "Escavadeira",
      recursoNome: "Escavadeira",
      classeOperacional: "Escavadeira",
      quantidade: "1",
      unidadeEconomicaCusto: "CUSTO_FIXO",
      valorCusto: "200",
      custoUnitario: "200"
    });
    const formInicial = makeOrcamentoForm([servicoPrincipal, recurso]);
    const motorInput: {
      frentes: CostEngineFrenteInput[];
      recursos: CostEngineRecursoInput[];
    } = {
      frentes: [{
        ref: "frente-1",
        nome: "Frente 1",
        unidadeProducao: "m3",
        quantidadePrevista: "100",
        produtividadeDia: "",
        prazoEstimadoDias: "3",
        prazoTeoricoDias: "3",
        prazoAdotadoDias: "",
        origemPrazo: "AUTOMATICO",
        modoCusto: "AUTO",
        custoManual: "0"
      }],
      recursos: [{
        ref: "recurso-1",
        frenteRef: "frente-1",
        categoria: "EQUIPAMENTO",
        descricao: "Escavadeira",
        recursoNome: "Escavadeira",
        classeOperacional: "Escavadeira",
        recursoReferenciaId: "",
        quantidade: "1",
        quantidadeOperacional: "",
        origemQuantidadeOperacional: "FRENTE",
        unidadeQuantidadeOperacional: "",
        custoOperacional: "200",
        unidadeCusto: "UN",
        tipoCalculo: "AUTOMATICO",
        unidadeEconomicaCusto: "CUSTO_FIXO",
        valorCusto: "200",
        horasDia: "8",
        horasTotais: "",
        viagensDia: "",
        viagensTotais: "",
        distanciaViagemKm: "",
        quilometrosTotais: "",
        capacidadePorViagem: "",
        unidadeCapacidade: "",
        cargasTotais: "",
        mesesTotais: "",
        diasTrabalhadosMes: "22"
      }]
    };
    const motorInicial = calcularMotorCustos(motorInput);

    const vendaInicial = buildVendasFrentesFromMotor(formInicial, motorInicial)[0];

    const recursoAtualizado = { ...recurso, valorCusto: "360", custoUnitario: "360" };
    const formAtualizado = makeOrcamentoForm([servicoPrincipal, recursoAtualizado]);
    const motorAtualizado = calcularMotorCustos({
      ...motorInput,
      recursos: [{
        ...motorInput.recursos[0],
        custoOperacional: "360",
        valorCusto: "360"
      }]
    });
    const vendaAtualizada = buildVendasFrentesFromMotor(formAtualizado, motorAtualizado)[0];

    expect(vendaInicial?.valorVenda).toBe(200);
    expect(vendaAtualizada?.valorVenda).toBe(360);
    expect(vendaAtualizada?.memoriaVenda[0]?.modoPrecificacao).toBe("COMPOSICAO");
  });
});
