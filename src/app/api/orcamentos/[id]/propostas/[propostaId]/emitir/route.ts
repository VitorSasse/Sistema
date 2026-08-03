import { createHash } from "crypto";
import { performance } from "node:perf_hooks";
import { StatusPropostaComercial } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { validateApiPermission } from "@/lib/auth-guards";
import { measurePerformanceStep, recordPdfPerformanceMetric } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { buscarOrcamento } from "@/server/services/orcamentos/service";
import { resolveDocumentoCabecalhoPdf } from "@/server/pdf/documento-cabecalho";
import {
  getOfficialProposalPdfStorage,
  OfficialProposalPdfStorageUnavailableError
} from "@/server/pdf/orcamento-proposta-official-storage";
import { renderOrcamentoPropostaPdfFromData } from "@/server/pdf/orcamento-proposta-renderer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; propostaId: string }>;
};

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/orcamentos/[id]/propostas/[propostaId]/emitir", method: "POST" }, async () => {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const empresaId = requireActiveTenantEmpresaId();
  const { id, propostaId } = await context.params;
  const [orcamento, cabecalho] = await Promise.all([
    measurePerformanceStep("loadProposalDataMs", () => buscarOrcamento(prisma, id)),
    measurePerformanceStep("resolveHeaderMs", () =>
      resolveDocumentoCabecalhoPdf(prisma, empresaId, "ORCAMENTO")
    )
  ]);

  const proposta = orcamento?.propostas.find((item) => item.id === propostaId) ?? null;
  if (!orcamento || !proposta) {
    return NextResponse.json({ message: "Proposta nao encontrada." }, { status: 404 });
  }

  if (proposta.status !== StatusPropostaComercial.RASCUNHO) {
    return NextResponse.json(
      { message: "Esta proposta ja foi emitida ou nao pode ser emitida neste status." },
      { status: 409 }
    );
  }

  if (!proposta.snapshotJson) {
    return NextResponse.json(
      { message: "Salve o orcamento antes de emitir para congelar o snapshot comercial." },
      { status: 409 }
    );
  }

  let buffer: Buffer;
  let fileName: string;
  const emitidaEm = new Date();
  const renderStart = performance.now();

  try {
    const rendered = await measurePerformanceStep("renderPdfMs", () => renderOrcamentoPropostaPdfFromData({
      orcamento,
      cabecalho,
      propostaId,
      modo: "OFICIAL",
      dataDocumento: emitidaEm
    }));

    buffer = rendered.buffer;
    fileName = rendered.fileName;
    recordPdfPerformanceMetric({ renderPdfMs: performance.now() - renderStart, pdfSizeBytes: buffer.length });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel gerar o PDF oficial da proposta.", detail: String(error) },
      { status: 500 }
    );
  }

  const hash = createHash("sha256").update(buffer).digest("hex");
  const apiPublicUrl = `/api/orcamentos/${id}/propostas/${propostaId}/pdf/oficial`;
  let publicUrl = apiPublicUrl;

  try {
    const persistStart = performance.now();
    const storage = getOfficialProposalPdfStorage();
    const persisted = await measurePerformanceStep("persistPdfMs", () =>
      storage.save({
        empresaId,
        orcamentoId: id,
        propostaId,
        fileName,
        buffer
      })
    );
    publicUrl = persisted.publicUrl;
    recordPdfPerformanceMetric({
      persistPdfMs: performance.now() - persistStart,
      pdfSizeBytes: persisted.sizeBytes
    });
  } catch (error) {
    recordPdfPerformanceMetric({
      fallbackReason:
        error instanceof OfficialProposalPdfStorageUnavailableError ? "storage_unavailable" : "persist_error"
    });
  }

  const updateProposalStart = performance.now();
  const proposalUpdateData = {
    status: StatusPropostaComercial.EMITIDA,
    emitidaEm,
    emitidaPorId: permission.session.user.id,
    pdfOficialUrl: publicUrl,
    pdfOficialNome: sanitizeFileName(fileName),
    pdfOficialHash: hash,
    pdfOficialMime: "application/pdf",
    pdfOficialTamanhoBytes: buffer.length
  };
  const updated = await measurePerformanceStep("updateProposalMs", () => prisma.orcamentoPropostaComercial.updateMany({
    where: {
      id: propostaId,
      orcamentoId: id,
      empresaId,
      status: StatusPropostaComercial.RASCUNHO
    },
    data: proposalUpdateData
  }));
  recordPdfPerformanceMetric({ updateProposalMs: performance.now() - updateProposalStart });

  if (updated.count === 0) {
    return NextResponse.json(
      { message: "Esta proposta ja foi emitida por outro usuario. Recarregue a tela." },
      { status: 409 }
    );
  }

  const orcamentoAtualizado = {
    ...orcamento,
    propostas: orcamento.propostas.map((item) =>
      item.id === propostaId
        ? {
            ...item,
            ...proposalUpdateData
          }
        : item
    )
  };

  return NextResponse.json({
    message: "Proposta emitida com sucesso.",
    pdfOficialUrl: apiPublicUrl,
    orcamento: orcamentoAtualizado
  });
  });
}
