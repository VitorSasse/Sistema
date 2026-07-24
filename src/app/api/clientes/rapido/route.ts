import { Prisma, StatusCadastro, TipoCliente } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { generateClienteCode } from "@/lib/utils/code-generation";
import {
  formatCnpjDocument,
  formatCpfDocument,
  formatTelefone,
  isValidCnpj,
  isValidCpf,
  normalizeDocument
} from "@/lib/utils/document";

const quickClienteSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome do cliente.").max(160),
    telefone: z.string().trim().max(20).optional().or(z.literal("")),
    whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
    email: z.string().trim().email("Informe um e-mail valido.").max(160).optional().or(z.literal("")),
    cpfCnpj: z.string().trim().max(20).optional().or(z.literal("")),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
    confirmDuplicate: z.boolean().optional()
  })
  .superRefine((data, context) => {
    if (!data.telefone?.trim() && !data.whatsapp?.trim() && !data.email?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telefone"],
        message: "Informe telefone, WhatsApp ou e-mail."
      });
    }

    const documentDigits = normalizeDocument(data.cpfCnpj || "");
    if (documentDigits && documentDigits.length !== 11 && documentDigits.length !== 14) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpfCnpj"],
        message: "Informe um CPF ou CNPJ valido."
      });
      return;
    }

    if (documentDigits.length === 11 && !isValidCpf(documentDigits)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["cpfCnpj"], message: "CPF invalido." });
    }

    if (documentDigits.length === 14 && !isValidCnpj(documentDigits)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["cpfCnpj"], message: "CNPJ invalido." });
    }
  });

function normalizedName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = quickClienteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const empresaId = requireActiveTenantEmpresaId();
  const documentDigits = normalizeDocument(parsed.data.cpfCnpj || "");
  const cpf = documentDigits.length === 11 ? formatCpfDocument(documentDigits) : null;
  const cnpj = documentDigits.length === 14 ? formatCnpjDocument(documentDigits) : null;
  const telefone = formatTelefone(parsed.data.telefone || parsed.data.whatsapp || "") || null;
  const email = parsed.data.email?.trim() || null;
  const nome = normalizedName(parsed.data.nome);

  if (cpf || cnpj) {
    const existingDocument = await prisma.cliente.findFirst({
      where: cpf
        ? { empresaId, OR: [{ cpf }, { cpf: documentDigits }] }
        : { empresaId, OR: [{ cnpj }, { cnpj: documentDigits }] },
      select: { id: true, codigo: true, nome: true, cpf: true, cnpj: true }
    });

    if (existingDocument) {
      return NextResponse.json(
        {
          message: cpf
            ? "Ja existe cliente cadastrado com este CPF."
            : "Ja existe cliente cadastrado com este CNPJ.",
          matches: [existingDocument]
        },
        { status: 409 }
      );
    }
  }

  if (!parsed.data.confirmDuplicate) {
    const possibleMatches = await prisma.cliente.findMany({
      where: {
        empresaId,
        OR: [
          ...(telefone ? [{ telefone }] : []),
          ...(email ? [{ email }] : []),
          { nome: { contains: nome, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        telefone: true,
        email: true,
        status: true
      },
      take: 5,
      orderBy: [{ nome: "asc" }]
    });

    if (possibleMatches.length > 0) {
      return NextResponse.json(
        {
          message: "Possivel cliente ja cadastrado.",
          matches: possibleMatches,
          canCreateAnyway: true
        },
        { status: 409 }
      );
    }
  }

  try {
    const codigo = await generateClienteCode();
    const cliente = await prisma.cliente.create({
      data: {
        empresaId,
        codigo,
        tipoCliente: cpf ? TipoCliente.CPF : TipoCliente.CNPJ,
        nome,
        nomeFantasia: null,
        cpf,
        cnpj,
        telefone,
        email,
        observacao: parsed.data.observacao?.trim() || null,
        status: StatusCadastro.PROSPECTO,
        cadastroCompleto: false
      },
      include: {
        obras: {
          select: {
            id: true,
            codigo: true,
            nome: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel criar o prospecto por duplicidade de identificador." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar o prospecto.", detail: String(error) },
      { status: 409 }
    );
  }
}
