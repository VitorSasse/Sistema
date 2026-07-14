import { Prisma } from "@prisma/client";
import { getRoleEmpresaLabel, type PerfilUsuario } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";

export const perfilUsuarioSelect = Prisma.validator<Prisma.UsuarioSelect>()({
  id: true,
  nome: true,
  email: true,
  telefone: true,
  cargo: true,
  fotoPerfilUrl: true,
  roleEmpresa: true,
  ultimoLoginEm: true,
  updatedAt: true,
  empresa: {
    select: {
      id: true,
      nomeFantasia: true,
      razaoSocial: true
    }
  },
  roles: {
    select: {
      role: {
        select: {
          nome: true
        }
      }
    },
    orderBy: {
      role: { nome: "asc" }
    }
  }
});

type PerfilUsuarioRecord = Prisma.UsuarioGetPayload<{
  select: typeof perfilUsuarioSelect;
}>;

export function serializePerfilUsuario(usuario: PerfilUsuarioRecord): PerfilUsuario {
  const { roles, updatedAt, ...perfil } = usuario;

  return {
    ...perfil,
    fotoPerfilUrl: usuario.fotoPerfilUrl ? `/api/perfil/foto?v=${updatedAt.getTime()}` : null,
    ultimoLoginEm: usuario.ultimoLoginEm?.toISOString() ?? null,
    roleLabel: getRoleEmpresaLabel(usuario.roleEmpresa),
    permissions: roles.map((item) => item.role.nome)
  };
}

export async function getPerfilUsuario(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: perfilUsuarioSelect
  });

  return usuario ? serializePerfilUsuario(usuario) : null;
}
