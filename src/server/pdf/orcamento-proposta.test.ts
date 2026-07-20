import { renderToBuffer } from "@react-pdf/renderer";
import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { OrcamentoPdfDocument } from "@/server/pdf/orcamento-pdf";
import {
  formatarUnidadeComercial,
  montarFrentesComerciais,
  resolverValorGlobalProposta,
  selecionarItensComerciais
} from "@/server/pdf/orcamento-proposta";
import { buildOrcamentoPropostaFileName } from "@/server/pdf/orcamento-proposta-renderer";

function collectPdfText(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectPdfText);
  }

  if (isValidElement(node)) {
    return collectPdfText((node.props as { children?: ReactNode }).children);
  }

  return [];
}

describe("conteudo comercial do PDF de orcamentos", () => {
  it("remove recursos internos e itens zerados, mantendo servicos e materiais comerciais", () => {
    const selecionados = selecionarItensComerciais([
      { ordem: 1, tipoItem: "SERVICO_PRINCIPAL", descricao: "Escavacao", unidade: "m3", quantidade: 100, valorTotal: 15000 },
      { ordem: 2, tipoItem: "RECURSO", descricao: "Escavadeira", unidade: "UN", quantidade: 1, valorTotal: 0 },
      { ordem: 3, tipoItem: "MATERIAL", descricao: "Material", unidade: "UN", quantidade: 1, valorTotal: 500 },
      { ordem: 4, tipoItem: "OUTRO", descricao: "MTR", unidade: "m3", quantidade: 100, valorTotal: 700 },
      { ordem: 5, tipoItem: "COMERCIAL", descricao: "Item zerado", unidade: "UN", quantidade: 1, valorTotal: 0 }
    ]);

    expect(selecionados).toEqual([
      expect.objectContaining({ tipoItem: "SERVICO_PRINCIPAL", descricao: "Escavacao" }),
      expect.objectContaining({ tipoItem: "MATERIAL", descricao: "Material" })
    ]);
  });

  it("preserva frentes globais com unidades diferentes sem converter meses em dias", () => {
    const frentes = montarFrentesComerciais(
      [
        { ordem: 1, nome: "Escavacao de Terraplenagem", descricao: "Escavacao e transporte", unidadeProducao: "m3", quantidadePrevista: 5560.66 },
        { ordem: 2, nome: "Escavacao de Parede Diafragma", descricao: "Escavacao e destinacao", unidadeProducao: "m3", quantidadePrevista: 529.62 },
        { ordem: 3, nome: "Escavacao de Blocos e Vigas Baldrame", descricao: "Escavacao de blocos", unidadeProducao: "m3", quantidadePrevista: 706.16 },
        { ordem: 4, nome: "Escavacao de Fundacoes", descricao: "Escavacao de fundacoes", unidadeProducao: "m3", quantidadePrevista: 2846.48 },
        { ordem: 5, nome: "Escavacao de Cisternas", descricao: "Escavacao de cisternas", unidadeProducao: "m3", quantidadePrevista: 17.48 },
        { ordem: 6, nome: "Apoio Operacional - Escavadeira 15 t", descricao: null, unidadeProducao: "mes", quantidadePrevista: 3.2 },
        { ordem: 7, nome: "Apoio Operacional - Mini Escavadeira 5,5 t", descricao: null, unidadeProducao: "mes", quantidadePrevista: 2 }
      ],
      []
    );

    expect(frentes).toHaveLength(7);
    expect(frentes[0]).toMatchObject({ quantidadePrevista: 5560.66, unidadeProducao: "m3" });
    expect(frentes[5]).toMatchObject({ quantidadePrevista: 3.2, unidadeProducao: "mes" });
    expect(frentes[6]).toMatchObject({ quantidadePrevista: 2, unidadeProducao: "mes" });
    expect(formatarUnidadeComercial(frentes[0].unidadeProducao, frentes[0].quantidadePrevista)).toBe("m³");
    expect(formatarUnidadeComercial(frentes[5].unidadeProducao, frentes[5].quantidadePrevista)).toBe("meses");
    expect(formatarUnidadeComercial(frentes[6].unidadeProducao, frentes[6].quantidadePrevista)).toBe("meses");
  });

  it("usa o valor final congelado no snapshot como unico valor global", () => {
    expect(
      resolverValorGlobalProposta({
        snapshotValorTotal: 166603.69,
        propostaValorTotal: 166603.69,
        orcamentoValorTotal: 253647.65
      })
    ).toBe(166603.69);
  });

  it("gera nome padronizado para download da proposta", () => {
    expect(
      buildOrcamentoPropostaFileName({
        codigo: "PROP-002",
        revisao: 1,
        clienteNome: "L. Flex Industria e Comercio LTDA",
        obraNome: "Aterro Lot Business Park"
      })
    ).toBe("PROPOSTA_COMERCIAL_PROP_002_REV-01_L_FLEX_INDUSTRIA_E_COMERCIO_LTDA_ATERRO_LOT_BUSINESS_PARK.pdf");
  });

  it("renderiza proposta operacional global com frentes em m3 e mes", async () => {
    const buffer = await renderToBuffer(
      OrcamentoPdfDocument({
        codigo: "PROP-001",
        revisao: 0,
        dataEmissao: new Date("2026-07-13T14:01:54.418Z"),
        tipo: "OPERACIONAL",
        status: "PROPOSTA_EMITIDA",
        dataOrcamento: new Date("2026-07-13T12:00:00.000Z"),
        validadeAte: null,
        titulo: "Proposta operacional global",
        objeto: "Execucao dos servicos de terraplenagem.",
        observacaoCliente: null,
        valorTotal: 166603.69,
        cliente: { nome: "Cliente teste" },
        obra: { nome: "Obra teste" },
        responsavel: null,
        frentes: [
          { ordem: 1, nome: "Escavacao", descricao: "Escavacao e transporte", unidadeProducao: "m3", quantidadePrevista: 5560.66 },
          { ordem: 2, nome: "Apoio operacional", descricao: null, unidadeProducao: "mes", quantidadePrevista: 3.2 }
        ],
        itens: [],
        premissas: [
          { tipo: "CONDICAO", ordem: 1, titulo: "Pagamento", descricao: "Conforme contrato." }
        ]
      })
    );

    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("posiciona o total da proposta logo apos as frentes e antes das premissas comerciais", () => {
    const document = OrcamentoPdfDocument({
      codigo: "PROP-001",
      revisao: 0,
      dataEmissao: new Date("2026-07-17T12:00:00.000Z"),
      tipo: "OPERACIONAL",
      status: "RASCUNHO",
      dataOrcamento: new Date("2026-07-17T12:00:00.000Z"),
      validadeAte: null,
      titulo: "Proposta operacional global",
      objeto: "Execucao dos servicos.",
      observacaoCliente: null,
      valorTotal: 12000,
      cliente: { nome: "Cliente teste" },
      obra: { nome: "Obra teste" },
      responsavel: null,
      frentes: [
        { ordem: 1, nome: "Frente principal", descricao: "Servico principal", unidadeProducao: "m3", quantidadePrevista: 100 }
      ],
      itens: [],
      premissas: [
        { tipo: "PREMISSA", ordem: 1, titulo: "Premissa operacional", descricao: "Premissa apos o total." }
      ]
    });

    const texto = collectPdfText(document).join("\n");
    const posicaoFrentes = texto.indexOf("FRENTES DE SERVICO");
    const posicaoTotal = texto.indexOf("TOTAL DA PROPOSTA");
    const posicaoPremissas = texto.indexOf("PREMISSAS TECNICAS");

    expect(posicaoFrentes).toBeGreaterThanOrEqual(0);
    expect(posicaoTotal).toBeGreaterThan(posicaoFrentes);
    expect(posicaoPremissas).toBeGreaterThan(posicaoTotal);
  });

  it("renderiza previa de proposta com modo de rascunho", async () => {
    const buffer = await renderToBuffer(
      OrcamentoPdfDocument({
        codigo: "PROP-001",
        revisao: 1,
        dataEmissao: new Date("2026-07-17T12:00:00.000Z"),
        modoDocumento: "PREVIEW",
        tipo: "OPERACIONAL",
        status: "RASCUNHO",
        dataOrcamento: new Date("2026-07-17T12:00:00.000Z"),
        validadeAte: null,
        titulo: "Previa de proposta",
        objeto: "Execucao dos servicos.",
        observacaoCliente: null,
        valorTotal: 12000,
        cliente: { nome: "Cliente teste" },
        obra: { nome: "Obra teste" },
        responsavel: null,
        frentes: [
          { ordem: 1, nome: "Frente principal", descricao: "Servico principal", unidadeProducao: "m3", quantidadePrevista: 100 }
        ],
        itens: [],
        premissas: []
      })
    );

    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("renderiza proposta detalhada por item e frente", async () => {
    const buffer = await renderToBuffer(
      OrcamentoPdfDocument({
        codigo: "PROP-002",
        revisao: 0,
        dataEmissao: new Date("2026-07-17T12:00:00.000Z"),
        modoExibicaoValoresPdf: "DETALHADO_POR_ITEM_E_FRENTE",
        tipo: "OPERACIONAL",
        status: "RASCUNHO",
        dataOrcamento: new Date("2026-07-17T12:00:00.000Z"),
        validadeAte: null,
        titulo: "Proposta detalhada",
        objeto: "Execucao dos servicos.",
        observacaoCliente: null,
        valorTotal: 15000,
        cliente: { nome: "Cliente teste" },
        obra: { nome: "Obra teste" },
        responsavel: null,
        frentes: [
          { ordem: 1, nome: "Escavacao", descricao: "Servico principal", unidadeProducao: "m3", quantidadePrevista: 100 }
        ],
        itens: [
          {
            ordem: 1,
            frenteNome: "Escavacao",
            tipoItem: "SERVICO_PRINCIPAL",
            codigo: null,
            descricao: "Escavacao mecanizada",
            unidade: "m3",
            quantidade: 100,
            valorUnitario: 150,
            valorTotal: 15000
          }
        ],
        premissas: []
      })
    );

    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
