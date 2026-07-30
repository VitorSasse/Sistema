import { NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { auth } from "@/lib/auth";
import { measurePerformanceStep, recordPdfPerformanceMetric } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { renderOrcamentoPropostaPdf } from "@/server/pdf/orcamento-proposta-renderer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function handlePdfError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "ORCAMENTO_NAO_ENCONTRADO") {
      return NextResponse.json({ message: "Orcamento nao encontrado." }, { status: 404 });
    }

    if (error.message === "PROPOSTA_NAO_PREPARADA") {
      return NextResponse.json(
        { message: "Prepare uma proposta comercial antes de gerar o PDF." },
        { status: 400 }
      );
    }

    if (error.message === "PROPOSTA_SEM_ESCOPO_COMERCIAL") {
      return NextResponse.json(
        { message: "Inclua pelo menos uma frente ou item comercial antes de gerar a proposta em PDF." },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(
    { message: "Nao foi possivel gerar o PDF da proposta.", detail: String(error) },
    { status: 500 }
  );
}

export async function GET(request: Request, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos/[id]/pdf", method: "GET" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para gerar o PDF." }, { status: 409 });
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const propostaId = url.searchParams.get("propostaId");

  try {
    const renderStart = performance.now();
    const { buffer, fileName } = await measurePerformanceStep("renderPdf", () => renderOrcamentoPropostaPdf({
      db: prisma,
      orcamentoId: id,
      empresaId,
      propostaId,
      modo: "PREVIEW"
    }));
    recordPdfPerformanceMetric({ renderPdfMs: performance.now() - renderStart, pdfSizeBytes: buffer.length });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return handlePdfError(error);
  }
  });
}
