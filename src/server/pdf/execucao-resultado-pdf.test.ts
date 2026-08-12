import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { ExecucaoResultadoPdfDocument } from "@/server/pdf/execucao-resultado-pdf";

const baseProps = {
  emitidoEm: new Date("2026-08-12T12:00:00.000Z"),
  identificacao: {
    empresa: "Empresa teste",
    cliente: "Cliente teste",
    obra: "Obra teste",
    servico: "Frente teste",
    descricao: "Execucao consolidada",
    situacao: "EM_ANDAMENTO",
    periodo: "01/08/2026 a 02/08/2026"
  },
  resumo: {
    receita: 18000,
    custoOperacional: 7500,
    encargos: null,
    custoTotalExecucao: 7500,
    resultado: 10500,
    margemPercentual: 58.33,
    statusEncargos: "SEM_ENCARGOS"
  },
  recursos: [
    {
      id: "recurso-1",
      recurso: "Recurso complementar",
      quantidade: 5,
      unidade: "viagem",
      material: null,
      baseEconomica: "KM",
      custoUnitario: 8,
      unidadeCusto: "R$/km",
      custoRealizado: 420
    }
  ],
  encargos: [],
  boletins: [
    {
      data: new Date("2026-08-01T00:00:00.000Z"),
      status: "FECHADO",
      recursosCount: 1
    }
  ],
  dataCalculo: "2026-08-12T11:00:00.000Z",
  versaoNucleo: "teste"
};

describe("PDF de Execucao e Resultado", () => {
  it("renderiza relatorio sem encargos a partir de snapshot informado", async () => {
    const buffer = await renderToBuffer(ExecucaoResultadoPdfDocument(baseProps));

    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("renderiza composicao de encargos quando informada", async () => {
    const buffer = await renderToBuffer(ExecucaoResultadoPdfDocument({
      ...baseProps,
      resumo: {
        ...baseProps.resumo,
        encargos: 900,
        custoTotalExecucao: 8400,
        resultado: 9600,
        statusEncargos: "COM_ENCARGOS"
      },
      encargos: [
        {
          descricao: "Encargo operacional",
          formaCalculo: "PERCENTUAL_SOBRE_RECEITA",
          percentual: 5,
          valor: 900
        }
      ]
    }));

    expect(buffer.length).toBeGreaterThan(1000);
  });
});
