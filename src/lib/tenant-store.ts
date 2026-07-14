import { AsyncLocalStorage } from "node:async_hooks";
import type { RoleUsuarioEmpresa } from "@prisma/client";

export type TenantContext = {
  usuarioId: string | null;
  empresaId: string | null;
  roleEmpresa: RoleUsuarioEmpresa | null;
  isMaster: boolean;
  empresaSelecionadaId?: string | null;
  bypassTenantScope?: boolean;
  initialized: boolean;
};

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function setTenantContext(context: TenantContext) {
  tenantStorage.enterWith(context);
}

export function beginTenantContext() {
  const context: TenantContext = {
    usuarioId: null,
    empresaId: null,
    roleEmpresa: null,
    isMaster: false,
    empresaSelecionadaId: null,
    bypassTenantScope: true,
    initialized: false
  };

  // Executado antes do primeiro await da autenticacao para que a continuacao
  // da Route Handler herde o mesmo contexto isolado.
  tenantStorage.enterWith(context);
  return context;
}

export function resolveTenantContext(
  context: TenantContext,
  value: Omit<TenantContext, "initialized" | "bypassTenantScope"> | null
) {
  Object.assign(
    context,
    value ?? {
      usuarioId: null,
      empresaId: null,
      roleEmpresa: null,
      isMaster: false,
      empresaSelecionadaId: null
    },
    {
      initialized: true,
      bypassTenantScope: false
    }
  );
}

export function getTenantContext() {
  return tenantStorage.getStore() ?? null;
}

export function runWithTenantContext<T>(context: TenantContext, callback: () => T | Promise<T>) {
  return tenantStorage.run(context, async () => await callback());
}

export function runWithoutTenantScope<T>(callback: () => T | Promise<T>) {
  const current = tenantStorage.getStore();
  const bypassContext: TenantContext = current
    ? { ...current, bypassTenantScope: true }
    : {
        usuarioId: null,
        empresaId: null,
        roleEmpresa: null,
        isMaster: false,
        empresaSelecionadaId: null,
        initialized: true,
        bypassTenantScope: true
      };

  return tenantStorage.run(bypassContext, async () => await callback());
}

export function getActiveTenantEmpresaId() {
  const tenant = tenantStorage.getStore();

  if (!tenant?.initialized || tenant.bypassTenantScope) {
    return null;
  }

  return tenant.isMaster ? tenant.empresaSelecionadaId ?? null : tenant.empresaId;
}

export function requireActiveTenantEmpresaId() {
  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    throw new Error("Empresa ativa nao definida no contexto da requisicao.");
  }

  return empresaId;
}
