import {
  CategoriaRecursoOrcamento,
  ModoCustoFrente,
  ModoCustoOrcamento,
  StatusOrcamento,
  TipoItemOrcamento,
  TipoOrcamento
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { OrcamentoInput } from "@/lib/validators/orcamento";
import { buildPricingSnapshot } from "@/server/services/orcamentos/pricing";

function recurso(
  descricao: string,
  quantidade: number,
  custoUnitario: number,
  unidade: string
): OrcamentoInput["itens"][number] {
  return {
    frenteTempId: "frente-1",
    frenteOrdem: null,
    tipoItem: TipoItemOrcamento.RECURSO,
    servicoId: null,
    materialId: null,
    equipamentoId: null,
    categoriaRecurso:
      descricao === "MTR"
        ? CategoriaRecursoOrcamento.TERCEIRO
        : CategoriaRecursoOrcamento.EQUIPAMENTO,
    classeOperacional: descricao === "MTR" ? "" : descricao,
    recursoReferenciaId: "",
    recursoNome: descricao,
    ordem: 1,
    codigo: "",
    descricao,
    unidade,
    quantidade,
    produtividade: null,
    custoUnitario,
    valorUnitario: 0,
    observacao: ""
  };
}

function inputOperacional(ajusteComercial = 0): OrcamentoInput {
  return {
    tipo: TipoOrcamento.OPERACIONAL,
    status: StatusOrcamento.EM_ELABORACAO,
    clienteId: "cliente-1",
    obraId: null,
    responsavelId: null,
    dataOrcamento: "2026-07-13",
    validadeAte: "",
    titulo: "Homologacao do motor",
    objeto: "",
    observacaoInterna: "",
    observacaoCliente: "",
    valorDesconto: 0,
    valorAcrescimo: 0,
    formacaoPreco: {
      modoCusto: ModoCustoOrcamento.COMPLETO,
      custoDireto: 0,
      custoIndireto: 0,
      impostosPercentual: 0,
      impostosValor: 0,
      margemPercentual: 0,
      margemValor: 0,
      precoSugerido: 0,
      ajusteComercial,
      precoFinal: 0,
      observacao: ""
    },
    cenarios: [],
    propostasComerciais: [],
    frentes: [
      {
        tempId: "frente-1",
        cenarioTempId: "",
        cenarioOrdem: null,
        ordem: 1,
        nome: "Frente 1",
        descricao: "",
        metodoExecutivo: "",
        unidadeProducao: "m3",
        quantidadePrevista: 5560.66,
        produtividadeDia: 504,
        prazoEstimadoDias: 11.03,
        modoCusto: ModoCustoFrente.AUTO,
        custoManual: 0,
        observacao: ""
      }
    ],
    itens: [
      recurso("Escavadeira 15 t", 1, 9929.75, "UN"),
      recurso("Caminhao Basculante", 3, 12710.08, "UN"),
      recurso("MTR", 5560.66, 7, "m3"),
      recurso("Escavadeira 22 t", 1, 10000, "UN")
    ],
    premissas: []
  };
}

describe("Formacao do preco do orcamento operacional", () => {
  it("recalcula o custo direto com todos os recursos da frente", () => {
    const snapshot = buildPricingSnapshot(inputOperacional());

    expect(snapshot.formacaoPreco.custoDireto).toBe(96984.61);
    expect(snapshot.formacaoPreco.precoSugerido).toBe(96984.61);
    expect(snapshot.formacaoPreco.precoFinal).toBe(96984.61);
  });

  it("mantem o ajuste comercial fora do calculo do custo direto", () => {
    const snapshot = buildPricingSnapshot(inputOperacional(120000));

    expect(snapshot.formacaoPreco.custoDireto).toBe(96984.61);
    expect(snapshot.formacaoPreco.ajusteComercial).toBe(120000);
    expect(snapshot.formacaoPreco.precoFinal).toBe(120000);
  });

  it("recalcula margem e impostos operacionais a partir do custo atual", () => {
    const input = inputOperacional();
    input.formacaoPreco = {
      ...input.formacaoPreco!,
      margemPercentual: 10,
      margemValor: 999999,
      impostosPercentual: 5,
      impostosValor: 999999
    };

    const snapshot = buildPricingSnapshot(input);

    expect(snapshot.formacaoPreco.margemValor).toBe(9698.46);
    expect(snapshot.formacaoPreco.impostosValor).toBe(5334.15);
    expect(snapshot.formacaoPreco.precoFinal).toBe(112017.22);
  });

  it("consolida frentes automaticas e manuais no custo direto", () => {
    const input = inputOperacional();
    input.frentes.push({
      tempId: "frente-2",
      cenarioTempId: "",
      cenarioOrdem: null,
      ordem: 2,
      nome: "Frente manual",
      descricao: "",
      metodoExecutivo: "",
      unidadeProducao: "mes",
      quantidadePrevista: 2,
      produtividadeDia: null,
      prazoEstimadoDias: null,
      modoCusto: ModoCustoFrente.MANUAL,
      custoManual: 30000,
      observacao: ""
    });

    const snapshot = buildPricingSnapshot(input);

    expect(snapshot.formacaoPreco.custoDireto).toBe(126984.61);
    expect(snapshot.formacaoPreco.precoFinal).toBe(126984.61);
  });

  it("mantem recursos na memoria sem substituir a sobrescrita manual da frente", () => {
    const input = inputOperacional();
    input.frentes[0] = {
      ...input.frentes[0],
      modoCusto: ModoCustoFrente.MANUAL,
      custoManual: 120000
    };

    const snapshot = buildPricingSnapshot(input);

    expect(snapshot.formacaoPreco.custoDireto).toBe(120000);
  });

  it("nao utiliza preco de venda do servico principal como custo operacional", () => {
    const input = inputOperacional();
    input.itens.push({
      frenteTempId: "frente-1",
      frenteOrdem: null,
      tipoItem: TipoItemOrcamento.SERVICO_PRINCIPAL,
      servicoId: null,
      materialId: null,
      equipamentoId: null,
      categoriaRecurso: null,
      classeOperacional: "",
      recursoReferenciaId: "",
      recursoNome: "",
      ordem: 5,
      codigo: "SERV-001",
      descricao: "Servico principal",
      unidade: "m3",
      quantidade: 5560.66,
      produtividade: null,
      custoUnitario: 999999,
      valorUnitario: 999999,
      observacao: ""
    });

    const snapshot = buildPricingSnapshot(input);

    expect(snapshot.formacaoPreco.custoDireto).toBe(96984.61);
  });
});
