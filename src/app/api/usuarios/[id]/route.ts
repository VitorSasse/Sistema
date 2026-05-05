import bcrypt from "bcryptjs";
import { Prisma, RoleCodigo } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiPermission } from "@/lib/auth-guards";
import { usuarioUpdateSchema } from "@/lib/validators/usuario";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function ensureAnotherAdmin(targetUserId: string) {
  const adminUsers = await prisma.usuarioRole.count({
    where: {
      role: { codigo: RoleCodigo.ADMIN },
      usuario: {
        status: "ATIVO",
        NOT: { id: targetUserId }
      }
    }
  });

  return adminUsers > 0;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await validateApiPermission("users.manage");

  if (!access.ok) {
    return access.response;
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = usuarioUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const isSelf = access.session.user.id === id;

  const existing = await prisma.usuario.findUnique({
    where: { id },
    include: {
      roles: {
        include: { role: true }
      }
    }
  });

  if (!existing) {
    return NextResponse.json({ message: "Usuario nao encontrado." }, { status: 404 });
  }

  const currentRoles = existing.roles.map((item) => item.role.codigo);
  const willRemainAdmin = parsed.data.roles.includes(RoleCodigo.ADMIN);
  const isCurrentlyAdmin = currentRoles.includes(RoleCodigo.ADMIN);
  const isDeactivating = parsed.data.status === "INATIVO";

  if (isSelf && isDeactivating) {
    return NextResponse.json({ message: "Voce nao pode inativar a propria conta." }, { status: 400 });
  }

  if (isSelf && isCurrentlyAdmin && !willRemainAdmin) {
    return NextResponse.json(
      { message: "Voce nao pode remover o perfil ADMIN da propria conta." },
      { status: 400 }
    );
  }

  if (isCurrentlyAdmin && (!willRemainAdmin || isDeactivating)) {
    const hasBackupAdmin = await ensureAnotherAdmin(id);

    if (!hasBackupAdmin) {
      return NextResponse.json(
        { message: "O sistema precisa manter pelo menos um usuario ADMIN ativo." },
        { status: 400 }
      );
    }
  }

  try {
    const usuario = await prisma.$transaction(async (tx) => {
      const updated = await tx.usuario.update({
        where: { id },
        data: {
          nome: parsed.data.nome.trim(),
          email,
          status: parsed.data.status,
          ...(parsed.data.senha ? { senhaHash: await bcrypt.hash(parsed.data.senha, 10) } : {})
        }
      });

      const roles = await tx.role.findMany({
        where: {
          codigo: {
            in: parsed.data.roles
          }
        }
      });

      await tx.usuarioRole.deleteMany({
        where: { usuarioId: id }
      });

      await tx.usuarioRole.createMany({
        data: roles.map((role) => ({
          usuarioId: id,
          roleId: role.id
        }))
      });

      return tx.usuario.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          roles: {
            include: { role: true },
            orderBy: {
              role: { codigo: "asc" }
            }
          }
        }
      });
    });

    return NextResponse.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      status: usuario.status,
      ultimoLoginEm: usuario.ultimoLoginEm,
      createdAt: usuario.createdAt,
      roles: usuario.roles.map((role) => role.role.codigo)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Ja existe usuario cadastrado com este e-mail." }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar o usuario.", detail: String(error) },
      { status: 500 }
    );
  }
}
