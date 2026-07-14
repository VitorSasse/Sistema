import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-api";
import { empresaMasterSchema } from "@/lib/validators/master";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  const { id } = await context.params;

  return access.run(async (db) => {
    const empresa = await db.empresa.findFirst({
      where: { id, deletedAt: null },
      include: {
        usuarios: {
          orderBy: { nome: "asc" },
          select: {
            id: true,
            nome: true,
            email: true,
            status: true,
            roleEmpresa: true,
            ultimoLoginEm: true,
            createdAt: true
          }
        }
      }
    });

    if (!empresa) {
      return NextResponse.json({ message: "Empresa nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({ item: empresa });
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = empresaMasterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Dados invalidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  return access.run(async (db) => {
    try {
      const existing = await db.empresa.findFirst({
        where: { id, deletedAt: null },
        select: { id: true }
      });

      if (!existing) {
        return NextResponse.json({ message: "Empresa nao encontrada." }, { status: 404 });
      }

      const empresa = await db.empresa.update({
        where: { id },
        data: {
          nome: parsed.data.nomeFantasia,
          nomeFantasia: parsed.data.nomeFantasia,
          razaoSocial: parsed.data.razaoSocial,
          cnpj: parsed.data.cnpj,
          email: parsed.data.email,
          telefone: parsed.data.telefone,
          endereco: parsed.data.endereco,
          cidade: parsed.data.cidade,
          estado: parsed.data.estado,
          cep: parsed.data.cep,
          logoUrl: parsed.data.logoUrl,
          corPrimaria: parsed.data.corPrimaria,
          status: parsed.data.status,
          plano: parsed.data.plano
        }
      });

      return NextResponse.json({ id: empresa.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ message: "Ja existe empresa cadastrada com este CNPJ." }, { status: 409 });
      }

      return NextResponse.json(
        { message: "Nao foi possivel atualizar a empresa.", detail: String(error) },
        { status: 500 }
      );
    }
  });
}
