import { AsyncLocalStorage } from "node:async_hooks";
import type { RoleUsuarioEmpresa } from "@prisma/client";

export type TenantContext = {
  usuarioId: string;
  empresaId: string;
  roleEmpresa: RoleUsuarioEmpresa;
  isMaster: boolean;
  empresaSelecionadaId?: string | null;
  bypassTenantScope?: boolean;
};

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function setTenantContext(context: TenantContext) {
  tenantStorage.enterWith(context);
}

export function getTenantContext() {
  return tenantStorage.getStore() ?? null;
}

export function runWithTenantContext<T>(context: TenantContext, callback: () => T) {
  return tenantStorage.run(context, callback);
}

export function runWithoutTenantScope<T>(callback: () => T) {
  const current = tenantStorage.getStore();

  if (!current) {
    return callback();
  }

  return tenantStorage.run({ ...current, bypassTenantScope: true }, callback);
}
