import type { RoleCodigo, RoleUsuarioEmpresa } from "@prisma/client";

export type PermissionAction =
  | "users.manage"
  | "masters.manage"
  | "orcamentos.manage"
  | "lancamentos.create"
  | "lancamentos.update"
  | "medicoes.close"
  | "medicoes.cancel"
  | "auditoria.read";

export type AccessAction = "view" | "manage";

export type AccessModule =
  | "dashboard"
  | "dashboard_faturamento"
  | "dashboard_custos"
  | "dashboard_km_horimetro"
  | "dashboard_frota"
  | "dashboard_executivo"
  | "clientes"
  | "obras"
  | "equipamentos"
  | "colaboradores"
  | "servicos"
  | "materiais"
  | "fornecedores"
  | "plano_contas"
  | "centros_custo"
  | "catalogo_compras"
  | "lancamentos"
  | "historico"
  | "programacao"
  | "planos_manutencao"
  | "agenda_manutencao"
  | "leituras"
  | "medicoes"
  | "ordens_compra"
  | "orcamentos"
  | "relatorios"
  | "pdfs"
  | "usuarios"
  | "auditoria"
  | "master";

export type ModulePermission = {
  view?: boolean;
  manage?: boolean;
};

export type ModulePermissionMap = Partial<Record<AccessModule, ModulePermission>>;

export type PermissionSubject = {
  roles?: RoleCodigo[] | string[];
  roleEmpresa?: RoleUsuarioEmpresa | string | null;
  isMaster?: boolean;
  modoSomenteLeitura?: boolean;
  permissoesAcesso?: ModulePermissionMap | null;
};

export const accessModules: Array<{
  id: AccessModule;
  label: string;
  group: string;
  allowManage: boolean;
}> = [
  { id: "dashboard", label: "Dashboard principal", group: "Dashboard", allowManage: false },
  { id: "dashboard_faturamento", label: "Dashboard de faturamento", group: "Dashboard", allowManage: false },
  { id: "dashboard_custos", label: "Dashboard de custos", group: "Dashboard", allowManage: false },
  { id: "dashboard_km_horimetro", label: "KM/Horimetro mensal", group: "Dashboard", allowManage: false },
  { id: "dashboard_frota", label: "Dashboard da frota", group: "Dashboard", allowManage: false },
  { id: "dashboard_executivo", label: "Dashboard executivo", group: "Dashboard", allowManage: false },
  { id: "clientes", label: "Clientes", group: "Cadastros", allowManage: true },
  { id: "obras", label: "Obras", group: "Cadastros", allowManage: true },
  { id: "equipamentos", label: "Equipamentos", group: "Cadastros", allowManage: true },
  { id: "colaboradores", label: "Colaboradores", group: "Cadastros", allowManage: true },
  { id: "servicos", label: "Servicos", group: "Cadastros", allowManage: true },
  { id: "materiais", label: "Materiais", group: "Cadastros", allowManage: true },
  { id: "fornecedores", label: "Fornecedores", group: "Financeiro", allowManage: true },
  { id: "plano_contas", label: "Plano de contas", group: "Financeiro", allowManage: true },
  { id: "centros_custo", label: "Centros de custo", group: "Financeiro", allowManage: true },
  { id: "catalogo_compras", label: "Produtos e servicos de compra", group: "Financeiro", allowManage: true },
  { id: "ordens_compra", label: "Ordens de compra", group: "Financeiro", allowManage: true },
  { id: "lancamentos", label: "Lancamentos", group: "Operacional", allowManage: true },
  { id: "historico", label: "Historico", group: "Operacional", allowManage: false },
  { id: "programacao", label: "Agenda operacional", group: "Operacional", allowManage: true },
  { id: "planos_manutencao", label: "Plano preventivo", group: "Frota", allowManage: true },
  { id: "agenda_manutencao", label: "Agenda de manutencao", group: "Frota", allowManage: true },
  { id: "leituras", label: "Horimetro e KM", group: "Frota", allowManage: true },
  { id: "medicoes", label: "Medicoes", group: "Financeiro", allowManage: true },
  { id: "orcamentos", label: "Orcamentos", group: "Financeiro", allowManage: true },
  { id: "relatorios", label: "Relatorios", group: "Relatorios e documentos", allowManage: false },
  { id: "pdfs", label: "PDFs", group: "Relatorios e documentos", allowManage: true },
  { id: "usuarios", label: "Usuarios", group: "Administracao", allowManage: true },
  { id: "auditoria", label: "Logs e auditoria", group: "Administracao", allowManage: false },
  { id: "master", label: "Painel da Plataforma", group: "Administracao", allowManage: true }
];

