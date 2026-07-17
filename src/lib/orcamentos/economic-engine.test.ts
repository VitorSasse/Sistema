import { describe, expect, it } from "vitest";
import { resolveFrontCost } from "@/lib/orcamentos/cost-engine";
import { calcularConsolidacaoEconomica } from "@/lib/orcamentos/economic-engine";

function frente(ref: string, custoDireto: number) {
  return { ref, nome: `Frente ${ref}`, custoDireto };
}

function servico(frenteRef: string, quantidade: number, valorUnitario: number) {
  return {
    frenteRef,
    tipoItem: "SERVICO_PRINCIPAL",
    descricao: `Servico ${frenteRef}`,
    unidade: "m3",
    quantidade,
    valorUnitario
  };
}

describe("Consolidacao economica das frentes", () => {
  it("trata material com preco direto como venda final sem motor", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 1000)],
      servicos: [{
        frenteRef: "1",
        tipoItem: "MATERIAL",
        modoPrecificacao: "PRECO_DIRETO",
        descricao: "BGS",
        unidade: "m3",
        quantidade: 540,
        valorUnitario: 180
      }],
      margemPercentual: 50,
      impostosPercentual: 10
    });

    expect(result.frentes[0].vendaMateriais).toBe(97200);
    expect(result.precoSugeridoPendentes).toBe(0);
    expect(result.valorTotal).toBe(97200);
  });

  it("trata material por composicao com markup proprio sem enviar ao motor", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 1000)],
      servicos: [{
        frenteRef: "1",
        tipoItem: "MATERIAL",
        modoPrecificacao: "COMPOSICAO",
        descricao: "Material composto",
        unidade: "m3",
        quantidade: 10,
        precoCompra: 100,
        markupPercentual: 25
      }],
      margemPercentual: 50
    });

    expect(result.frentes[0].memoriaVenda[0].precoCalculado).toBe(125);
    expect(result.frentes[0].vendaMateriais).toBe(1250);
    expect(result.precoSugeridoPendentes).toBe(0);
    expect(result.valorTotal).toBe(1250);
  });

  it("trata servico com preco direto como venda final fora do motor", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 1000)],
      servicos: [{
        frenteRef: "1",
        tipoItem: "SERVICO_PRINCIPAL",
        modoPrecificacao: "PRECO_DIRETO",
        descricao: "Escavacao",
        unidade: "m3",
        quantidade: 10,
        valorUnitario: 50
      }],
      margemPercentual: 50
    });

    expect(result.frentes[0].vendaServicosDiretos).toBe(500);
    expect(result.precoSugeridoPendentes).toBe(0);
    expect(result.valorTotal).toBe(500);
  });

  it("usa apenas servico por composicao como base do motor e respeita custo sobrescrito", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 1000)],
      servicos: [{
        frenteRef: "1",
        tipoItem: "SERVICO_PRINCIPAL",
        modoPrecificacao: "COMPOSICAO",
        descricao: "Servico composto",
        unidade: "m3",
        quantidade: 10,
        custoBaseSobrescrito: 800
      }],
      custoIndireto: 100,
      margemPercentual: 10,
      impostosPercentual: 5
    });

    expect(result.frentes[0].custoCalculadoServicosCompostos).toBe(1000);
    expect(result.frentes[0].custoBaseUtilizado).toBe(800);
    expect(result.frentes[0].vendaServicosCompostos).toBe(1039.5);
    expect(result.valorTotal).toBe(1039.5);
    expect(result.frentes[0].memoriaVenda[0].origemValorAplicado).toBe("PERSONALIZADO_PELO_USUARIO");
  });

  it("forma o preco por custo quando a frente possui apenas recursos", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 100)],
      servicos: [],
      margemPercentual: 10,
      impostosPercentual: 5
    });

    expect(result.custoDiretoTotal).toBe(100);
    expect(result.valorComercialInformado).toBe(0);
    expect(result.precoSugeridoPendentes).toBe(115.5);
    expect(result.valorTotal).toBe(115.5);
    expect(result.cenarioComercial).toBe("FORMACAO_POR_CUSTO");
  });

  it("forma o preco usando custo manual quando nao existem recursos validos", () => {
    const custo = resolveFrontCost(
      { ref: "1", custoManual: 200, modoCusto: "AUTO" },
      []
    );
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", custo.custoFrente)],
      servicos: [],
      margemPercentual: 10
    });

    expect(custo.origemCusto).toBe("MANUAL");
    expect(result.custoDiretoTotal).toBe(200);
    expect(result.precoSugeridoPendentes).toBe(220);
  });

  it("usa exclusivamente a venda informada quando a frente possui apenas preco", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 0)],
      servicos: [servico("1", 10, 50)],
      margemPercentual: 30,
      impostosPercentual: 10
    });

    expect(result.custoDiretoTotal).toBe(0);
    expect(result.valorComercialInformado).toBe(500);
    expect(result.precoSugeridoPendentes).toBe(0);
    expect(result.valorTotal).toBe(500);
    expect(result.cenarioComercial).toBe("VENDA_DEFINIDA");
  });

  it("mantem custo para analise e venda para a proposta sem mistura", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 100)],
      servicos: [servico("1", 10, 50)],
      margemPercentual: 20
    });

    expect(result.custoDiretoTotal).toBe(100);
    expect(result.custoTotal).toBe(100);
    expect(result.valorComercialInformado).toBe(500);
    expect(result.valorTotal).toBe(500);
  });

  it("soma os precos de multiplas frentes e servicos principais", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 100), frente("2", 200)],
      servicos: [
        servico("1", 5, 50),
        servico("1", 5, 50),
        servico("2", 3, 200)
      ]
    });

    expect(result.valorComercialInformado).toBe(1100);
    expect(result.frentesComVenda).toBe(2);
    expect(result.frentesPendentes).toBe(0);
    expect(result.valorTotal).toBe(1100);
  });

  it("consolida orcamento misto sem reaplicar margem na venda definida", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 100), frente("2", 200)],
      servicos: [servico("1", 10, 50)],
      custoIndireto: 20,
      margemPercentual: 10,
      impostosPercentual: 5
    });

    expect(result.valorComercialInformado).toBe(500);
    expect(result.custoDiretoPendente).toBe(200);
    expect(result.precoSugeridoPendentes).toBe(254.1);
    expect(result.valorTotal).toBe(754.1);
    expect(result.cenarioComercial).toBe("MISTO");
  });

  it("prioriza recursos e nunca soma o custo manual simultaneo", () => {
    const custo = resolveFrontCost(
      { ref: "1", custoManual: 1000, modoCusto: "MANUAL" },
      [{ frenteRef: "1", quantidade: 2, custoOperacional: 100, unidadeCusto: "UN" }]
    );

    expect(custo.origemCusto).toBe("RECURSOS");
    expect(custo.custoCalculadoRecursos).toBe(200);
    expect(custo.custoManual).toBe(1000);
    expect(custo.custoFrente).toBe(200);
  });

  it("recalcula os mesmos valores apos serializar e reabrir os dados", () => {
    const input = {
      frentes: [frente("1", 100), frente("2", 200)],
      servicos: [servico("1", 10, 50)],
      custoIndireto: 20,
      margemPercentual: 10,
      impostosPercentual: 5,
      ajusteComercial: 0,
      valorDesconto: 10,
      valorAcrescimo: 5
    };
    const antes = calcularConsolidacaoEconomica(input);
    const reaberto = calcularConsolidacaoEconomica(JSON.parse(JSON.stringify(input)));

    expect(reaberto).toEqual(antes);
    expect(reaberto.valorTotal).toBe(749.1);
  });

  it("aplica ajuste comercial somente ao consolidado final", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 100), frente("2", 200)],
      servicos: [servico("1", 10, 50)],
      ajusteComercial: 900,
      valorDesconto: 50
    });

    expect(result.custoDiretoTotal).toBe(300);
    expect(result.valorComercialInformado).toBe(500);
    expect(result.ajusteComercial).toBe(900);
    expect(result.valorTotal).toBe(850);
  });

  it("preserva custo direto global legado quando as frentes antigas nao possuem custo", () => {
    const result = calcularConsolidacaoEconomica({
      frentes: [frente("1", 0)],
      servicos: [],
      custoDiretoLegado: 45000,
      margemPercentual: 10
    });

    expect(result.custoDiretoTotal).toBe(45000);
    expect(result.precoSugeridoPendentes).toBe(49500);
    expect(result.valorTotal).toBe(49500);
  });
});
