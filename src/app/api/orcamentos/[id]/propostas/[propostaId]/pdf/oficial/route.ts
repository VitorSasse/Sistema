import { performance } from "node:perf_hooks";
import { StatusPropostaComercial } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { measurePerformanceStep, recordPdfPerformanceMetric } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { getOfficialProposalPdfStorage } from "@/server/pdf/orcamento-proposta-official-storage";
import { renderOrcamentoPropostaPdf } from "@/server/pdf/orcamento-proposta-renderer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; propostaId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos/[id]/propostas/[propostaId]/pdf/oficial", method: "GET" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para visualizar o PDF oficial." }, { status: 409 });
  }

  const { id, propostaId } = await context.params;
  const lookupStart = performance.now();
  const proposta = await measurePerformanceStep("lookupOfficialPdfMs", () => prisma.orcamentoPropostaComercial.findFirst({
    where: {
      id: propostaId,
      orcamentoId: id,
      empresaId
    },
    select: {
      status: true,
      codigo: true,
      pdfOficialUrl: true,
      pdfOficialNome: true
    }
  }));
  recordPdfPerformanceMetric({ lookupOfficialPdfMs: performance.now() - lookupStart });

  if (!proposta) {
    return NextResponse.json({ message: "Proposta nao encontrada." }, { status: 404 });
  }

  if (proposta.status !== StatusPropostaComercial.EMITIDA && proposta.status !== StatusPropostaComercial.REJEITADA && proposta.status !== StatusPropostaComercial.CANCELADA) {
    recordPdfPerformanceMetric({ fallbackReason: "not_emitted" });
    return NextResponse.json({ message: "Esta proposta ainda nao possui PDF oficial." }, { status: 409 });
  }

  const pdfOficialUrl = proposta.pdfOficialUrl;

  if (pdfOficialUrl) {
    try {
      const readStart = performance.now();
      const storage = getOfficialProposalPdfStorage();
      const file = await measurePerformanceStep("readOfficialPdfMs", () => storage.read(pdfOficialUrl));

      if (file) {
        recordPdfPerformanceMetric({
          readOfficialPdfMs: performance.now() - readStart,
          pdfSizeBytes: file.length,
          fallbackReason: "not_needed"
        });
        const fileName = proposta.pdfOficialNome ?? `${proposta.codigo}.pdf`;

        return new NextResponse(new Uint8Array(file), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            "Cache-Control": "private, max-age=300"
          }
        });
      }

      recordPdfPerformanceMetric({
        readOfficialPdfMs: performance.now() - readStart,
        fallbackReason: "unsupported_url"
      });
    } catch {
      recordPdfPerformanceMetric({ fallbackReason: "read_error" });
    }
  } else {
    recordPdfPerformanceMetric({ fallbackReason: "missing_url" });
  }

  try {
    const renderStart = performance.now();
    const { buffer, fileName } = await measurePerformanceStep("fallbackRenderMs", () => renderOrcamentoPropostaPdf({
      db: prisma,
      orcamentoId: id,
      empresaId,
      propostaId,
      modo: "OFICIAL"
    }));
    const fallbackRenderMs = performance.now() - renderStart;
    recordPdfPerformanceMetric({ renderPdfMs: fallbackRenderMs, fallbackRenderMs, pdfSizeBytes: buffer.length });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel abrir o PDF oficial da proposta.", detail: String(error) },
      { status: 500 }
    );
  }
  });
}
