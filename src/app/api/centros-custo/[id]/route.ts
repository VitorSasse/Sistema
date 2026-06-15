import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { centroCustoCompraSchema } from "@/lib/validators/centro-custo-compra";

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
  const parsed = centroCustoCompraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.centroCustoCompra.findFirst({
    where: {
      NOT: { id },
      nome: {
        equals: parsed.data.nome,
        mode: "insensitive"
      }
    },
    select: { id: true }
  });

  if (existing) {
    return NextResponse.json(
      { message: "Ja existe centro de custo cadastrado com este nome." },
      { status: 409 }
    );
  }

  try {
    const updated = await prisma.centroCustoCompra.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
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

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar o centro de custo.", detail: String(error) },
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
      const deleted = await prisma.centroCustoCompra.delete({
        where: { id }
      });

      return NextResponse.json(deleted);
    }

    const updated = await prisma.centroCustoCompra.update({
      where: { id },
      data: { status: "INATIVO" }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o centro de custo. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o centro de custo.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