const rolePermissions: Record<RoleCodigo, PermissionAction[]> = {
  ADMIN: [
    "users.manage",
    "masters.manage",
    "orcamentos.manage",
    "lancamentos.create",
    "lancamentos.update",
    "medicoes.close",
    "medicoes.cancel",
    "auditoria.read"
  ],
  GESTOR: [
    "masters.manage",
    "orcamentos.manage",
    "lancamentos.create",
    "lancamentos.update",
    "medicoes.close",
    "medicoes.cancel",
    "auditoria.read"
  ],
  OPERACIONAL: ["lancamentos.create", "lancamentos.update"],
  FINANCEIRO: ["orcamentos.manage", "medicoes.close"],
  CONSULTA: []
};

const roleModulePermissions: Record<RoleCodigo, ModulePermissionMap> = {
  ADMIN: Object.fromEntries(accessModules.map((module) => [module.id, { view: true, manage: module.allowManage }])) as ModulePermissionMap,
  GESTOR: {
    dashboard: { view: true },
    dashboard_faturamento: { view: true },
    dashboard_custos: { view: true },
    dashboard_km_horimetro: { view: true },
    dashboard_frota: { view: true },
    dashboard_executivo: { view: true },
    clientes: { view: true, manage: true },
    obras: { view: true, manage: true },
    equipamentos: { view: true, manage: true },
    colaboradores: { view: true, manage: true },
    servicos: { view: true, manage: true },
    materiais: { view: true, manage: true },
    fornecedores: { view: true, manage: true },
    plano_contas: { view: true, manage: true },
    centros_custo: { view: true, manage: true },
    catalogo_compras: { view: true, manage: true },
    ordens_compra: { view: true, manage: true },
    lancamentos: { view: true, manage: true },
    historico: { view: true },
    programacao: { view: true, manage: true },
    planos_manutencao: { view: true, manage: true },
    agenda_manutencao: { view: true, manage: true },
    leituras: { view: true, manage: true },
    medicoes: { view: true, manage: true },
    orcamentos: { view: true, manage: true },
    relatorios: { view: true },
    pdfs: { view: true },
    auditoria: { view: true }
  },
  OPERACIONAL: {
    dashboard: { view: true },
    dashboard_km_horimetro: { view: true },
    dashboard_frota: { view: true },
    equipamentos: { view: true },
    lancamentos: { view: true, manage: true },
    historico: { view: true },
    programacao: { view: true, manage: true },
    planos_manutencao: { view: true },
    agenda_manutencao: { view: true, manage: true },
    leituras: { view: true, manage: true },
    medicoes: { view: true },
    pdfs: { view: true }
  },
  FINANCEIRO: {
    dashboard: { view: true },
    dashboard_faturamento: { view: true },
    dashboard_custos: { view: true },
    clientes: { view: true },
    obras: { view: true },
    fornecedores: { view: true, manage: true },
    plano_contas: { view: true, manage: true },
    centros_custo: { view: true, manage: true },
    catalogo_compras: { view: true, manage: true },
    ordens_compra: { view: true, manage: true },
    medicoes: { view: true, manage: true },
    orcamentos: { view: true, manage: true },
    relatorios: { view: true },
    pdfs: { view: true }
  },
  CONSULTA: Object.fromEntries(
    accessModules
      .filter((module) => module.id !== "usuarios" && module.id !== "master")
      .map((module) => [module.id, { view: true, manage: false }])
  ) as ModulePermissionMap
};

const roleEmpresaBaseRole: Record<RoleUsuarioEmpresa, RoleCodigo | null> = {
  MASTER: "ADMIN",
  ADMIN_EMPRESA: "ADMIN",
  GERENTE: "GESTOR",
  OPERADOR: "OPERACIONAL",
  FINANCEIRO: "FINANCEIRO",
  VISUALIZADOR: "CONSULTA"
};

