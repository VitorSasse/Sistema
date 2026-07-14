import { RoleUsuarioEmpresa, StatusCadastro } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, runWithoutTenantScope } from "@/lib/tenant-store";

export type CurrentUserContext = {
  id: string;
  nome: string;
  email: string;
  empresaId: string;
  roleEmpresa: RoleUsuarioEmpresa;
  isMaster: boolean;
  empresaSelecionadaId: string | null;
  empresa: {
    id: string;
    nome: string;
    nomeFantasia: string | null;
    razaoSocial: string | null;
    cnpj: string | null;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    logoUrl: string | null;
    corPrimaria: string | null;
    status: StatusCadastro;
  };
};

export function isMasterRole(roleEmpresa: RoleUsuarioEmpresa | string | null | undefined) {
  return roleEmpresa === RoleUsuarioEmpresa.MASTER;
}

export async function getCurrentUser(): Promise<CurrentUserContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const usuario = await runWithoutTenantScope(() =>
    prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        empresaId: true,
        roleEmpresa: true,
        status: true,
        empresa: {
          select: {
            id: true,
            nome: true,
            nomeFantasia: true,
            razaoSocial: true,
            cnpj: true,
            email: true,
            telefone: true,
            endereco: true,
            cidade: true,
            estado: true,
            cep: true,
            logoUrl: true,
            corPrimaria: true,
            status: true,
            deletedAt: true
          }
        }
      }
    })
  );

  if (!usuario || usuario.status !== StatusCadastro.ATIVO) {
    return null;
  }

  const isMaster = isMasterRole(usuario.roleEmpresa);
  const tenant = getTenantContext();
  const empresaSelecionadaId = tenant?.empresaSelecionadaId ?? null;

  const empresaContexto =
    isMaster && empresaSelecionadaId
      ? await runWithoutTenantScope(() =>
          prisma.empresa.findFirst({
            where: { id: empresaSelecionadaId, deletedAt: null },
            select: {
              id: true,
              nome: true,
              nomeFantasia: true,
              razaoSocial: true,
              cnpj: true,
              email: true,
              telefone: true,
              endereco: true,
              cidade: true,
              estado: true,
              cep: true,
              logoUrl: true,
              corPrimaria: true,
              status: true,
              deletedAt: true
            }
          })
        )
      : usuario.empresa;

  if (!isMaster && (usuario.empresa.status !== StatusCadastro.ATIVO || usuario.empresa.deletedAt)) {
    return null;
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    empresaId: empresaContexto?.id ?? usuario.empresaId,
    roleEmpresa: usuario.roleEmpresa,
    isMaster,
    empresaSelecionadaId: empresaContexto?.id === empresaSelecionadaId ? empresaSelecionadaId : null,
    empresa: {
      id: empresaContexto?.id ?? usuario.empresa.id,
      nome: empresaContexto?.nome ?? usuario.empresa.nome,
      nomeFantasia: empresaContexto?.nomeFantasia ?? usuario.empresa.nomeFantasia,
      razaoSocial: empresaContexto?.razaoSocial ?? usuario.empresa.razaoSocial,
      cnpj: empresaContexto?.cnpj ?? usuario.empresa.cnpj,
      email: empresaContexto?.email ?? usuario.empresa.email,
      telefone: empresaContexto?.telefone ?? usuario.empresa.telefone,
      endereco: empresaContexto?.endereco ?? usuario.empresa.endereco,
      cidade: empresaContexto?.cidade ?? usuario.empresa.cidade,
      estado: empresaContexto?.estado ?? usuario.empresa.estado,
      cep: empresaContexto?.cep ?? usuario.empresa.cep,
      logoUrl: empresaContexto?.logoUrl ?? usuario.empresa.logoUrl,
      corPrimaria: empresaContexto?.corPrimaria ?? usuario.empresa.corPrimaria,
      status: empresaContexto?.status ?? usuario.empresa.status
    }
  };
}

export async function getCurrentEmpresaId(options?: { allowMasterGlobal?: boolean }) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (user.isMaster && options?.allowMasterGlobal && !user.empresaSelecionadaId) {
    return null;
  }

  return user.empresaSelecionadaId ?? user.empresaId;
}

export async function requireEmpresaAccess(empresaId?: string | null) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (empresaId && !user.isMaster && user.empresaId !== empresaId) {
    redirect("/dashboard");
  }

  return user;
}

export async function requireRole(roles: RoleUsuarioEmpresa[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!roles.includes(user.roleEmpresa)) {
    redirect("/dashboard");
  }

  return user;
}

export async function validateApiEmpresaAccess(empresaId?: string | null): Promise<
  | { ok: true; user: CurrentUserContext }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Nao autenticado." }, { status: 401 })
    };
  }

  if (empresaId && !user.isMaster && user.empresaId !== empresaId) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Sem acesso a esta empresa." }, { status: 403 })
    };
  }

  return { ok: true, user };
}

export function scopedEmpresaWhere<TWhere extends Record<string, unknown>>(
  user: CurrentUserContext,
  where?: TWhere
) {
  const empresaId = user.isMaster ? user.empresaSelecionadaId : user.empresaId;

  if (!empresaId) {
    throw new Error("Selecione uma empresa antes de acessar dados operacionais.");
  }

  return {
    ...(where ?? {}),
    empresaId
  };
}

export function empresaData(user: CurrentUserContext) {
  const empresaId = user.isMaster ? user.empresaSelecionadaId : user.empresaId;

  if (!empresaId) {
    throw new Error("Selecione uma empresa antes de criar dados operacionais.");
  }

  return {
    empresaId
  };
}
