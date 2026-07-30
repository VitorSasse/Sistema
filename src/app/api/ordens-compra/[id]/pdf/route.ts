import { renderToBuffer } from "@react-pdf/renderer";
import { performance } from "node:perf_hooks";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { measurePerformanceStep, recordPdfPerformanceMetric } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { resolveDocumentoCabecalhoPdf } from "@/server/pdf/documento-cabecalho";
import { OrdemCompraPdfDocument } from "@/server/pdf/ordem-compra-pdf";
import { resolveReportLogoSource } from "@/server/pdf/report-logo";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeFileSegment(value: string, maxLength = 36) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized.slice(0, maxLength) || "SEM_FORNECEDOR";
}

export async function GET(request: Request, context: RouteContext) {
  return withPerformanceMonitoring(request, { route: "/api/ordens-compra/[id]/pdf", method: "GET" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para gerar o PDF." }, { status: 409 });
  }

  const loadDataStart = performance.now();
  const [ordemCompra, cabecalho] = await measurePerformanceStep("loadData", () => Promise.all([
    prisma.ordemCompra.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        planoConta: true,
        itens: {
          orderBy: [{ createdAt: "asc" }]
        },
        parcelas: {
          orderBy: [{ numeroParcela: "asc" }]
        }
      }
    }),
    resolveDocumentoCabecalhoPdf(prisma, empresaId, "ORDEM_COMPRA")
  ]));
  recordPdfPerformanceMetric({ loadDataMs: performance.now() - loadDataStart });

  if (!ordemCompra) {
    return NextResponse.json({ message: "Ordem de compra nao encontrada." }, { status: 404 });
  }

  const fileName = `${ordemCompra.numeroOrdem}_${normalizeFileSegment(ordemCompra.fornecedor.razaoSocial)}.pdf`;
  const renderStart = performance.now();
  const buffer = await measurePerformanceStep("renderPdf", () => renderToBuffer(
    OrdemCompraPdfDocument({
      numeroOrdem: ordemCompra.numeroOrdem,
      dataEmissao: ordemCompra.dataEmissao,
      status: ordemCompra.status,
      tipoCompra: ordemCompra.tipoCompra,
      numeroNotaFiscal: ordemCompra.numeroNotaFiscal,
      fornecedor: {
        codigo: ordemCompra.fornecedor.codigo,
        razaoSocial: ordemCompra.fornecedor.razaoSocial,
        nomeFantasia: ordemCompra.fornecedor.nomeFantasia,
        cnpj: ordemCompra.fornecedor.cnpj,
        enderecoLinha1: ordemCompra.fornecedor.enderecoLinha1,
        enderecoNumero: ordemCompra.fornecedor.enderecoNumero,
        enderecoLinha2: ordemCompra.fornecedor.enderecoLinha2,
        bairro: ordemCompra.fornecedor.bairro,
        cidade: ordemCompra.fornecedor.cidade,
        uf: ordemCompra.fornecedor.uf,
        cep: ordemCompra.fornecedor.cep,
        telefone: ordemCompra.fornecedor.telefone,
        email: ordemCompra.fornecedor.email
      },
      centroCustoNome: ordemCompra.centroCustoNome,
      planoConta: ordemCompra.planoConta
        ? {
            classificacao: ordemCompra.planoConta.classificacao,
            nome: ordemCompra.planoConta.nome
          }
        : null,
      formaPagamento: ordemCompra.formaPagamento,
      numeroParcelas: ordemCompra.numeroParcelas,
      solicitanteNome: ordemCompra.solicitanteNome,
      observacaoFinanceira: ordemCompra.observacaoFinanceira,
      observacao: ordemCompra.observacao,
      valorTotal: Number(ordemCompra.valorTotal),
      itens: ordemCompra.itens.map((item) => ({
        tipoItem: item.tipoItem,
        item: item.item,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.valorUnitario),
        subtotal: Number(item.subtotal)
      })),
      parcelas: ordemCompra.parcelas.map((parcela) => ({
        numeroParcela: parcela.numeroParcela,
        dataVencimento: parcela.dataVencimento,
        valorParcela: Number(parcela.valorParcela)
      })),
      logoPath: resolveReportLogoSource(cabecalho.logoUrl),
      empresaRelatorio: cabecalho.empresaRelatorio
    })
  ));
  recordPdfPerformanceMetric({ renderPdfMs: performance.now() - renderStart, pdfSizeBytes: buffer.length });

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
