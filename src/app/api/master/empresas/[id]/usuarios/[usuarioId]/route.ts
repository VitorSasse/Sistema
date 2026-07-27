import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-api";
import { roleLegadaPorRoleEmpresa, usuarioEmpresaMasterUpdateSchema } from "@/lib/validators/master";

type RouteContext = {
  params: Promise<{ id: string; usuarioId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  const { id, usuarioId } = await context.params;
  const payload = await request.json();
  const parsed = usuarioEmpresaMasterUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Dados invalidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  return access.run(async (db) => {
    try {
      const existing = await db.usuarioEmpresa.findUnique({
        where: {
          usuarioId_empresaId: {
            usuarioId,
            empresaId: id
          }
        },
        select: { id: true, usuarioId: true, roleEmpresa: true }
      });

      if (!existing) {
        return NextResponse.json({ message: "Usuario nao encontrado nesta empresa." }, { status: 404 });
      }

      const roleEmpresa = parsed.data.roleEmpresa ?? existing.roleEmpresa;
      const roleLegada = roleLegadaPorRoleEmpresa(roleEmpresa);

      const usuario = await db.$transaction(async (tx) => {
        const updated = await tx.usuario.update({
          where: { id: usuarioId },
          data: {
            ...(parsed.data.nome ? { nome: parsed.data.nome.trim() } : {}),
            ...(parsed.data.email ? { email: parsed.data.email.trim().toLowerCase() } : {}),
            ...(parsed.data.status ? { status: parsed.data.status } : {}),
            ...(parsed.data.senha ? { senhaHash: await bcrypt.hash(parsed.data.senha, 10) } : {})
          }
        });

        await tx.usuarioEmpresa.update({
          where: {
            usuarioId_empresaId: {
              usuarioId,
              empresaId: id
            }
          },
          data: {
            roleEmpresa,
            ...(parsed.data.status ? { status: parsed.data.status } : {})
          }
        });

        const role = await tx.role.findUniqueOrThrow({
          where: { codigo: roleLegada }
        });

        await tx.usuarioRole.deleteMany({
          where: { usuarioId }
        });

        await tx.usuarioRole.create({
          data: {
            usuarioId,
            roleId: role.id
          }
        });

        return updated;
      });

      return NextResponse.json({ id: usuario.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ message: "Ja existe usuario cadastrado com este e-mail." }, { status: 409 });
      }

      return NextResponse.json(
        { message: "Nao foi possivel atualizar o usuario da empresa.", detail: String(error) },
        { status: 500 }
      );
    }
  });
}
