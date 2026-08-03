import { Prisma, StatusLancamento } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { performance } from "node:perf_hooks";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { measurePerformanceStep, recordPdfPerformanceMetric } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { resolveDocumentoCabecalhoPdf } from "@/server/pdf/documento-cabecalho";
import { resolveReportLogoSource } from "@/server/pdf/report-logo";
import { LancamentosRelatorioPdfDocument } from "@/server/pdf/lancamentos-relatorio-pdf";
import { RomaneiosRelatorioPdfDocument } from "@/server/pdf/romaneios-relatorio-pdf";

export const runtime = "nodejs";

function normalizeDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function getDataFilter(searchParams: URLSearchParams) {
  const dateParam = searchParams.get("date");
  const periodoInicial = searchParams.get("periodoInicial");
  const periodoFinal = searchParams.get("periodoFinal");

  if (periodoInicial && periodoFinal) {
    return {
      gte: startOfDay(normalizeDate(periodoInicial)),
      lte: endOfDay(normalizeDate(periodoFinal))
    };
  }

  if (periodoInicial) {
    return {
      gte: startOfDay(normalizeDate(periodoInicial))
    };
  }

  if (periodoFinal) {
    return {
      lte: endOfDay(normalizeDate(periodoFinal))
    };
  }

  if (dateParam) {
    const referenceDate = normalizeDate(dateParam);
    return {
      gte: startOfDay(referenceDate),
      lte: endOfDay(referenceDate)
    };
  }

  return undefined;
}

