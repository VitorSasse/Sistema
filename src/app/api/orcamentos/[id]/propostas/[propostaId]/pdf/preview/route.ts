import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { renderOrcamentoPropostaPdf } from "@/server/pdf/orcamento-proposta-renderer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; propostaId: string }>;
};

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "ORCAMENTO_NAO_ENCONTRADO") {
      return NextResponse.json({ message: "Orcamento nao encontrado." }, { status: 404 });
    }

    if (error.message === "PROPOSTA_NAO_PREPARADA" || error.message === "PROPOSTA_SEM_ESCOPO_COMERCIAL") {
      return NextResponse.json({ message: "A proposta ainda nao possui escopo comercial para pre-visualizacao." }, { status: 400 });
    }
  }

  return NextResponse.json(
    { message: "Nao foi possivel gerar a previa da proposta.", detail: String(error) },
    { status: 500 }
  );
}

export async function GET(_: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para gerar a previa." }, { status: 409 });
  }

  const { id, propostaId } = await context.params;

  try {
    const { buffer, fileName } = await renderOrcamentoPropostaPdf({
      db: prisma,
      orcamentoId: id,
      empresaId,
      propostaId,
      modo: "PREVIEW"
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="PREVIA_${fileName}"; filename*=UTF-8''${encodeURIComponent(`PREVIA_${fileName}`)}`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
