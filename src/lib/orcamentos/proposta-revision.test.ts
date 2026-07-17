import { describe, expect, it } from "vitest";
import {
  criarNovaRevisaoProposta,
  type PropostaRevisionDraft
} from "@/lib/orcamentos/proposta-revision";

function proposta(overrides: Partial<PropostaRevisionDraft> = {}): PropostaRevisionDraft {
  return {
    localId: "proposta-emitida",
    cenarioTempId: "cenario-principal",
    codigo: "PROP-001",
    revisao: "0",
    titulo: "Proposta de terraplenagem",
    status: "EMITIDA",
    modoExibicaoValoresPdf: "SOMENTE_TOTAL_GLOBAL",
    condicoesComerciais: "Pagamento em 30 dias.",
    observacao: "Documento original.",
    opcionais: [
      {
        localId: "opcional-original",
        ordem: 1,
        codigo: "OP-01",
        descricao: "Mobilizacao adicional",
        unidade: "UN",
        quantidade: "1",
        valorUnitario: "2500",
        condicoes: "Sob demanda.",
        observacao: ""
      }
    ],
    ...overrides
  };
}

describe("criacao de revisao de proposta comercial", () => {
  it("copia apenas metadados comerciais e cria novos identificadores", () => {
    const emitida = proposta();
    const revisao = criarNovaRevisaoProposta({
      propostaEmitida: emitida,
      propostasExistentes: [emitida],
      criarPropostaId: () => "proposta-revisao",
      criarOpcionalId: () => "opcional-revisao"
    });

    expect(revisao).toMatchObject({
      localId: "proposta-revisao",
      cenarioTempId: "cenario-principal",
      codigo: "PROP-001",
      revisao: "1",
      titulo: emitida.titulo,
      status: "RASCUNHO",
      condicoesComerciais: emitida.condicoesComerciais,
      observacao: emitida.observacao
    });
    expect(revisao.opcionais[0].localId).toBe("opcional-revisao");
    expect(revisao.opcionais[0]).not.toBe(emitida.opcionais[0]);
  });

  it("usa a maior revisao existente do mesmo codigo", () => {
    const emitida = proposta({ revisao: "1" });
    const revisao = criarNovaRevisaoProposta({
      propostaEmitida: emitida,
      propostasExistentes: [
        proposta({ revisao: "0" }),
        emitida,
        proposta({ localId: "outra", codigo: "PROP-002", revisao: "8" })
      ],
      criarPropostaId: () => "proposta-revisao-2",
      criarOpcionalId: () => "opcional-revisao-2"
    });

    expect(revisao.codigo).toBe("PROP-001");
    expect(revisao.revisao).toBe("2");
  });
});
