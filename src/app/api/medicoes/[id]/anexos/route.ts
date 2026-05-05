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

const allowedMimeTypes = new Set(["application/pdf"]);
const allowedExtensions = new Set([".pdf"]);

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

  const medicao = await prisma.medicao.findFirst({
    where: {
      id,
      deletedAt: null
    },
    select: { id: true }
  });

  if (!medicao) {
    return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
  }

  const items = await prisma.anexo.findMany({
    where: { medicaoId: id },
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
  const medicao = await prisma.medicao.findFirst({
    where: {
      id,
      deletedAt: null
    },
    select: {
      id: true,
      codigoMedicao: true,
      status: true,
      aprovadaEm: true,
      pedidoAnexadoEm: true,
      notaFiscalAnexadaEm: true,
      anexos: {
        select: { tipo: true }
      }
    }
  });

  if (!medicao) {
    return NextResponse.json({ message: "Medicao nao encontrada." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const tipo = String(formData.get("tipo") ?? "OUTRO") as TipoAnexo;

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Selecione um arquivo PDF para anexar." }, { status: 400 });
  }

  if (!Object.values(TipoAnexo).includes(tipo)) {
    return NextResponse.json({ message: "Tipo de anexo invalido." }, { status: 400 });
  }

  if (!isAllowedFile(file.name, file.type)) {
    return NextResponse.json(
      { message: "Formato invalido. Apenas arquivos PDF sao permitidos." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "medicoes", medicao.codigoMedicao);
  const storedName = `${Date.now()}-${randomUUID()}-${safeName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, storedName), bytes);

  const anexo = await prisma.anexo.create({
    data: {
      medicaoId: medicao.id,
      tipo,
      nomeArquivo: file.name,
      mimeType: file.type || "application/pdf",
      tamanhoBytes: bytes.length,
      urlArquivo: `/uploads/medicoes/${medicao.codigoMedicao}/${storedName}`
    }
  });

  return NextResponse.json(anexo, { status: 201 });
}
