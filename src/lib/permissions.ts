import { RoleCodigo } from "@prisma/client";

export type PermissionAction =
  | "users.manage"
  | "masters.manage"
  | "lancamentos.create"
  | "lancamentos.update"
  | "medicoes.close"
  | "medicoes.cancel"
  | "auditoria.read";

const rolePermissions: Record<RoleCodigo, PermissionAction[]> = {
  ADMIN: [
    "users.manage",
    "masters.manage",
    "lancamentos.create",
    "lancamentos.update",
    "medicoes.close",
    "medicoes.cancel",
    "auditoria.read"
  ],
  GESTOR: [
    "masters.manage",
    "lancamentos.create",
    "lancamentos.update",
    "medicoes.close",
    "medicoes.cancel",
    "auditoria.read"
  ],
  OPERACIONAL: ["lancamentos.create", "lancamentos.update"],
  FINANCEIRO: ["medicoes.close"],
  CONSULTA: []
};

export function hasPermission(
  roles: RoleCodigo[] | string[],
  permission: PermissionAction
): boolean {
  return roles.some((role) => {
    const normalizedRole = role as RoleCodigo;
    return rolePermissions[normalizedRole]?.includes(permission);
  });
}
