import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFornecedorCode } from "@/lib/utils/code-generation";
import {
  formatCep,
  formatCnpjDocument,
  formatTelefone,
  normalizeDocument
} from "@/lib/utils/document";
import { fornecedorSchema } from "@/lib/validators/fornecedor";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.fornecedor.findMany({
    include: {
      ordensCompra: {
        select: {
          id: true,
          numeroOrdem: true,
          dataEmissao: true,
          status: true,
          valorTotal: true
        },
        orderBy: [{ dataEmissao: "desc" }]
      }
    },
    orderBy: [{ razaoSocial: "asc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = fornecedorSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revise os campos destacados.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const cnpjDigits = normalizeDocument(parsed.data.cnpj || "");
  const cnpj = cnpjDigits ? formatCnpjDocument(cnpjDigits) : null;
  const telefone = formatTelefone(parsed.data.telefone) || null;
  const cep = formatCep(parsed.data.cep) || null;

  if (cnpj) {
    const existing = await prisma.fornecedor.findFirst({
      where: { OR: [{ cnpj }, { cnpj: cnpjDigits }] },
      select: { id: true }
    });

    if (existing) {
      return NextResponse.json(
        {
          message: "Ja existe fornecedor cadastrado com este CNPJ.",
          issues: {
            formErrors: [],
            fieldErrors: { cnpj: ["Ja existe fornecedor cadastrado com este CNPJ."] }
          }
        },
        { status: 409 }
      );
    }
  }

  try {
    const codigo = await generateFornecedorCode();
    const fornecedor = await prisma.fornecedor.create({
      data: {
        codigo,
        razaoSocial: parsed.data.razaoSocial,
        nomeFantasia: parsed.data.nomeFantasia || null,
        cnpj,
        inscricaoEstadual: parsed.data.inscricaoEstadual || null,
        telefone,
        email: parsed.data.email || null,
        enderecoLinha1: parsed.data.enderecoLinha1 || null,
        enderecoNumero: parsed.data.enderecoNumero || null,
        enderecoLinha2: parsed.data.enderecoLinha2 || null,
        bairro: parsed.data.bairro || null,
        cidade: parsed.data.cidade || null,
        uf: parsed.data.uf || null,
        cep,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      },
      include: {
        ordensCompra: {
          select: {
            id: true,
            numeroOrdem: true,
            dataEmissao: true,
            status: true,
            valorTotal: true
          },
          orderBy: [{ dataEmissao: "desc" }]
        }
      }
    });

    return NextResponse.json(fornecedor, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel criar o fornecedor por duplicidade de identificador." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar o fornecedor.", detail: String(error) },
      { status: 409 }
    );
  }
}
