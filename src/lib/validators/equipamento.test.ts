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
});
