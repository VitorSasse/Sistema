import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-api";
import { prisma } from "@/lib/prisma";
import { roleLegadaPorRoleEmpresa, usuarioEmpresaMasterCreateSchema } from "@/lib/validators/master";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  const { id } = await context.params;

  return access.run(async () => {
    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: id },
      orderBy: [{ status: "asc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
        roleEmpresa: true,
        ultimoLoginEm: true,
        createdAt: true
      }
    });

    return NextResponse.json({ items: usuarios });
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = usuarioEmpresaMasterCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Dados invalidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  return access.run(async () => {
    try {
      const empresa = await prisma.empresa.findFirst({
        where: { id, deletedAt: null },
        select: { id: true }
      });

      if (!empresa) {
        return NextResponse.json({ message: "Empresa nao encontrada." }, { status: 404 });
      }

      const roleLegada = roleLegadaPorRoleEmpresa(parsed.data.roleEmpresa);
      const senhaHash = await bcrypt.hash(parsed.data.senha, 10);
      const email = parsed.data.email.trim().toLowerCase();

      const usuario = await prisma.$transaction(async (tx) => {
        const created = await tx.usuario.create({
          data: {
            nome: parsed.data.nome.trim(),
            email,
            senhaHash,
            status: parsed.data.status,
            roleEmpresa: parsed.data.roleEmpresa,
            empresaId: id
          }
        });

        const role = await tx.role.findUniqueOrThrow({
          where: { codigo: roleLegada }
        });

        await tx.usuarioRole.create({
          data: {
            usuarioId: created.id,
            roleId: role.id
          }
        });

        return created;
      });

      return NextResponse.json({ id: usuario.id }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ message: "Ja existe usuario cadastrado com este e-mail." }, { status: 409 });
      }

      return NextResponse.json(
        { message: "Nao foi possivel criar o usuario da empresa.", detail: String(error) },
        { status: 500 }
      );
    }
  });
}
