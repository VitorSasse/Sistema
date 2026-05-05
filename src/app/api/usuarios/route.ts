import bcrypt from "bcryptjs";
import { Prisma, StatusCadastro } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiPermission } from "@/lib/auth-guards";
import { usuarioCreateSchema } from "@/lib/validators/usuario";

export async function GET() {
  const access = await validateApiPermission("users.manage");

  if (!access.ok) {
    return access.response;
  }

  const items = await prisma.usuario.findMany({
    include: {
      roles: {
        include: {
          role: true
        },
        orderBy: {
          role: { codigo: "asc" }
        }
      }
    },
    orderBy: [{ nome: "asc" }]
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      nome: item.nome,
      email: item.email,
      status: item.status,
      ultimoLoginEm: item.ultimoLoginEm,
      createdAt: item.createdAt,
      roles: item.roles.map((role) => role.role.codigo)
    }))
  });
}

export async function POST(request: NextRequest) {
  const access = await validateApiPermission("users.manage");

  if (!access.ok) {
    return access.response;
  }

  const payload = await request.json();
  const parsed = usuarioCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const senhaHash = await bcrypt.hash(parsed.data.senha, 10);

    const usuario = await prisma.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          nome: parsed.data.nome.trim(),
          email,
          senhaHash,
          status: parsed.data.status ?? StatusCadastro.ATIVO
        }
      });

      const roles = await tx.role.findMany({
        where: {
          codigo: {
            in: parsed.data.roles
          }
        }
      });

      await tx.usuarioRole.createMany({
        data: roles.map((role) => ({
          usuarioId: created.id,
          roleId: role.id
        }))
      });

      return tx.usuario.findUniqueOrThrow({
        where: { id: created.id },
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

    return NextResponse.json(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        status: usuario.status,
        ultimoLoginEm: usuario.ultimoLoginEm,
        createdAt: usuario.createdAt,
        roles: usuario.roles.map((role) => role.role.codigo)
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Ja existe usuario cadastrado com este e-mail." }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar o usuario.", detail: String(error) },
      { status: 500 }
    );
  }
}
