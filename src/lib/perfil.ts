import type { RoleUsuarioEmpresa } from "@prisma/client";

export type PerfilUsuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  fotoPerfilUrl: string | null;
  empresa: {
    id: string;
    nomeFantasia: string | null;
    razaoSocial: string | null;
  };
  roleEmpresa: RoleUsuarioEmpresa;
  roleLabel: string;
  ultimoLoginEm: string | null;
};

const roleLabels: Record<RoleUsuarioEmpresa, string> = {
  MASTER: "Administrador geral",
  ADMIN_EMPRESA: "Administrador da empresa",
  GERENTE: "Gerente",
  OPERADOR: "Operador",
  FINANCEIRO: "Financeiro",
  VISUALIZADOR: "Visualizador"
};

export function getRoleEmpresaLabel(role: RoleUsuarioEmpresa) {
  return roleLabels[role];
}

export function getUserInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "US";
  }

  return `${parts[0][0] ?? ""}${parts.length > 1 ? parts[parts.length - 1][0] ?? "" : ""}`.toUpperCase();
}
