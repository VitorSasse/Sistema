import bcrypt from "bcryptjs";
import { Prisma, RoleCodigo, RoleUsuarioEmpresa, StatusCadastro } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma, withUnscopedPrisma } from "@/lib/prisma";
import { validateApiPermission } from "@/lib/auth-guards";
import { accessModules, normalizeModulePermissions, type ModulePermissionMap } from "@/lib/permissions";
import { listarEmpresasUsuario, roleLegadaPorRoleEmpresa } from "@/lib/usuario-empresa";
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

function sanitizePermissions(input: unknown, readOnly: boolean): ModulePermissionMap {
  const normalized = normalizeModulePermissions(input);
  const result: ModulePermissionMap = {};

  for (const module of accessModules) {
    const permission = normalized[module.id];

    if (!permission) {
      continue;
    }

    result[module.id] = {
      view: Boolean(permission.view || (!readOnly && permission.manage)),
      manage: readOnly ? false : Boolean(module.allowManage && permission.manage)
    };
  }

  return result;
}

async function getEmpresasGerenciaveis(session: Session) {
  if (session.user.isMaster) {
    return withUnscopedPrisma((db) =>
      db.empresa.findMany({
        where: { status: "ATIVO", deletedAt: null },
        select: { id: true },
        orderBy: [{ nome: "asc" }]
      })
    );
  }

  const acessos = await withUnscopedPrisma((db) => listarEmpresasUsuario(db, session.user.id));
  return acessos.map((acesso) => ({ id: acesso.empresaId }));
}

async function syncUsuarioEmpresas(
  tx: Prisma.TransactionClient,
  params: {
    usuarioId: string;
    empresasAcesso: Array<{
      empresaId: string;
      roleEmpresa: RoleUsuarioEmpresa;
      status: StatusCadastro;
      padrao: boolean;
      modoSomenteLeitura: boolean;
      permissoesAcesso: ModulePermissionMap;
    }>;
    empresasPermitidas: Set<string>;
  }
) {
  const empresasAcesso = params.empresasAcesso.map((item, index) => {
    const readOnly = item.modoSomenteLeitura || item.roleEmpresa === RoleUsuarioEmpresa.VISUALIZADOR;

    return {
      ...item,
      padrao: item.padrao || (index === 0 && !params.empresasAcesso.some((entry) => entry.padrao)),
      modoSomenteLeitura: readOnly,
      permissoesAcesso: sanitizePermissions(item.permissoesAcesso, readOnly)
    };
  });

  for (const acesso of empresasAcesso) {
    if (!params.empresasPermitidas.has(acesso.empresaId)) {
      throw new Error("EMPRESA_NAO_PERMITIDA");
    }
  }

  await tx.usuarioEmpresa.deleteMany({
    where: {
      usuarioId: params.usuarioId,
      empresaId: { in: Array.from(params.empresasPermitidas) }
    }
  });

  await tx.usuarioEmpresa.createMany({
    data: empresasAcesso.map((acesso) => ({
      usuarioId: params.usuarioId,
      empresaId: acesso.empresaId,
      roleEmpresa: acesso.roleEmpresa,
      status: acesso.status,
      padrao: acesso.padrao,
      modoSomenteLeitura: acesso.modoSomenteLeitura,
      permissoesAcesso: acesso.permissoesAcesso
    }))
  });

  return empresasAcesso.find((item) => item.padrao) ?? empresasAcesso[0];
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

  const existing = await withUnscopedPrisma((db) =>
    db.usuario.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        empresasAcesso: true
      }
    })
  );

  if (!existing) {
    return NextResponse.json({ message: "Usuario nao encontrado." }, { status: 404 });
  }

  const empresasDisponiveis = await getEmpresasGerenciaveis(access.session);
  const empresasPermitidas = new Set(empresasDisponiveis.map((empresa) => empresa.id));
  const empresasAcesso = parsed.data.empresasAcesso.length > 0
    ? parsed.data.empresasAcesso
    : [
        {
          empresaId: existing.empresaId,
          roleEmpresa: parsed.data.roleEmpresa,
          status: parsed.data.status,
          padrao: true,
          modoSomenteLeitura: parsed.data.modoSomenteLeitura || parsed.data.roleEmpresa === "VISUALIZADOR",
          permissoesAcesso: parsed.data.permissoesAcesso
        }
      ];

  const currentRoles = existing.roles.map((item) => item.role.codigo);
  const willRemainAdmin = empresasAcesso.some((item) => roleLegadaPorRoleEmpresa(item.roleEmpresa) === RoleCodigo.ADMIN);
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
    const usuario = await withUnscopedPrisma((db) =>
      db.$transaction(async (tx) => {
        const defaultAccess = await syncUsuarioEmpresas(tx, {
          usuarioId: id,
          empresasAcesso,
          empresasPermitidas
        });
        const roleLegada = roleLegadaPorRoleEmpresa(defaultAccess.roleEmpresa);

        const updated = await tx.usuario.update({
          where: { id },
          data: {
            nome: parsed.data.nome.trim(),
            email,
            status: parsed.data.status,
            empresaId: defaultAccess.empresaId,
            roleEmpresa: defaultAccess.roleEmpresa,
            modoSomenteLeitura: defaultAccess.modoSomenteLeitura,
            permissoesAcesso: defaultAccess.permissoesAcesso,
            ...(parsed.data.senha ? { senhaHash: await bcrypt.hash(parsed.data.senha, 10) } : {})
          }
        });

        const role = await tx.role.findUniqueOrThrow({ where: { codigo: roleLegada } });

        await tx.usuarioRole.deleteMany({ where: { usuarioId: id } });
        await tx.usuarioRole.create({ data: { usuarioId: id, roleId: role.id } });

        return tx.usuario.findUniqueOrThrow({
          where: { id: updated.id },
          include: {
            roles: {
              include: { role: true },
              orderBy: { role: { codigo: "asc" } }
            }
          }
        });
      })
    );

    return NextResponse.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      status: usuario.status,
      roleEmpresa: usuario.roleEmpresa,
      modoSomenteLeitura: usuario.modoSomenteLeitura,
      permissoesAcesso: normalizeModulePermissions(usuario.permissoesAcesso),
      ultimoLoginEm: usuario.ultimoLoginEm,
      createdAt: usuario.createdAt,
      roles: usuario.roles.map((role) => role.role.codigo)
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPRESA_NAO_PERMITIDA") {
      return NextResponse.json({ message: "Uma das empresas selecionadas nao pode ser gerenciada por voce." }, { status: 403 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Ja existe usuario cadastrado com este e-mail." }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar o usuario.", detail: String(error) },
      { status: 500 }
    );
  }
}
