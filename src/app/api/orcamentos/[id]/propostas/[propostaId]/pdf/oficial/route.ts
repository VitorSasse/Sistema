import { readFile } from "fs/promises";
import path from "path";
import { StatusPropostaComercial } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { renderOrcamentoPropostaPdf } from "@/server/pdf/orcamento-proposta-renderer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; propostaId: string }>;
};

function publicFilePathFromUrl(url: string) {
  const normalized = url.replace(/^\/+/, "").replaceAll("/", path.sep);
  return path.join(process.cwd(), "public", normalized);
}

export async function GET(_: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para visualizar o PDF oficial." }, { status: 409 });
  }

  const { id, propostaId } = await context.params;
  const proposta = await prisma.orcamentoPropostaComercial.findFirst({
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
  });

  if (!proposta) {
    return NextResponse.json({ message: "Proposta nao encontrada." }, { status: 404 });
  }

  if (proposta.status !== StatusPropostaComercial.EMITIDA && proposta.status !== StatusPropostaComercial.REJEITADA && proposta.status !== StatusPropostaComercial.CANCELADA) {
    return NextResponse.json({ message: "Esta proposta ainda nao possui PDF oficial." }, { status: 409 });
  }

  if (proposta.pdfOficialUrl?.startsWith("/uploads/")) {
    try {
      const file = await readFile(publicFilePathFromUrl(proposta.pdfOficialUrl));
      const fileName = proposta.pdfOficialNome ?? `${proposta.codigo}.pdf`;

      return new NextResponse(new Uint8Array(file), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Cache-Control": "private, max-age=300"
        }
      });
    } catch {
      // Propostas antigas podem nao ter arquivo fisico; o fallback abaixo usa o snapshot congelado.
    }
  }

  try {
    const { buffer, fileName } = await renderOrcamentoPropostaPdf({
      db: prisma,
      orcamentoId: id,
      empresaId,
      propostaId,
      modo: "OFICIAL"
    });

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
}
