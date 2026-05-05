import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClienteCode } from "@/lib/utils/code-generation";
import { normalizeDocument } from "@/lib/utils/document";
import { clienteSchema } from "@/lib/validators/cliente";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.cliente.findMany({
    include: {
      obras: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          status: true
        },
        orderBy: [{ nome: "asc" }]
      }
    },
    orderBy: [{ nome: "asc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

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
    const existingCpf = await prisma.cliente.findUnique({
      where: { cpf },
      select: { id: true }
    });

    if (existingCpf) {
      return NextResponse.json({ message: "Ja existe cliente cadastrado com este CPF." }, { status: 409 });
    }
  }

  if (cnpj) {
    const existingCnpj = await prisma.cliente.findUnique({
      where: { cnpj },
      select: { id: true }
    });

    if (existingCnpj) {
      return NextResponse.json({ message: "Ja existe cliente cadastrado com este CNPJ." }, { status: 409 });
    }
  }

  try {
    const codigo = await generateClienteCode();
    const cliente = await prisma.cliente.create({
      data: {
        codigo,
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

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel criar o cliente por duplicidade de identificador." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar o cliente.", detail: String(error) },
      { status: 409 }
    );
  }
}
