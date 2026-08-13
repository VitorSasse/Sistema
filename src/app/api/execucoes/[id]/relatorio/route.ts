import { renderToBuffer } from "@react-pdf/renderer";
import { performance } from "node:perf_hooks";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { measurePerformanceStep, recordPdfPerformanceMetric } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { buscarComparativoExecucao } from "@/server/services/execucoes/comparativo";
import { buscarExecucaoOperacional } from "@/server/services/execucoes/service";
import { resolveDocumentoCabecalhoPdf } from "@/server/pdf/documento-cabecalho";
import {
  ExecucaoResultadoPdfDocument,
  type ExecucaoRelatorioBoletim,
  type ExecucaoRelatorioEncargo,
  type ExecucaoRelatorioRecurso
} from "@/server/pdf/execucao-resultado-pdf";
import { resolveReportLogoSource } from "@/server/pdf/report-logo";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type JsonRecord = Record<string, unknown>;

type ExecucaoRelatorioData = {
  id: string;
  descricao?: string | null;
  status?: string | null;
  estadoEncargos?: string | null;
  orcamentoOrigem?: { codigo?: string | null; titulo?: string | null } | null;
  cliente?: { nome?: string | null; nomeFantasia?: string | null; codigo?: string | null } | null;
  obra?: { nome?: string | null; codigo?: string | null } | null;
  frentes?: Array<{
    nome?: string | null;
    unidade?: string | null;
  }>;
  boletins?: Array<{
    dataBoletim: Date;
    status: string;
    recursos?: unknown[];
  }>;
  resultados?: Array<{
    resultadoOperacionalJson?: JsonRecord | null;
    economiaJson?: JsonRecord | null;
  }>;
};

function normalizeFileSegment(value: string, fallback = "EXECUCAO") {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized || fallback;
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value: unknown) {
  return toNumberOrNull(value) ?? 0;
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? value as JsonRecord : {};
}

function latestResultado(execucao: ExecucaoRelatorioData) {
  const latest = execucao.resultados?.[0];
  const resultadoOperacionalJson = asRecord(latest?.resultadoOperacionalJson);
  const resultadoOperacional = asRecord(resultadoOperacionalJson.resultadoOperacional ?? resultadoOperacionalJson);
  const economiaJson = asRecord(latest?.economiaJson);
  const economia = asRecord(economiaJson.economia);

  return {
    resultadoOperacional,
    economia,
    dataCalculo: String(resultadoOperacionalJson.dataCalculo ?? economiaJson.dataCalculo ?? ""),
    versaoNucleo: String(resultadoOperacionalJson.versaoNucleo ?? economiaJson.versaoNucleo ?? ""),
    estadoConsolidacao: String(resultadoOperacionalJson.estadoConsolidacao ?? economiaJson.estadoConsolidacao ?? "")
  };
}

function extractRecursos(resultadoOperacional: JsonRecord): ExecucaoRelatorioRecurso[] {
  const unidades = Array.isArray(resultadoOperacional.unidades)
    ? resultadoOperacional.unidades as JsonRecord[]
    : [];

  return unidades.flatMap((unidade) => {
    const recursos = Array.isArray(unidade.recursos) ? unidade.recursos as JsonRecord[] : [];
    return recursos.map((recurso) => {
      const componentes = Array.isArray(recurso.componentesEconomicos)
        ? recurso.componentesEconomicos as JsonRecord[]
        : [];
      const material = componentes.find((item) => String(item.tipo ?? "") === "MATERIAL");

      return {
        id: String(recurso.id ?? recurso.recursoBoletimId ?? recurso.recursoRealizadoId ?? ""),
        recurso: String(recurso.nomeTecnico ?? recurso.nome ?? "Recurso nao informado"),
        quantidade: toNumberOrNull(recurso.quantidadeOperacional),
        unidade: String(recurso.unidadeQuantidadeOperacional ?? recurso.unidadeRealizada ?? ""),
        material: String(material?.nomeTecnico ?? recurso.materialDescricao ?? "") || null,
        baseEconomica: String(recurso.baseEconomica ?? ""),
        custoUnitario: toNumberOrNull(recurso.custoUnitario ?? recurso.valorCusto),
        unidadeCusto: String(recurso.unidadeCusto ?? recurso.unidadeCustoFormatada ?? ""),
        custoRealizado: toNumberOrNull(recurso.custoTotal)
      };
    });
  });
}

function extractEncargos(economia: JsonRecord): ExecucaoRelatorioEncargo[] {
  const encargos = Array.isArray(economia.encargos) ? economia.encargos as JsonRecord[] : [];
  return encargos.map((encargo) => ({
    descricao: String(encargo.descricao ?? encargo.tipo ?? "Encargo"),
    formaCalculo: String(encargo.formaCalculo ?? "-"),
    percentual: toNumberOrNull(encargo.percentual),
    valor: toNumberOrNull(encargo.valorCalculado ?? encargo.valor ?? encargo.valorInformado)
  }));
}

