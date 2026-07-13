import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatCep,
  formatCnpjDocument,
  formatTelefone,
  normalizeDocument
} from "@/lib/utils/document";
import { fornecedorSchema } from "@/lib/validators/fornecedor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
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
      where: {
        OR: [{ cnpj }, { cnpj: cnpjDigits }],
        NOT: { id }
      },
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
    const fornecedor = await prisma.fornecedor.update({
      where: { id },
      data: {
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

    return NextResponse.json(fornecedor);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel atualizar o fornecedor por duplicidade de identificador." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar o fornecedor.", detail: String(error) },
      { status: 409 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const mode = request.nextUrl.searchParams.get("mode");

  try {
    if (mode === "delete") {
      const fornecedor = await prisma.fornecedor.delete({
        where: { id }
      });

      return NextResponse.json(fornecedor);
    }

    const fornecedor = await prisma.fornecedor.update({
      where: { id },
      data: {
        status: "INATIVO"
      }
    });

    return NextResponse.json(fornecedor);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o fornecedor. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o fornecedor.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
