import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCatalogoCompraCode } from "@/lib/utils/code-generation";
import { catalogoCompraSchema } from "@/lib/validators/catalogo-compra";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.catalogoCompra.findMany({
    include: {
      itensOrdemCompra: {
        select: {
          id: true,
          ordemCompraId: true,
          descricao: true,
          subtotal: true
        }
      }
    },
    orderBy: [{ tipo: "asc" }, { descricao: "asc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = catalogoCompraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.catalogoCompra.findFirst({
    where: {
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
    const codigo = await generateCatalogoCompraCode();
    const created = await prisma.catalogoCompra.create({
      data: {
        codigo,
        tipo: parsed.data.tipo,
        descricao: parsed.data.descricao,
        unidadePadrao: parsed.data.unidadePadrao,
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o item do catalogo.", detail: String(error) },
      { status: 409 }
    );
  }
}
