import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { TipoAnexo } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/xml",
  "application/xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

const allowedExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".xml",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx"
]);

const maxFileSizeBytes = 15 * 1024 * 1024;

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isAllowedFile(name: string, mimeType: string) {
  const extension = path.extname(name).toLowerCase();
  return allowedMimeTypes.has(mimeType) || allowedExtensions.has(extension);
}

export async function GET(_: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const ordemCompra = await prisma.ordemCompra.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!ordemCompra) {
    return NextResponse.json({ message: "Ordem de compra nao encontrada." }, { status: 404 });
  }

  const items = await prisma.anexo.findMany({
    where: { ordemCompraId: id },
    orderBy: [{ createdAt: "desc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const ordemCompra = await prisma.ordemCompra.findUnique({
    where: { id },
    select: {
      id: true,
      numeroOrdem: true
    }
  });

  if (!ordemCompra) {
    return NextResponse.json({ message: "Ordem de compra nao encontrada." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const tipo = String(formData.get("tipo") ?? "OUTRO") as TipoAnexo;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Selecione um arquivo para anexar na ordem de compra." },
      { status: 400 }
    );
  }

  if (!Object.values(TipoAnexo).includes(tipo)) {
    return NextResponse.json({ message: "Tipo de anexo invalido." }, { status: 400 });
  }

  if (!isAllowedFile(file.name, file.type)) {
    return NextResponse.json(
      {
        message:
          "Formato invalido. Use PDF, imagem, XML, Word ou Excel."
      },
      { status: 400 }
    );
  }

  if (file.size > maxFileSizeBytes) {
    return NextResponse.json(
      { message: "Arquivo maior que o limite de 15 MB." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "ordens-compra", ordemCompra.numeroOrdem);
  const storedName = `${Date.now()}-${randomUUID()}-${safeName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, storedName), bytes);

  const anexo = await prisma.anexo.create({
    data: {
      ordemCompraId: ordemCompra.id,
      tipo,
      nomeArquivo: file.name,
      mimeType: file.type || "application/octet-stream",
      tamanhoBytes: bytes.length,
      urlArquivo: `/uploads/ordens-compra/${ordemCompra.numeroOrdem}/${storedName}`
    }
  });

  return NextResponse.json(anexo, { status: 201 });
}
