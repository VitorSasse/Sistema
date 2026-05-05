import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateObraCode } from "@/lib/utils/code-generation";
import { obraSchema } from "@/lib/validators/obra";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.obra.findMany({
    include: {
      cliente: {
        select: {
          id: true,
          codigo: true,
          nome: true
        }
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
  const parsed = obraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: parsed.data.clienteId },
    select: { id: true, status: true }
  });

  if (!cliente || cliente.status !== "ATIVO") {
    return NextResponse.json(
      { message: "Cliente invalido ou inativo para vinculacao da obra." },
      { status: 400 }
    );
  }

  try {
    const codigo = await generateObraCode();
    const obra = await prisma.obra.create({
      data: {
        clienteId: parsed.data.clienteId,
        codigo,
        nome: parsed.data.nome,
        contratoNumero: parsed.data.contratoNumero || null,
        localidade: parsed.data.localidade || null,
        cidade: parsed.data.cidade || null,
        uf: parsed.data.uf || null,
        dataInicio: parsed.data.dataInicio ? new Date(parsed.data.dataInicio) : null,
        dataFim: parsed.data.dataFim ? new Date(parsed.data.dataFim) : null,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status,
        liberadaParaLancamento: parsed.data.liberadaParaLancamento
      },
      include: {
        cliente: {
          select: {
            id: true,
            codigo: true,
            nome: true
          }
        }
      }
    });

    return NextResponse.json(obra, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel criar a obra por duplicidade de codigo." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar a obra.", detail: String(error) },
      { status: 409 }
    );
  }
}
