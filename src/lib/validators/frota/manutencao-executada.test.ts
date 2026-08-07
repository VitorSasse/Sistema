import { TipoItemManutencaoExecutada } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { manutencaoExecutadaSchema } from "./manutencao-executada";

const UUID_EQUIPAMENTO = "11111111-1111-4111-8111-111111111111";

describe("manutencaoExecutadaSchema", () => {
  it("aceita peca com quantidade e unidade", () => {
    const parsed = manutencaoExecutadaSchema.parse({
      equipamentoId: UUID_EQUIPAMENTO,
      dataExecucao: "2026-08-07",
      tipoManutencao: "Revisao",
      descricaoServico: "Troca de oleo e filtros",
      itensServicos: [
        {
          tipo: TipoItemManutencaoExecutada.PECA,
          descricao: "Filtro de oleo",
          quantidade: 1,
          unidade: "un",
          observacao: "Aplicado na revisao"
        }
      ]
    });

    expect(parsed.itensServicos[0]).toMatchObject({
      tipo: TipoItemManutencaoExecutada.PECA,
      descricao: "Filtro de oleo",
      quantidade: 1,
      unidade: "un",
      observacao: "Aplicado na revisao"
    });
  });

  it("remove quantidade e unidade de servico", () => {
    const parsed = manutencaoExecutadaSchema.parse({
      equipamentoId: UUID_EQUIPAMENTO,
      dataExecucao: "2026-08-07",
      tipoManutencao: "Revisao",
      descricaoServico: "Revisao geral",
      itensServicos: [
        {
          tipo: TipoItemManutencaoExecutada.SERVICO,
          descricao: "Mao de obra",
          quantidade: 3,
          unidade: "h",
          observacao: ""
        }
      ]
    });

    expect(parsed.itensServicos[0]).toMatchObject({
      tipo: TipoItemManutencaoExecutada.SERVICO,
      descricao: "Mao de obra",
      quantidade: null,
      unidade: null,
      observacao: null
    });
  });

  it("rejeita linha real sem descricao valida", () => {
    const parsed = manutencaoExecutadaSchema.safeParse({
      equipamentoId: UUID_EQUIPAMENTO,
      dataExecucao: "2026-08-07",
      tipoManutencao: "Revisao",
      descricaoServico: "Revisao geral",
      itensServicos: [
        {
          tipo: TipoItemManutencaoExecutada.PECA,
          descricao: "A",
          quantidade: 1
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});
