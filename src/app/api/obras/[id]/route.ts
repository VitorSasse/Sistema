import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obraSchema } from "@/lib/validators/obra";

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
    const obra = await prisma.obra.update({
      where: { id },
      data: {
        clienteId: parsed.data.clienteId,
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

    return NextResponse.json(obra);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar a obra.", detail: String(error) },
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
      const obra = await prisma.obra.delete({
        where: { id }
      });

      return NextResponse.json(obra);
    }

    const obra = await prisma.obra.update({
      where: { id },
      data: {
        status: "INATIVO",
        liberadaParaLancamento: false
      }
    });

    return NextResponse.json(obra);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir a obra. Verifique se ela possui vinculos."
            : "Nao foi possivel inativar a obra.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
