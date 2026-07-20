import { createHash } from "crypto";
import { StatusPropostaComercial } from "@prisma/client";
import { NextResponse } from "next/server";
import { validateApiPermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { buscarOrcamento } from "@/server/services/orcamentos/service";
import { renderOrcamentoPropostaPdf } from "@/server/pdf/orcamento-proposta-renderer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; propostaId: string }>;
};

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(_: Request, context: RouteContext) {
  const permission = await validateApiPermission("orcamentos.manage");

  if (!permission.ok) {
    return permission.response;
  }

  const empresaId = requireActiveTenantEmpresaId();
  const { id, propostaId } = await context.params;
  const proposta = await prisma.orcamentoPropostaComercial.findFirst({
    where: {
      id: propostaId,
      orcamentoId: id,
      empresaId
    },
    select: {
      id: true,
      codigo: true,
      status: true,
      snapshotJson: true
    }
  });

  if (!proposta) {
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

  try {
    const rendered = await renderOrcamentoPropostaPdf({
      db: prisma,
      orcamentoId: id,
      empresaId,
      propostaId,
      modo: "OFICIAL",
      dataDocumento: emitidaEm
    });

    buffer = rendered.buffer;
    fileName = rendered.fileName;
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel gerar o PDF oficial da proposta.", detail: String(error) },
      { status: 500 }
    );
  }

  const hash = createHash("sha256").update(buffer).digest("hex");
  const publicUrl = `/api/orcamentos/${id}/propostas/${propostaId}/pdf/oficial`;

  const updated = await prisma.orcamentoPropostaComercial.updateMany({
    where: {
      id: propostaId,
      orcamentoId: id,
      empresaId,
      status: StatusPropostaComercial.RASCUNHO
    },
    data: {
      status: StatusPropostaComercial.EMITIDA,
      emitidaEm,
      emitidaPorId: permission.session.user.id,
      pdfOficialUrl: publicUrl,
      pdfOficialNome: sanitizeFileName(fileName),
      pdfOficialHash: hash,
      pdfOficialMime: "application/pdf",
      pdfOficialTamanhoBytes: buffer.length
    }
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { message: "Esta proposta ja foi emitida por outro usuario. Recarregue a tela." },
      { status: 409 }
    );
  }

  const orcamento = await buscarOrcamento(prisma, id);

  return NextResponse.json({
    message: "Proposta emitida com sucesso.",
    pdfOficialUrl: publicUrl,
    orcamento
  });
}