export function normalizeModulePermissions(value: unknown): ModulePermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: ModulePermissionMap = {};

  for (const module of accessModules) {
    const raw = source[module.id];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      continue;
    }

    const entry = raw as Record<string, unknown>;
    result[module.id] = {
      view: entry.view === true,
      manage: module.allowManage && entry.manage === true
    };
  }

  return result;
}

export function mergeModulePermissions(roles: RoleCodigo[] | string[] = []): ModulePermissionMap {
  const result: ModulePermissionMap = {};

  for (const role of roles) {
    const permissions = roleModulePermissions[role as RoleCodigo];

    if (!permissions) {
      continue;
    }

    for (const [module, permission] of Object.entries(permissions) as Array<[AccessModule, ModulePermission]>) {
      result[module] = {
        view: Boolean(result[module]?.view || permission.view),
        manage: Boolean(result[module]?.manage || permission.manage)
      };
    }
  }

  return result;
}

function hasExplicitModulePermissions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return accessModules.some((module) => Object.prototype.hasOwnProperty.call(value, module.id));
}

export function buildReadOnlyPermissions(modules: AccessModule[] = accessModules.map((module) => module.id)): ModulePermissionMap {
  return Object.fromEntries(modules.map((module) => [module, { view: true, manage: false }])) as ModulePermissionMap;
}

export function canAccessModule(subject: PermissionSubject, module: AccessModule, action: AccessAction) {
  if (subject.isMaster) {
    return true;
  }

  const roleEmpresa = subject.roleEmpresa as RoleUsuarioEmpresa | undefined;
  const roles = subject.roles?.length
    ? subject.roles
    : roleEmpresa && roleEmpresaBaseRole[roleEmpresa]
      ? [roleEmpresaBaseRole[roleEmpresa] as RoleCodigo]
      : [];
  const hasCustomPermissions = hasExplicitModulePermissions(subject.permissoesAcesso);
  const roleDefaults = hasCustomPermissions ? {} : mergeModulePermissions(roles);
  const custom = normalizeModulePermissions(subject.permissoesAcesso);
  const permission = hasCustomPermissions ? custom[module] : roleDefaults[module];

  if (action === "view") {
    return Boolean(permission?.view || permission?.manage);
  }

  if (subject.modoSomenteLeitura || roleEmpresa === "VISUALIZADOR") {
    return false;
  }

  return Boolean(permission?.manage);
}

export function hasPermission(
  roles: RoleCodigo[] | string[],
  permission: PermissionAction,
  subject?: PermissionSubject
): boolean {
  if (subject?.isMaster) {
    return true;
  }

  if (subject?.modoSomenteLeitura || subject?.roleEmpresa === "VISUALIZADOR") {
    const readOnlyAllowed: PermissionAction[] = ["auditoria.read"];
    return readOnlyAllowed.includes(permission);
  }

  return roles.some((role) => {
    const normalizedRole = role as RoleCodigo;
    return rolePermissions[normalizedRole]?.includes(permission);
  });
}

export function permissionActionToModule(permission: PermissionAction): { module: AccessModule; action: AccessAction } | null {
  const map: Record<PermissionAction, { module: AccessModule; action: AccessAction }> = {
    "users.manage": { module: "usuarios", action: "manage" },
    "masters.manage": { module: "master", action: "manage" },
    "orcamentos.manage": { module: "orcamentos", action: "manage" },
    "lancamentos.create": { module: "lancamentos", action: "manage" },
    "lancamentos.update": { module: "lancamentos", action: "manage" },
    "medicoes.close": { module: "medicoes", action: "manage" },
    "medicoes.cancel": { module: "medicoes", action: "manage" },
    "auditoria.read": { module: "auditoria", action: "view" }
  };

  return map[permission] ?? null;
}

