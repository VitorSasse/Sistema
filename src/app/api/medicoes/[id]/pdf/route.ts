import { renderToBuffer } from "@react-pdf/renderer";
import { performance } from "node:perf_hooks";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { measurePerformanceStep, recordPdfPerformanceMetric } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { resolveDocumentoCabecalhoPdf } from "@/server/pdf/documento-cabecalho";
import { MedicaoPdfDocument, type MedicaoPdfTipo } from "@/server/pdf/medicao-pdf";
import { resolveReportLogoSource } from "@/server/pdf/report-logo";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeFileSegment(value: string, maxLength = 32) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  if (!normalized) {
    return "SEM OBRA";
  }

  return normalized.slice(0, maxLength).replace(/_+$/g, "") || "SEM OBRA";
}

function formatPeriodSegment(value: Date) {
  const months = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ"
  ];

  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()] ?? "MES";
  return `${day}${month}`;
}

function buildPdfFilename(params: {
  codigoMedicao: string;
  obraNome: string | null;
  periodoInicial: Date;
  periodoFinal: Date;
  tipoRelatorio: MedicaoPdfTipo;
}) {
  const obra = normalizeFileSegment(params.obraNome ?? "SEM OBRA", 42);
  const codigo = params.codigoMedicao.toUpperCase();
  const periodoInicial = formatPeriodSegment(params.periodoInicial);
  const periodoFinal = formatPeriodSegment(params.periodoFinal);
  const suffix = params.tipoRelatorio === "RESUMIDO" ? "_RESUMIDO" : "";
  return `${codigo}_${obra}_${periodoInicial}_a_${periodoFinal}${suffix}.pdf`;
}

async function measurePdfStep<T>(
  stepName: string,
  metricName: "loadHeaderMs" | "loadMedicaoMs",
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
  return withPerformanceMonitoring(request, { route: "/api/medicoes/[id]/pdf", method: "GET" }, async () => {
  const requestStart = performance.now();
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para gerar o PDF." }, { status: 409 });
  }

  const [medicao, cabecalho] = await Promise.all([
    measurePdfStep("loadMedicaoMs", "loadMedicaoMs", () => prisma.medicao.findFirst({
      where: {
        id,
        empresaId,
        deletedAt: null
      },
      select: {
        codigoMedicao: true,
        tipoMedicao: true,
        periodoInicial: true,
        periodoFinal: true,
        status: true,
        observacao: true,
        descontoValor: true,
        permutaPercentual: true,
        cliente: {
          select: {
            nome: true
          }
        },
        obra: {
          select: {
            nome: true
          }
        },
        itens: {
          where: {
            empresaId,
            deletedAt: null
          },
          orderBy: [{ data: "asc" }, { createdAt: "asc" }],
          select: {
            data: true,
            ficha: true,
            placaOuTag: true,
            tipoServico: true,
            material: true,
            unidadeFaturada: true,
            quantidadeFaturada: true,
            valorUnitario: true,
            valorTotalItem: true
          }
        }
      }
    })),
    measurePdfStep("loadHeaderMs", "loadHeaderMs", () => resolveDocumentoCabecalhoPdf(prisma, empresaId, "MEDICAO"))
  ]);

  if (!medicao) {
    return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
  }

  if (medicao.itens.length === 0) {
    return NextResponse.json({ message: "Medicao sem itens para relatorio." }, { status: 400 });
  }

  if (medicao.itens.some((item) => Number(item.valorUnitario) < 0)) {
    return NextResponse.json(
      { message: "Nao e permitido gerar PDF com item de valor unitario negativo." },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const rawTipo = (url.searchParams.get("tipo") ?? "DETALHADO").toUpperCase();
  const tipoRelatorio: MedicaoPdfTipo =
    rawTipo === "RESUMIDO" ? "RESUMIDO" : "DETALHADO";
  const filename = buildPdfFilename({
    codigoMedicao: medicao.codigoMedicao,
    obraNome: medicao.obra?.nome ?? null,
    periodoInicial: medicao.periodoInicial,
    periodoFinal: medicao.periodoFinal,
    tipoRelatorio
  });

  const prepareStart = performance.now();
  const medicaoPdfItens = medicao.itens.map((item) => ({
    ...item,
    quantidadeFaturada: Number(item.quantidadeFaturada),
    valorUnitario: Number(item.valorUnitario),
    valorTotalItem: Number(item.valorTotalItem)
  }));
  recordPdfPerformanceMetric({
    loadDataMs: prepareStart - requestStart,
    prepareMedicaoDataMs: performance.now() - prepareStart,
    medicaoItemsCount: medicao.itens.length
  });

  const renderStart = performance.now();
  const buffer = await measurePerformanceStep("renderPdfMs", () => renderToBuffer(
    MedicaoPdfDocument({
      logoPath: resolveReportLogoSource(cabecalho.logoUrl),
      codigoMedicao: medicao.codigoMedicao,
      tipoMedicao: medicao.tipoMedicao,
      clienteNome: medicao.cliente.nome,
      obraNome: medicao.obra?.nome ?? null,
      periodoInicial: medicao.periodoInicial,
      periodoFinal: medicao.periodoFinal,
      status: medicao.status,
      observacao: medicao.observacao,
      descontoValor: Number(medicao.descontoValor ?? 0),
      permutaPercentual: Number(medicao.permutaPercentual ?? 0),
      tipoRelatorio,
      itens: medicaoPdfItens
    })
  ));
  recordPdfPerformanceMetric({ renderPdfMs: performance.now() - renderStart, pdfSizeBytes: buffer.length });
  recordPdfPerformanceMetric({ totalDurationMs: performance.now() - requestStart });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store"
    }
  });
  });
}