async function measurePdfStep<T>(
  stepName: string,
  metricName: "loadHeaderMs" | "loadLancamentosMs" | "loadDataMs",
  callback: () => Promise<T>
) {
  const start = performance.now();
  try {
    return await measurePerformanceStep(stepName, callback);
  } finally {
    recordPdfPerformanceMetric({ [metricName]: performance.now() - start });
  }
}

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/lancamentos/relatorio", method: "GET" }, async () => {
  const requestStart = performance.now();
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const fichaNumero = searchParams.get("fichaNumero");
  const clienteId = searchParams.get("clienteId");
  const obraId = searchParams.get("obraId");
  const servicoId = searchParams.get("servicoId");
  const equipamentoId = searchParams.get("equipamentoId");
  const colaboradorId = searchParams.get("colaboradorId");
  const status = searchParams.get("status");
  const medicaoId = searchParams.get("medicaoId");
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const modo = searchParams.get("modo");
  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para gerar o relatorio." }, { status: 409 });
  }

  const reportWhere: Prisma.LancamentoDiarioWhereInput = {
    empresaId,
    data: getDataFilter(searchParams),
    medicaoItens: medicaoId
      ? {
          some: {
            medicaoId,
            deletedAt: null,
            medicao: {
              empresaId,
              deletedAt: null
            }
          }
        }
      : undefined,
    clienteId: clienteId || undefined,
    obraId: obraId || undefined,
    servicoId: servicoId || undefined,
    equipamentoId: equipamentoId || undefined,
    colaboradorId: colaboradorId || undefined,
    statusValidacao: status ? (status as StatusLancamento) : undefined,
    ficha: fichaNumero
      ? {
          numero: {
            contains: fichaNumero,
            mode: "insensitive"
          }
        }
      : undefined,
    deletedAt: includeDeleted || status === StatusLancamento.CANCELADO ? undefined : null
  };

  const [cabecalho, medicao, items] = await Promise.all([
    measurePdfStep("loadHeaderMs", "loadHeaderMs", () => resolveDocumentoCabecalhoPdf(prisma, empresaId, "RELATORIO")),
    medicaoId
      ? measurePerformanceStep("loadMeasurementMs", () => prisma.medicao.findUnique({
        where: { id: medicaoId },
        select: { codigoMedicao: true }
      }))
      : Promise.resolve(null),
    measurePdfStep("loadLancamentosMs", "loadLancamentosMs", () => prisma.lancamentoDiario.findMany({
      where: reportWhere,
      select: {
        id: true,
        fichaId: true,
        data: true,
        clienteId: true,
        obraId: true,
        quantidadeApontada: true,
        unidadeApontada: true,
        quantidadeFaturada: true,
        unidadeFaturada: true,
        statusValidacao: true,
        observacao: true,
        romaneios: {
          where: { deletedAt: null },
          orderBy: { numero: "asc" },
          select: { numero: true }
        },
        ficha: {
          select: {
            numero: true,
            romaneios: {
              where: { deletedAt: null },
              orderBy: { numero: "asc" },
              select: { numero: true }
            },
            _count: {
              select: {
                lancamentos: true
              }
            }
          }
        },
        cliente: { select: { nome: true } },
        obra: { select: { nome: true } },
        servico: { select: { tipoServico: true } },
        material: { select: { descricao: true } },
        equipamento: { select: { descricao: true, placaOuTag: true } },
        colaborador: { select: { nome: true } }
      },
      orderBy:
        modo === "romaneios"
          ? [{ data: "asc" }, { ficha: { numero: "asc" } }, { createdAt: "asc" }]
          : [{ data: "desc" }, { ficha: { numero: "desc" } }, { createdAt: "desc" }]
    }))
  ]);

  if (items.length === 0) {
    return NextResponse.json(
      { message: "Nenhum lancamento encontrado para gerar o relatorio." },
      { status: 400 }
    );
  }

  const prepareStart = performance.now();
  const filtros = [
    { label: "Periodo inicial", value: searchParams.get("periodoInicial") || "Todos" },
    { label: "Periodo final", value: searchParams.get("periodoFinal") || "Todos" },
    { label: "Medicao", value: medicao?.codigoMedicao ?? (medicaoId ? "Selecionada" : "Todas") },
    { label: "Ficha", value: fichaNumero || "Todas" },
    {
      label: "Cliente",
      value: items[0]?.cliente.nome && clienteId ? items[0].cliente.nome : "Todos"
    },
    {
      label: "Obra",
      value: obraId ? items.find((item) => item.obra)?.obra?.nome ?? "Sem obra" : "Todas"
    },
    {
      label: "Servico",
      value: servicoId ? items[0]?.servico.tipoServico ?? "Todos" : "Todos"
    },
    {
      label: "Maquina / Recurso",
      value: equipamentoId
        ? `${items[0]?.equipamento.descricao ?? ""} ${items[0]?.equipamento.placaOuTag ?? ""}`.trim()
        : "Todos"
    },
    {
      label: "Operador",
      value: colaboradorId ? items[0]?.colaborador.nome ?? "Todos" : "Todos"
    },
    { label: "Status", value: status || "Todos" }
  ];

  const normalizedItems = items.map((item) => ({
    ...item,
    romaneiosResolvidos:
      item.romaneios.length > 0
        ? item.romaneios.map((romaneio) => romaneio.numero)
        : item.ficha._count.lancamentos <= 1
          ? item.ficha.romaneios.map((romaneio) => romaneio.numero)
          : []
  }));
  const prepareReportDataMs = performance.now() - prepareStart;
  recordPdfPerformanceMetric({
    loadDataMs: prepareStart - requestStart,
    prepareReportDataMs,
    lancamentosCount: items.length
  });

  const renderStart = performance.now();
  const buffer =
    modo === "romaneios"
      ? await measurePerformanceStep("renderPdfMs", () => renderToBuffer(
          RomaneiosRelatorioPdfDocument({
            titulo: "Relatorio de romaneios",
            filtros,
            emitidoEm: new Date(),
            logoPath: resolveReportLogoSource(cabecalho.logoUrl),
            empresaRelatorio: cabecalho.empresaRelatorio,
            lancamentos: normalizedItems.map((item) => ({
              lancamentoId: item.id,
              fichaKey: `${item.fichaId}:${item.clienteId}:${item.obraId ?? "sem-obra"}`,
              data: item.data,
              fichaNumero: item.ficha.numero,
              clienteNome: item.cliente.nome,
              obraNome: item.obra?.nome ?? null,
              servicoNome: item.servico.tipoServico,
              materialNome: item.material?.descricao ?? null,
              romaneios: item.romaneiosResolvidos
            }))
          })
        ))
      : await measurePerformanceStep("renderPdfMs", () => renderToBuffer(
          LancamentosRelatorioPdfDocument({
            titulo: "Relatorio de historico de lancamentos",
            filtros,
            emitidoEm: new Date(),
            logoPath: resolveReportLogoSource(cabecalho.logoUrl),
            empresaRelatorio: cabecalho.empresaRelatorio,
            itens: normalizedItems.map((item) => ({
              id: item.id,
              data: item.data,
              fichaNumero: item.ficha.numero,
              clienteNome: item.cliente.nome,
              obraNome: item.obra?.nome ?? null,
              servicoNome: item.servico.tipoServico,
              materialNome: item.material?.descricao ?? null,
              equipamentoNome: item.equipamento.descricao,
              equipamentoTag: item.equipamento.placaOuTag,
              colaboradorNome: item.colaborador.nome,
              quantidadeApontada: Number(item.quantidadeApontada),
              unidadeApontada: item.unidadeApontada,
              quantidadeFaturada: Number(item.quantidadeFaturada),
              unidadeFaturada: item.unidadeFaturada,
              statusValidacao: item.statusValidacao,
              observacao: item.observacao
            }))
          })
        ));
  recordPdfPerformanceMetric({ renderPdfMs: performance.now() - renderStart, pdfSizeBytes: buffer.length });
  recordPdfPerformanceMetric({ totalDurationMs: performance.now() - requestStart });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        modo === "romaneios"
          ? 'inline; filename="relatorio-romaneios.pdf"'
          : 'inline; filename="relatorio-historico-lancamentos.pdf"',
      "Cache-Control": "no-store"
    }
  });
  });
}
