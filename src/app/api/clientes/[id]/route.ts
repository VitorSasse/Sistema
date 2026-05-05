import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDocument } from "@/lib/utils/document";
import { clienteSchema } from "@/lib/validators/cliente";

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
  const parsed = clienteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const cpf = parsed.data.tipoCliente === "CPF" ? normalizeDocument(parsed.data.cpf || "") : null;
  const cnpj = parsed.data.tipoCliente === "CNPJ" ? normalizeDocument(parsed.data.cnpj || "") : null;

  if (cpf) {
    const existingCpf = await prisma.cliente.findFirst({
      where: {
        cpf,
        NOT: { id }
      },
      select: { id: true }
    });

    if (existingCpf) {
      return NextResponse.json({ message: "Ja existe cliente cadastrado com este CPF." }, { status: 409 });
    }
  }

  if (cnpj) {
    const existingCnpj = await prisma.cliente.findFirst({
      where: {
        cnpj,
        NOT: { id }
      },
      select: { id: true }
    });

    if (existingCnpj) {
      return NextResponse.json({ message: "Ja existe cliente cadastrado com este CNPJ." }, { status: 409 });
    }
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        tipoCliente: parsed.data.tipoCliente,
        nome: parsed.data.nome,
        nomeFantasia: parsed.data.nomeFantasia || null,
        cpf,
        cnpj,
        inscricaoEstadual: parsed.data.inscricaoEstadual || null,
        contatoNome: parsed.data.contatoNome || null,
        telefone: parsed.data.telefone || null,
        email: parsed.data.email || null,
        enderecoLinha1: parsed.data.enderecoLinha1 || null,
        enderecoLinha2: parsed.data.enderecoLinha2 || null,
        bairro: parsed.data.bairro || null,
        cidade: parsed.data.cidade || null,
        uf: parsed.data.uf || null,
        cep: parsed.data.cep || null,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
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

    return NextResponse.json(cliente);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel atualizar o cliente por duplicidade de identificador." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar o cliente.", detail: String(error) },
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
      const cliente = await prisma.cliente.delete({
        where: { id }
      });

      return NextResponse.json(cliente);
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { status: "INATIVO" }
    });

    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o cliente. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o cliente.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
