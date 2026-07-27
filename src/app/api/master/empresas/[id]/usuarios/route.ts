import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-api";
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

  return access.run(async (db) => {
    const usuarios = await db.usuario.findMany({
      where: {
        empresasAcesso: {
          some: { empresaId: id }
        }
      },
      orderBy: [{ nome: "asc" }],
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
        roleEmpresa: true,
        ultimoLoginEm: true,
        createdAt: true,
        empresasAcesso: {
          where: { empresaId: id },
          select: {
            roleEmpresa: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({
      items: usuarios.map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        status: usuario.empresasAcesso[0]?.status ?? usuario.status,
        roleEmpresa: usuario.empresasAcesso[0]?.roleEmpresa ?? usuario.roleEmpresa,
        ultimoLoginEm: usuario.ultimoLoginEm,
        createdAt: usuario.createdAt
      }))
    });
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

  return access.run(async (db) => {
    try {
      const empresa = await db.empresa.findFirst({
        where: { id, deletedAt: null },
        select: { id: true }
      });

      if (!empresa) {
        return NextResponse.json({ message: "Empresa nao encontrada." }, { status: 404 });
      }

      const roleLegada = roleLegadaPorRoleEmpresa(parsed.data.roleEmpresa);
      const senhaHash = await bcrypt.hash(parsed.data.senha, 10);
      const email = parsed.data.email.trim().toLowerCase();

      const usuario = await db.$transaction(async (tx) => {
        const existing = await tx.usuario.findUnique({ where: { email } });
        const created = existing
          ? await tx.usuario.update({
              where: { id: existing.id },
              data: {
                nome: parsed.data.nome.trim(),
                status: parsed.data.status
              }
            })
          : await tx.usuario.create({
              data: {
                nome: parsed.data.nome.trim(),
                email,
                senhaHash,
                status: parsed.data.status,
                roleEmpresa: parsed.data.roleEmpresa,
                empresaId: id
              }
            });

        const hasDefault = await tx.usuarioEmpresa.findFirst({
          where: { usuarioId: created.id, padrao: true },
          select: { id: true }
        });

        await tx.usuarioEmpresa.upsert({
          where: {
            usuarioId_empresaId: {
              usuarioId: created.id,
              empresaId: id
            }
          },
          create: {
            usuarioId: created.id,
            empresaId: id,
            roleEmpresa: parsed.data.roleEmpresa,
            status: parsed.data.status,
            padrao: !hasDefault
          },
          update: {
            roleEmpresa: parsed.data.roleEmpresa,
            status: parsed.data.status
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