const routeModuleMap: Array<{ prefix: string; module: AccessModule }> = [
  { prefix: "/dashboard/custos", module: "dashboard_custos" },
  { prefix: "/dashboard/km-horimetro", module: "dashboard_km_horimetro" },
  { prefix: "/dashboard/mensal", module: "dashboard_faturamento" },
  { prefix: "/dashboard/executivo", module: "dashboard_executivo" },
  { prefix: "/dashboard", module: "dashboard_faturamento" },
  { prefix: "/frota/dashboard", module: "dashboard_frota" },
  { prefix: "/frota/leituras", module: "leituras" },
  { prefix: "/frota/manutencao", module: "agenda_manutencao" },
  { prefix: "/frota/planos", module: "planos_manutencao" },
  { prefix: "/clientes", module: "clientes" },
  { prefix: "/obras", module: "obras" },
  { prefix: "/equipamentos", module: "equipamentos" },
  { prefix: "/materiais", module: "materiais" },
  { prefix: "/servicos", module: "servicos" },
  { prefix: "/colaboradores", module: "colaboradores" },
  { prefix: "/fornecedores", module: "fornecedores" },
  { prefix: "/plano-contas", module: "plano_contas" },
  { prefix: "/centros-custo", module: "centros_custo" },
  { prefix: "/catalogo-compras", module: "catalogo_compras" },
  { prefix: "/ordens-compra", module: "ordens_compra" },
  { prefix: "/lancamentos", module: "lancamentos" },
  { prefix: "/historico", module: "historico" },
  { prefix: "/programacao", module: "programacao" },
  { prefix: "/medicoes", module: "medicoes" },
  { prefix: "/orcamentos", module: "orcamentos" },
  { prefix: "/usuarios", module: "usuarios" },
  { prefix: "/seguranca/cabecalhos-documentos", module: "pdfs" },
  { prefix: "/seguranca/logs-lancamentos", module: "auditoria" },
  { prefix: "/master", module: "master" }
];

const apiModuleMap: Array<{ prefix: string; module: AccessModule }> = [
  { prefix: "/api/dashboard/custos", module: "dashboard_custos" },
  { prefix: "/api/dashboard/km-horimetro", module: "dashboard_km_horimetro" },
  { prefix: "/api/dashboard/faturamento", module: "dashboard_faturamento" },
  { prefix: "/api/dashboard/executivo", module: "dashboard_executivo" },
  { prefix: "/api/dashboard", module: "dashboard" },
  { prefix: "/api/frota/dashboard", module: "dashboard_frota" },
  { prefix: "/api/frota/leituras", module: "leituras" },
  { prefix: "/api/frota/manutencao", module: "agenda_manutencao" },
  { prefix: "/api/frota/planos", module: "planos_manutencao" },
  { prefix: "/api/clientes", module: "clientes" },
  { prefix: "/api/obras", module: "obras" },
  { prefix: "/api/equipamentos", module: "equipamentos" },
  { prefix: "/api/materiais", module: "materiais" },
  { prefix: "/api/servicos", module: "servicos" },
  { prefix: "/api/colaboradores", module: "colaboradores" },
  { prefix: "/api/fornecedores", module: "fornecedores" },
  { prefix: "/api/plano-contas", module: "plano_contas" },
  { prefix: "/api/centros-custo", module: "centros_custo" },
  { prefix: "/api/catalogo-compras", module: "catalogo_compras" },
  { prefix: "/api/ordens-compra", module: "ordens_compra" },
  { prefix: "/api/lancamentos", module: "lancamentos" },
  { prefix: "/api/historico-alteracoes", module: "historico" },
  { prefix: "/api/programacao", module: "programacao" },
  { prefix: "/api/medicoes", module: "medicoes" },
  { prefix: "/api/orcamentos", module: "orcamentos" },
  { prefix: "/api/usuarios", module: "usuarios" },
  { prefix: "/api/seguranca/cabecalhos-documentos", module: "pdfs" },
  { prefix: "/api/seguranca/logs-lancamentos", module: "auditoria" },
  { prefix: "/api/master", module: "master" }
];

function matchRoute(pathname: string, map: Array<{ prefix: string; module: AccessModule }>) {
  return map.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`))?.module ?? null;
}

export function moduleFromPathname(pathname: string) {
  return matchRoute(pathname, routeModuleMap);
}

export function moduleFromApiPathname(pathname: string) {
  return matchRoute(pathname, apiModuleMap);
}
