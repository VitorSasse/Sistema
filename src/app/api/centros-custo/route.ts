import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { generateCentroCustoCompraCode } from "@/lib/utils/code-generation";
import { centroCustoCompraSchema } from "@/lib/validators/centro-custo-compra";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.centroCustoCompra.findMany({
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
  const parsed = centroCustoCompraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.centroCustoCompra.findFirst({
    where: {
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
    const codigo = await generateCentroCustoCompraCode();
    const created = await prisma.centroCustoCompra.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        codigo,
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o centro de custo.", detail: String(error) },
      { status: 409 }
    );
  }
}
