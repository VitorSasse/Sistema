import {
  NaturezaRecursoEquipamento,
  StatusCadastro,
  StatusEquipamentoOperacional,
  TipoControleEquipamento,
  TipoRecurso,
  UnidadeEconomicaCusto
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { equipamentoSchema } from "./equipamento";

const equipamentoBase = {
  tipoRecurso: TipoRecurso.EQUIPAMENTO_APOIO,
  tipoControle: TipoControleEquipamento.HORIMETRO,
  descricao: "CAMINHAO BASCULANTE 14 M3",
  placaOuTag: "CB-014",
  complementar: false,
  unidadeEconomicaPadrao: UnidadeEconomicaCusto.KM,
  custoPadrao: 8,
  permitirEdicaoOrcamento: true,
  status: StatusCadastro.ATIVO,
  statusOperacional: StatusEquipamentoOperacional.ATIVO
};

const unidades = {
  uma: "11111111-1111-4111-8111-111111111111",
  duas: "22222222-2222-4222-8222-222222222222",
  tres: "33333333-3333-4333-8333-333333333333"
};

function forma(params: Partial<{
  nome: string;
  unidadeCusteioId: string;
  valorReferencia: number;
  preferencial: boolean;
  ativo: boolean;
}> = {}) {
  return {
    nome: params.nome ?? "Referencia operacional",
    unidadeCusteioId: params.unidadeCusteioId ?? unidades.uma,
    valorReferencia: params.valorReferencia ?? 123.4567,
    preferencial: params.preferencial ?? false,
    ativo: params.ativo ?? true,
    observacao: ""
  };
}

describe("validacao do cadastro mestre de equipamentos", () => {
  it("exige placa ou TAG para recurso proprio", () => {
    const result = equipamentoSchema.safeParse({
      ...equipamentoBase,
      naturezaRecurso: NaturezaRecursoEquipamento.PROPRIO,
      placaOuTag: ""
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join(".") === "placaOuTag")).toBe(true);
  });

  it("permite recurso terceirizado sem placa ou TAG", () => {
    const result = equipamentoSchema.safeParse({
      ...equipamentoBase,
      naturezaRecurso: NaturezaRecursoEquipamento.TERCEIRIZADO,
      placaOuTag: "",
      capacidadeM3: 14,
      unidadeCapacidade: "m3"
    });

    expect(result.success).toBe(true);
  });

  it("mantem equipamento valido sem forma de custeio", () => {
    const result = equipamentoSchema.safeParse({
      ...equipamentoBase,
      naturezaRecurso: NaturezaRecursoEquipamento.TERCEIRIZADO,
      formasCusteio: []
    });

    expect(result.success).toBe(true);
  });

  it("aceita uma forma de custeio com unidade catalogada e valor de referencia", () => {
    const result = equipamentoSchema.safeParse({
      ...equipamentoBase,
      naturezaRecurso: NaturezaRecursoEquipamento.TERCEIRIZADO,
      formasCusteio: [forma({ preferencial: true })]
    });

    expect(result.success).toBe(true);
    expect(result.data?.formasCusteio[0]).toMatchObject({
      unidadeCusteioId: unidades.uma,
      valorReferencia: 123.4567,
      preferencial: true
    });
  });

  it("aceita varias formas sem preferencial obrigatoria", () => {
    const result = equipamentoSchema.safeParse({
      ...equipamentoBase,
      naturezaRecurso: NaturezaRecursoEquipamento.TERCEIRIZADO,
      formasCusteio: [
        forma({ nome: "Referencia A", unidadeCusteioId: unidades.uma }),
        forma({ nome: "Referencia B", unidadeCusteioId: unidades.duas })
      ]
    });

    expect(result.success).toBe(true);
  });

  it("bloqueia duas formas ativas marcadas como preferenciais", () => {
    const result = equipamentoSchema.safeParse({
      ...equipamentoBase,
      naturezaRecurso: NaturezaRecursoEquipamento.TERCEIRIZADO,
      formasCusteio: [
        forma({ nome: "Referencia A", unidadeCusteioId: unidades.uma, preferencial: true }),
        forma({ nome: "Referencia B", unidadeCusteioId: unidades.duas, preferencial: true })
      ]
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes("preferencial"))).toBe(true);
  });

  it.each([
    { unidadeCusteioId: unidades.uma, valorReferencia: 1.2345 },
    { unidadeCusteioId: unidades.duas, valorReferencia: 99.99 },
    { unidadeCusteioId: unidades.tres, valorReferencia: 5000 }
  ])("aceita unidades diferentes sem regra especifica por codigo %#", ({ unidadeCusteioId, valorReferencia }) => {
    const result = equipamentoSchema.safeParse({
      ...equipamentoBase,
      naturezaRecurso: NaturezaRecursoEquipamento.TERCEIRIZADO,
      formasCusteio: [forma({ unidadeCusteioId, valorReferencia })]
    });

    expect(result.success).toBe(true);
  });
});
