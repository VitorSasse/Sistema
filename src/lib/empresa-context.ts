import { RoleUsuarioEmpresa, StatusCadastro } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const EMPRESA_PADRAO_ID = "00000000-0000-0000-0000-000000000001";

export type CurrentUserContext = {
  id: string;
  nome: string;
  email: string;
  empresaId: string;
  roleEmpresa: RoleUsuarioEmpresa;
  isMaster: boolean;
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

  const usuario = await prisma.usuario.findUnique({
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
  });

  if (!usuario || usuario.status !== StatusCadastro.ATIVO) {
    return null;
  }

  const isMaster = isMasterRole(usuario.roleEmpresa);

  if (!isMaster && (usuario.empresa.status !== StatusCadastro.ATIVO || usuario.empresa.deletedAt)) {
    return null;
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    empresaId: usuario.empresaId,
    roleEmpresa: usuario.roleEmpresa,
    isMaster,
    empresa: {
      id: usuario.empresa.id,
      nome: usuario.empresa.nome,
      nomeFantasia: usuario.empresa.nomeFantasia,
      razaoSocial: usuario.empresa.razaoSocial,
      cnpj: usuario.empresa.cnpj,
      email: usuario.empresa.email,
      telefone: usuario.empresa.telefone,
      endereco: usuario.empresa.endereco,
      cidade: usuario.empresa.cidade,
      estado: usuario.empresa.estado,
      cep: usuario.empresa.cep,
      logoUrl: usuario.empresa.logoUrl,
      corPrimaria: usuario.empresa.corPrimaria,
      status: usuario.empresa.status
    }
  };
}

export async function getCurrentEmpresaId(options?: { allowMasterGlobal?: boolean }) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (user.isMaster && options?.allowMasterGlobal) {
    return null;
  }

  return user.empresaId;
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
  if (user.isMaster) {
    return where ?? {};
  }

  return {
    ...(where ?? {}),
    empresaId: user.empresaId
  };
}

export function empresaData(user: CurrentUserContext) {
  return {
    empresaId: user.empresaId
  };
}
