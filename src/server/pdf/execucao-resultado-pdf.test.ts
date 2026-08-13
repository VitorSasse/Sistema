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

  it("renderiza comparativo e resumo de desvios operacionais para execucao vinculada", async () => {
    const buffer = await renderToBuffer(ExecucaoResultadoPdfDocument({
      ...baseProps,
      identificacao: {
        ...baseProps.identificacao,
        referenciaOrcamento: "ORC-TESTE"
      },
      comparativo: [
        {
          frente: "Frente com referencia",
          unidade: "m3",
          quantidade: { previsto: 100, realizado: 110, desvioAbsoluto: 10, desvioPercentual: 10 },
          receita: { previsto: 10000, realizado: 10000, desvioAbsoluto: 0, desvioPercentual: 0 },
          custo: { previsto: 5000, realizado: 6200, desvioAbsoluto: 1200, desvioPercentual: 24 },
          resultado: { previsto: 5000, realizado: 3800, desvioAbsoluto: -1200, desvioPercentual: -24 },
          margem: { previsto: 50, realizado: 38, desvioAbsoluto: -12, desvioPercentual: -24 },
          desviosOperacionais: [
            {
              recurso: "Recurso comparado",
              status: "CORRESPONDENTE",
              unidade: "h",
              quantidade: { previsto: 8, realizado: 12, desvioAbsoluto: 4, desvioPercentual: 50 },
              custo: { previsto: 800, realizado: 1200, desvioAbsoluto: 400, desvioPercentual: 50 }
            },
            {
              recurso: "Recurso nao previsto",
              status: "SOMENTE_REALIZADO",
              unidade: "km",
              quantidade: { previsto: null, realizado: 20, desvioAbsoluto: null, desvioPercentual: null },
              custo: { previsto: null, realizado: 300, desvioAbsoluto: null, desvioPercentual: null }
            }
          ]
        }
      ]
    }));

    expect(buffer.length).toBeGreaterThan(1000);
  });
});
