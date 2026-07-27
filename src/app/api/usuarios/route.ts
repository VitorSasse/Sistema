import bcrypt from "bcryptjs";
import { Prisma, RoleUsuarioEmpresa, StatusCadastro } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma, withUnscopedPrisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { validateApiPermission } from "@/lib/auth-guards";
import { accessModules, normalizeModulePermissions, type ModulePermissionMap } from "@/lib/permissions";
import { listarEmpresasUsuario, roleLegadaPorRoleEmpresa } from "@/lib/usuario-empresa";
import { usuarioCreateSchema } from "@/lib/validators/usuario";

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
        select: { id: true, nome: true, nomeFantasia: true, razaoSocial: true },
        orderBy: [{ nome: "asc" }]
      })
    );
  }

  const acessos = await withUnscopedPrisma((db) => listarEmpresasUsuario(db, session.user.id));

  return acessos.map((acesso) => ({
    id: acesso.empresaId,
    nome: acesso.nome,
    nomeFantasia: acesso.nomeFantasia,
    razaoSocial: acesso.razaoSocial
  }));
}

function buildFallbackEmpresaAcesso(params: {
  empresaId: string;
  roleEmpresa: RoleUsuarioEmpresa;
  modoSomenteLeitura: boolean;
  permissoesAcesso: ModulePermissionMap;
}) {
  return [
    {
      empresaId: params.empresaId,
      roleEmpresa: params.roleEmpresa,
      status: StatusCadastro.ATIVO,
      padrao: true,
      modoSomenteLeitura: params.modoSomenteLeitura,
      permissoesAcesso: params.permissoesAcesso
    }
  ];
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
      empresaId: {
        in: Array.from(params.empresasPermitidas)
      }
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

export async function GET() {
  const access = await validateApiPermission("users.manage");

  if (!access.ok) {
    return access.response;
  }

  const empresaId = requireActiveTenantEmpresaId();
  const empresasDisponiveis = await getEmpresasGerenciaveis(access.session);
  const empresasPermitidas = new Set(empresasDisponiveis.map((empresa) => empresa.id));

  const vinculos = await prisma.usuarioEmpresa.findMany({
    where: { empresaId },
    include: {
      usuario: {
        include: {
          roles: {
            include: { role: true },
            orderBy: { role: { codigo: "asc" } }
          },
          empresasAcesso: {
            where: {
              empresaId: { in: Array.from(empresasPermitidas) }
            },
            include: {
              empresa: {
                select: { id: true, nome: true, nomeFantasia: true, razaoSocial: true }
              }
            },
            orderBy: [{ padrao: "desc" }, { empresa: { nome: "asc" } }]
          }
        }
      }
    },
    orderBy: [{ usuario: { nome: "asc" } }]
  });

  return NextResponse.json({
    empresaAtualId: empresaId,
    empresasDisponiveis,
    items: vinculos.map((vinculo) => ({
      id: vinculo.usuario.id,
      nome: vinculo.usuario.nome,
      email: vinculo.usuario.email,
      status: vinculo.usuario.status,
      roleEmpresa: vinculo.roleEmpresa,
      modoSomenteLeitura: vinculo.modoSomenteLeitura,
      permissoesAcesso: normalizeModulePermissions(vinculo.permissoesAcesso),
      ultimoLoginEm: vinculo.usuario.ultimoLoginEm,
      createdAt: vinculo.usuario.createdAt,
      roles: vinculo.usuario.roles.map((role) => role.role.codigo),
      empresasAcesso: vinculo.usuario.empresasAcesso.map((acesso) => ({
        empresaId: acesso.empresaId,
        nome: acesso.empresa.nome,
        nomeFantasia: acesso.empresa.nomeFantasia,
        razaoSocial: acesso.empresa.razaoSocial,
        roleEmpresa: acesso.roleEmpresa,
        status: acesso.status,
        padrao: acesso.padrao,
        modoSomenteLeitura: acesso.modoSomenteLeitura,
        permissoesAcesso: normalizeModulePermissions(acesso.permissoesAcesso)
      }))
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
  const empresaId = requireActiveTenantEmpresaId();
  const empresasDisponiveis = await getEmpresasGerenciaveis(access.session);
  const empresasPermitidas = new Set(empresasDisponiveis.map((empresa) => empresa.id));
  const modoSomenteLeitura = parsed.data.modoSomenteLeitura || parsed.data.roleEmpresa === "VISUALIZADOR";
  const permissoesAcesso = sanitizePermissions(parsed.data.permissoesAcesso, modoSomenteLeitura);
  const empresasAcesso =
    parsed.data.empresasAcesso.length > 0
      ? parsed.data.empresasAcesso
      : buildFallbackEmpresaAcesso({
          empresaId,
          roleEmpresa: parsed.data.roleEmpresa,
          modoSomenteLeitura,
          permissoesAcesso
        });

  try {
    const senhaHash = await bcrypt.hash(parsed.data.senha, 10);

    const usuario = await withUnscopedPrisma((db) =>
      db.$transaction(async (tx) => {
        const existing = await tx.usuario.findUnique({ where: { email } });
        const defaultAccess = empresasAcesso.find((item) => item.padrao) ?? empresasAcesso[0];
        const roleLegada = roleLegadaPorRoleEmpresa(defaultAccess.roleEmpresa);

        const user = existing
          ? await tx.usuario.update({
              where: { id: existing.id },
              data: {
                nome: parsed.data.nome.trim(),
                status: parsed.data.status ?? existing.status,
                empresaId: defaultAccess.empresaId,
                roleEmpresa: defaultAccess.roleEmpresa,
                modoSomenteLeitura: defaultAccess.modoSomenteLeitura,
                permissoesAcesso: defaultAccess.permissoesAcesso
              }
            })
          : await tx.usuario.create({
              data: {
                empresaId: defaultAccess.empresaId,
                nome: parsed.data.nome.trim(),
                email,
                senhaHash,
                status: parsed.data.status ?? StatusCadastro.ATIVO,
                roleEmpresa: defaultAccess.roleEmpresa,
                modoSomenteLeitura: defaultAccess.modoSomenteLeitura,
                permissoesAcesso: defaultAccess.permissoesAcesso
              }
            });

        await syncUsuarioEmpresas(tx, {
          usuarioId: user.id,
          empresasAcesso,
          empresasPermitidas
        });

        const role = await tx.role.findUniqueOrThrow({ where: { codigo: roleLegada } });
        await tx.usuarioRole.deleteMany({ where: { usuarioId: user.id } });
        await tx.usuarioRole.create({ data: { usuarioId: user.id, roleId: role.id } });

        return tx.usuario.findUniqueOrThrow({
          where: { id: user.id },
          include: {
            roles: {
              include: { role: true },
              orderBy: { role: { codigo: "asc" } }
            }
          }
        });
      })
    );

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EMPRESA_NAO_PERMITIDA") {
      return NextResponse.json({ message: "Uma das empresas selecionadas nao pode ser gerenciada por voce." }, { status: 403 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Ja existe usuario cadastrado com este e-mail." }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar o usuario.", detail: String(error) },
      { status: 500 }
    );
  }
}
