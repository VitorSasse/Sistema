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
  permissions: string[];
  ultimoLoginEm: string | null;
};

export type RoleEmpresaDisplay = RoleUsuarioEmpresa | string;

export const roleEmpresaLabels: Record<RoleUsuarioEmpresa, string> = {
  MASTER: "Administrador da Plataforma",
  ADMIN_EMPRESA: "Administrador da Empresa",
  GERENTE: "Gestor",
  OPERADOR: "Operacional",
  FINANCEIRO: "Financeiro",
  VISUALIZADOR: "Consulta"
};

export const roleEmpresaDescriptions: Record<RoleUsuarioEmpresa, string> = {
  MASTER:
    "Administrador do BASEPRO. Possui acesso ao Painel da Plataforma, gerenciamento de empresas, usuarios globais e recursos administrativos da plataforma.",
  ADMIN_EMPRESA:
    "Responsavel pela administracao da empresa contratante. Pode gerenciar usuarios, permissoes e operacoes da empresa.",
  GERENTE:
    "Responsavel pelo gerenciamento operacional da empresa, com amplo acesso aos modulos operacionais conforme as permissoes configuradas.",
  FINANCEIRO:
    "Responsavel pelos modulos financeiros, como medicoes, ordens de compra, orcamentos, faturamento e relatorios financeiros.",
  OPERADOR:
    "Responsavel pela execucao das operacoes do dia a dia, como lancamentos, equipamentos, agenda, obras e processos operacionais permitidos.",
  VISUALIZADOR:
    "Usuario somente leitura. Visualiza apenas os modulos liberados para seu perfil, sem criar, editar ou excluir informacoes."
};

export const roleEmpresaHierarchy: RoleUsuarioEmpresa[] = [
  "MASTER",
  "ADMIN_EMPRESA",
  "GERENTE",
  "FINANCEIRO",
  "OPERADOR",
  "VISUALIZADOR"
];

export function getRoleEmpresaLabel(role: RoleEmpresaDisplay | null | undefined) {
  if (!role) {
    return "Funcao nao informada";
  }

  return roleEmpresaLabels[role as RoleUsuarioEmpresa] ?? String(role);
}

export function getRoleEmpresaDescription(role: RoleEmpresaDisplay | null | undefined) {
  if (!role) {
    return "";
  }

  return roleEmpresaDescriptions[role as RoleUsuarioEmpresa] ?? "";
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
