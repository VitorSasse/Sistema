import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; anexoId: string }>;
};

function encodeContentDispositionFilename(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64")
  };
}

async function readUploadFile(urlArquivo: string) {
  if (!urlArquivo.startsWith("/uploads/ordens-compra/")) {
    return null;
  }

  const publicDir = path.join(process.cwd(), "public");
  const resolvedPath = path.resolve(publicDir, `.${urlArquivo}`);
  const allowedRoot = path.resolve(publicDir, "uploads", "ordens-compra");

  if (!resolvedPath.startsWith(allowedRoot)) {
    return null;
  }

  return readFile(resolvedPath);
}

export async function GET(_: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id, anexoId } = await context.params;
  const anexo = await prisma.anexo.findFirst({
    where: {
      id: anexoId,
      ordemCompraId: id
    },
    select: {
      nomeArquivo: true,
      mimeType: true,
      urlArquivo: true
    }
  });

  if (!anexo) {
    return NextResponse.json({ message: "Anexo nao encontrado." }, { status: 404 });
  }

  let bytes: Buffer | null = null;
  let mimeType = anexo.mimeType || "application/octet-stream";

  if (anexo.urlArquivo.startsWith("data:")) {
    const parsed = parseDataUrl(anexo.urlArquivo);

    if (parsed) {
      bytes = parsed.bytes;
      mimeType = parsed.mimeType || mimeType;
    }
  } else {
    bytes = await readUploadFile(anexo.urlArquivo).catch(() => null);
  }

  if (!bytes) {
    return NextResponse.json(
      { message: "Nao foi possivel abrir o arquivo anexado." },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": encodeContentDispositionFilename(anexo.nomeArquivo),
      "Cache-Control": "private, max-age=60"
    }
  });
}
