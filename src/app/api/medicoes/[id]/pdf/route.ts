import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
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

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para gerar o PDF." }, { status: 409 });
  }

  const [medicao, empresa] = await Promise.all([
    prisma.medicao.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
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
            deletedAt: null
          },
          orderBy: [{ data: "asc" }, { createdAt: "asc" }]
        }
      }
    }),
    prisma.empresa.findUnique({ where: { id: empresaId } })
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

  const buffer = await renderToBuffer(
    MedicaoPdfDocument({
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
      logoPath: resolveReportLogoSource(empresa?.logoUrl),
      itens: medicao.itens.map((item) => ({
        ...item,
        quantidadeFaturada: Number(item.quantidadeFaturada),
        valorUnitario: Number(item.valorUnitario),
        valorTotalItem: Number(item.valorTotalItem)
      }))
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store"
    }
  });
}
