import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { catalogoCompraSchema } from "@/lib/validators/catalogo-compra";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizePayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    valorPadrao: parseDecimalInput(payload.valorPadrao)
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = normalizePayload((await request.json()) as Record<string, unknown>);
  const parsed = catalogoCompraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.catalogoCompra.findFirst({
    where: {
      NOT: { id },
      tipo: parsed.data.tipo,
      descricao: {
        equals: parsed.data.descricao,
        mode: "insensitive"
      }
    },
    select: { id: true }
  });

  if (existing) {
    return NextResponse.json(
      { message: "Ja existe item cadastrado com este tipo e descricao." },
      { status: 409 }
    );
  }

  try {
    const updated = await prisma.catalogoCompra.update({
      where: { id },
      data: {
        tipo: parsed.data.tipo,
        descricao: parsed.data.descricao,
        unidadePadrao: parsed.data.unidadePadrao,
        valorPadrao: parsed.data.valorPadrao,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      },
      include: {
        itensOrdemCompra: {
          select: {
            id: true,
            ordemCompraId: true,
            descricao: true,
            subtotal: true
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar o item do catalogo.", detail: String(error) },
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
      const deleted = await prisma.catalogoCompra.delete({
        where: { id }
      });

      return NextResponse.json(deleted);
    }

    const updated = await prisma.catalogoCompra.update({
      where: { id },
      data: { status: "INATIVO" }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o item do catalogo. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o item do catalogo.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
