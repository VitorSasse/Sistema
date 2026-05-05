import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MedicaoPdfDocument, type MedicaoPdfTipo } from "@/server/pdf/medicao-pdf";
import { resolveReportLogoSource } from "@/server/pdf/report-logo";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  const medicao = await prisma.medicao.findFirst({
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
  });

  if (!medicao) {
    return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
  }

  if (medicao.itens.length === 0) {
    return NextResponse.json({ message: "Medicao sem itens para relatorio." }, { status: 400 });
  }

  if (medicao.itens.some((item) => Number(item.valorUnitario) <= 0)) {
    return NextResponse.json(
      { message: "Todos os itens precisam ter valor unitario para gerar o PDF." },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const rawTipo = (url.searchParams.get("tipo") ?? "DETALHADO").toUpperCase();
  const tipoRelatorio: MedicaoPdfTipo =
    rawTipo === "RESUMIDO" ? "RESUMIDO" : "DETALHADO";

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
      tipoRelatorio,
      logoPath: resolveReportLogoSource(),
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
      "Content-Disposition": `inline; filename="${medicao.codigoMedicao}.pdf"`
    }
  });
}