function extractPeriodo(boletins: ExecucaoRelatorioBoletim[]) {
  if (!boletins.length) return null;
  const sorted = [...boletins].sort((a, b) => a.data.getTime() - b.data.getTime());
  const format = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
  return `${format.format(sorted[0].data)} a ${format.format(sorted[sorted.length - 1].data)}`;
}

function buildFileName(execucao: ExecucaoRelatorioData) {
  const cliente = normalizeFileSegment(execucao.cliente?.nomeFantasia || execucao.cliente?.nome || "CLIENTE");
  const codigo = normalizeFileSegment(execucao.id.slice(0, 8), "EXECUCAO");
  return `EXECUCAO_RESULTADO_${codigo}_${cliente}.pdf`;
}

async function measurePdfStep<T>(
  stepName: string,
  metricName: "loadHeaderMs" | "loadDataMs",
  callback: () => Promise<T>
) {
  const start = performance.now();
  try {
    return await measurePerformanceStep(stepName, callback);
  } finally {
    recordPdfPerformanceMetric({ [metricName]: performance.now() - start });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/execucoes/[id]/relatorio", method: "GET" }, async () => {
    const requestStart = performance.now();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
    }

    const empresaId = getActiveTenantEmpresaId();
    if (!empresaId) {
      return NextResponse.json({ message: "Selecione uma empresa para gerar o relatorio." }, { status: 409 });
    }

    const { id } = await context.params;
    const [execucaoRaw, cabecalho, comparativo] = await Promise.all([
      measurePdfStep("loadExecucaoResultadoMs", "loadDataMs", () => buscarExecucaoOperacional(prisma, id)),
      measurePdfStep("loadHeaderMs", "loadHeaderMs", () => resolveDocumentoCabecalhoPdf(prisma, empresaId, "RELATORIO")),
      buscarComparativoExecucao(prisma, id)
    ]);

    if (!execucaoRaw) {
      return NextResponse.json({ message: "Execucao nao encontrada." }, { status: 404 });
    }

    const execucao = execucaoRaw as ExecucaoRelatorioData;
    const latest = latestResultado(execucao);
    const recursos = extractRecursos(latest.resultadoOperacional);
    const encargos = extractEncargos(latest.economia);
    const boletins: ExecucaoRelatorioBoletim[] = (execucao.boletins ?? []).map((boletim) => ({
      data: new Date(boletim.dataBoletim),
      status: boletim.status,
      recursosCount: boletim.recursos?.length ?? 0
    }));

    const renderStart = performance.now();
    const buffer = await measurePerformanceStep("renderPdfMs", () => renderToBuffer(
      ExecucaoResultadoPdfDocument({
        logoPath: resolveReportLogoSource(cabecalho.logoUrl),
        empresaRelatorio: cabecalho.empresaRelatorio,
        emitidoEm: new Date(),
        identificacao: {
          empresa: cabecalho.empresaRelatorio.nome,
          cliente: execucao.cliente?.nomeFantasia || execucao.cliente?.nome || null,
          obra: execucao.obra?.nome ?? null,
          servico: execucao.frentes?.[0]?.nome ?? null,
          descricao: execucao.descricao ?? null,
          situacao: execucao.status ?? null,
          periodo: extractPeriodo(boletins),
          referenciaOrcamento: execucao.orcamentoOrigem?.codigo ?? null
        },
        resumo: {
          receita: toNumberOrNull(latest.economia.receita),
          custoOperacional: toNumberOrNull(asRecord(latest.resultadoOperacional.consolidado).custoOperacionalTotal),
          encargos: toNumberOrNull(latest.economia.encargosEconomicos),
          custoTotalExecucao: toNumberOrNull(latest.economia.custoTotalExecucao ?? asRecord(latest.resultadoOperacional.consolidado).custoOperacionalTotal),
          resultado: toNumberOrNull(latest.economia.resultado),
          margemPercentual: toNumberOrNull(latest.economia.margemPercentual),
          statusEncargos: String(latest.economia.statusEncargos ?? execucao.estadoEncargos ?? "SEM_ENCARGOS")
        },
        recursos,
        encargos,
        boletins,
        comparativo: comparativo.referenciaDisponivel
          ? comparativo.frentes.map((frente) => ({
            frente: frente.nome,
            unidade: frente.unidade,
            quantidade: frente.quantidade,
            receita: frente.receita,
            custo: frente.custo,
            resultado: frente.resultado,
            margem: frente.margem
          }))
          : [],
        resultadoProvisorio: latest.estadoConsolidacao === "PROVISORIO" || boletins.some((boletim) => boletim.status === "ABERTO"),
        dataCalculo: latest.dataCalculo || null,
        versaoNucleo: latest.versaoNucleo || null
      })
    ));
    recordPdfPerformanceMetric({ renderPdfMs: performance.now() - renderStart, pdfSizeBytes: buffer.length });
    recordPdfPerformanceMetric({ totalDurationMs: performance.now() - requestStart });

    const fileName = buildFileName(execucao);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store"
      }
    });
  });
}
