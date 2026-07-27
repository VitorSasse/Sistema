"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { accessModules, mergeModulePermissions, normalizeModulePermissions, type AccessModule, type ModulePermissionMap } from "@/lib/permissions";

type RoleCodigo = "ADMIN" | "GESTOR" | "OPERACIONAL" | "FINANCEIRO" | "CONSULTA";
type RoleEmpresa = "ADMIN_EMPRESA" | "GERENTE" | "OPERADOR" | "FINANCEIRO" | "VISUALIZADOR";
type StatusCadastro = "ATIVO" | "INATIVO";

type UsuarioItem = {
  id: string;
  nome: string;
  email: string;
  status: StatusCadastro;
  roleEmpresa: RoleEmpresa;
  modoSomenteLeitura: boolean;
  permissoesAcesso: ModulePermissionMap;
  ultimoLoginEm: string | null;
  createdAt: string;
  roles: RoleCodigo[];
  empresasAcesso: EmpresaAcessoForm[];
};

type EmpresaOption = {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
};

type EmpresaAcessoForm = {
  empresaId: string;
  nome?: string;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  roleEmpresa: RoleEmpresa;
  status: StatusCadastro;
  padrao: boolean;
  modoSomenteLeitura: boolean;
  permissoesAcesso: ModulePermissionMap;
};

type FormState = {
  id?: string;
  nome: string;
  email: string;
  senha: string;
  status: StatusCadastro;
  roleEmpresa: RoleEmpresa;
  roles: RoleCodigo[];
  modoSomenteLeitura: boolean;
  permissoesAcesso: ModulePermissionMap;
  empresasAcesso: EmpresaAcessoForm[];
};

const roleOptions: { value: RoleCodigo; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "GESTOR", label: "Gestor" },
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "CONSULTA", label: "Consulta" }
];

const roleEmpresaOptions: { value: RoleEmpresa; label: string }[] = [
  { value: "ADMIN_EMPRESA", label: "Administrador da empresa" },
  { value: "GERENTE", label: "Gerente" },
  { value: "OPERADOR", label: "Operador" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "VISUALIZADOR", label: "Visualizador" }
];

const initialForm: FormState = {
  nome: "",
  email: "",
  senha: "",
  status: "ATIVO",
  roleEmpresa: "OPERADOR",
  roles: ["OPERACIONAL"],
  modoSomenteLeitura: false,
  permissoesAcesso: mergeModulePermissions(["OPERACIONAL"]),
  empresasAcesso: []
};

const roleEmpresaByRole: Record<RoleCodigo, RoleEmpresa> = {
  ADMIN: "ADMIN_EMPRESA",
  GESTOR: "GERENTE",
  OPERACIONAL: "OPERADOR",
  FINANCEIRO: "FINANCEIRO",
  CONSULTA: "VISUALIZADOR"
};

function baseRoleFromRoleEmpresa(roleEmpresa: RoleEmpresa): RoleCodigo {
  return (
    roleOptions.find((entry) => roleEmpresaByRole[entry.value] === roleEmpresa)?.value ??
    (roleEmpresa === "VISUALIZADOR" ? "CONSULTA" : "OPERACIONAL")
  );
}

const permissionGroups = accessModules.reduce<Record<string, typeof accessModules>>((groups, module) => {
  groups[module.group] = [...(groups[module.group] ?? []), module];
  return groups;
}, {});

function formatDateTime(value: string | null) {
  if (!value) {
    return "Nunca acessou";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [empresasDisponiveis, setEmpresasDisponiveis] = useState<EmpresaOption[]>([]);
  const [empresaAtualId, setEmpresaAtualId] = useState("");
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [openPermissionGroups, setOpenPermissionGroups] = useState<Record<string, boolean>>({
    Dashboard: true
  });
  const [isPending, startTransition] = useTransition();

  async function loadUsuarios() {
    const response = await fetch("/api/usuarios", { cache: "no-store" });
    const data = (await response.json()) as {
      items?: UsuarioItem[];
      empresasDisponiveis?: EmpresaOption[];
      empresaAtualId?: string;
      message?: string;
    };

    if (!response.ok) {
      setMessage(data.message ?? "Nao foi possivel carregar os usuarios.");
      return;
    }

    const empresas = data.empresasDisponiveis ?? [];
    const currentEmpresaId = data.empresaAtualId ?? empresas[0]?.id ?? "";

    setUsuarios(data.items ?? []);
    setEmpresasDisponiveis(empresas);
    setEmpresaAtualId(currentEmpresaId);
    setForm((current) => {
      if (current.id || current.empresasAcesso.length > 0 || !currentEmpresaId) {
        return current;
      }

      const empresa = empresas.find((item) => item.id === currentEmpresaId);

      return {
        ...current,
        empresasAcesso: [
          {
            empresaId: currentEmpresaId,
            nome: empresa?.nome,
            nomeFantasia: empresa?.nomeFantasia,
            razaoSocial: empresa?.razaoSocial,
            roleEmpresa: current.roleEmpresa,
            status: "ATIVO",
            padrao: true,
            modoSomenteLeitura: current.modoSomenteLeitura,
            permissoesAcesso: current.permissoesAcesso
          }
        ]
      };
    });
  }

  useEffect(() => {
    void loadUsuarios();
  }, []);

  const filteredUsuarios = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return usuarios;
    }

    return usuarios.filter((usuario) =>
      [usuario.nome, usuario.email, usuario.roleEmpresa, usuario.roles.join(" "), usuario.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [search, usuarios]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyBaseProfile(role: RoleCodigo) {
    setForm((current) => ({
      ...current,
      roleEmpresa: roleEmpresaByRole[role],
      roles: [role],
      modoSomenteLeitura: role === "CONSULTA",
      permissoesAcesso: mergeModulePermissions([role]),
      empresasAcesso: current.empresasAcesso.map((empresa) =>
        empresa.padrao
          ? {
              ...empresa,
              roleEmpresa: roleEmpresaByRole[role],
              modoSomenteLeitura: role === "CONSULTA",
              permissoesAcesso: mergeModulePermissions([role])
            }
          : empresa
      )
    }));
  }

  function toggleModulePermission(module: AccessModule, action: "view" | "manage") {
    setForm((current) => {
      const currentPermission = current.permissoesAcesso[module] ?? { view: false, manage: false };
      const nextValue = !currentPermission[action];
      const nextPermission = {
        ...currentPermission,
        [action]: nextValue
      };

      if (action === "manage" && nextValue) {
        nextPermission.view = true;
      }

      if (action === "view" && !nextValue) {
        nextPermission.manage = false;
      }

      if (current.roles[0] === "CONSULTA") {
        nextPermission.manage = false;
      }

      return {
        ...current,
        permissoesAcesso: {
          ...current.permissoesAcesso,
          [module]: nextPermission
        },
        empresasAcesso: current.empresasAcesso.map((empresa) =>
          empresa.padrao
            ? {
                ...empresa,
                permissoesAcesso: {
                  ...empresa.permissoesAcesso,
                  [module]: nextPermission
                }
              }
            : empresa
        )
      };
    });
  }

  function markAllViews() {
    setForm((current) => ({
      ...current,
      permissoesAcesso: Object.fromEntries(
        accessModules
          .filter((module) => module.id !== "master")
          .map((module) => [module.id, { view: true, manage: current.roles[0] === "CONSULTA" ? false : Boolean(current.permissoesAcesso[module.id]?.manage) }])
      ) as ModulePermissionMap,
      empresasAcesso: current.empresasAcesso.map((empresa) =>
        empresa.padrao
          ? {
              ...empresa,
              permissoesAcesso: Object.fromEntries(
                accessModules
                  .filter((module) => module.id !== "master")
                  .map((module) => [module.id, { view: true, manage: current.roles[0] === "CONSULTA" ? false : Boolean(empresa.permissoesAcesso[module.id]?.manage) }])
              ) as ModulePermissionMap
            }
          : empresa
      )
    }));
  }

  function clearAllPermissions() {
    setForm((current) => ({
      ...current,
      permissoesAcesso: Object.fromEntries(
        accessModules.map((module) => [module.id, { view: false, manage: false }])
      ) as ModulePermissionMap,
      empresasAcesso: current.empresasAcesso.map((empresa) =>
        empresa.padrao
          ? {
              ...empresa,
              permissoesAcesso: Object.fromEntries(
                accessModules.map((module) => [module.id, { view: false, manage: false }])
              ) as ModulePermissionMap
            }
          : empresa
      )
    }));
  }

  function restoreBaseProfile() {
    setForm((current) => ({
      ...current,
      permissoesAcesso: mergeModulePermissions(current.roles),
      empresasAcesso: current.empresasAcesso.map((empresa) =>
        empresa.padrao
          ? {
              ...empresa,
              permissoesAcesso: mergeModulePermissions(current.roles)
            }
          : empresa
      )
    }));
  }

  function togglePermissionGroup(group: string) {
    setOpenPermissionGroups((current) => ({
      ...current,
      [group]: !current[group]
    }));
  }

  function handleEdit(usuario: UsuarioItem) {
    const empresasAcesso =
      usuario.empresasAcesso.length > 0
        ? usuario.empresasAcesso
        : empresaAtualId
          ? [
              {
                empresaId: empresaAtualId,
                roleEmpresa: usuario.roleEmpresa,
                status: usuario.status,
                padrao: true,
                modoSomenteLeitura: usuario.modoSomenteLeitura,
                permissoesAcesso: normalizeModulePermissions(usuario.permissoesAcesso)
              }
            ]
          : [];

    setForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      status: usuario.status,
      roleEmpresa: usuario.roleEmpresa,
      roles: usuario.roles,
      modoSomenteLeitura: usuario.modoSomenteLeitura,
      permissoesAcesso: normalizeModulePermissions(usuario.permissoesAcesso),
      empresasAcesso
    });
    setSelectedUserId(usuario.id);
    setMessage(`Editando acesso de ${usuario.nome}.`);
  }

  function handleReset() {
    const empresa = empresasDisponiveis.find((item) => item.id === empresaAtualId);
    setForm({
      ...initialForm,
      empresasAcesso: empresaAtualId
        ? [
            {
              empresaId: empresaAtualId,
              nome: empresa?.nome,
              nomeFantasia: empresa?.nomeFantasia,
              razaoSocial: empresa?.razaoSocial,
              roleEmpresa: initialForm.roleEmpresa,
              status: "ATIVO",
              padrao: true,
              modoSomenteLeitura: initialForm.modoSomenteLeitura,
              permissoesAcesso: initialForm.permissoesAcesso
            }
          ]
        : []
    });
    setSelectedUserId(null);
    setMessage("");
  }

  const filteredEmpresas = useMemo(() => {
    const normalized = empresaSearch.trim().toLowerCase();
    const selected = new Set(form.empresasAcesso.map((item) => item.empresaId));

    return empresasDisponiveis
      .filter((empresa) => !selected.has(empresa.id))
      .filter((empresa) => {
        if (!normalized) {
          return true;
        }

        return [empresa.nome, empresa.nomeFantasia, empresa.razaoSocial].filter(Boolean).join(" ").toLowerCase().includes(normalized);
      });
  }, [empresaSearch, empresasDisponiveis, form.empresasAcesso]);

  function getEmpresaLabel(empresaId: string) {
    const empresa = empresasDisponiveis.find((item) => item.id === empresaId);
    return empresa?.nomeFantasia || empresa?.razaoSocial || empresa?.nome || "Empresa";
  }

  function addEmpresaAcesso(empresa: EmpresaOption) {
    setForm((current) => ({
      ...current,
      empresasAcesso: [
        ...current.empresasAcesso,
        {
          empresaId: empresa.id,
          nome: empresa.nome,
          nomeFantasia: empresa.nomeFantasia,
          razaoSocial: empresa.razaoSocial,
          roleEmpresa: current.roleEmpresa,
          status: "ATIVO",
          padrao: current.empresasAcesso.length === 0,
          modoSomenteLeitura: current.modoSomenteLeitura,
          permissoesAcesso: current.permissoesAcesso
        }
      ]
    }));
    setEmpresaSearch("");
  }

  function removeEmpresaAcesso(empresaId: string) {
    setForm((current) => {
      const next = current.empresasAcesso.filter((item) => item.empresaId !== empresaId);
      return {
        ...current,
        empresasAcesso: next.some((item) => item.padrao) || next.length === 0
          ? next
          : next.map((item, index) => ({ ...item, padrao: index === 0 }))
      };
    });
  }

  function updateEmpresaAcesso(empresaId: string, patch: Partial<EmpresaAcessoForm>) {
    setForm((current) => {
      const next = current.empresasAcesso.map((item) => {
        if (item.empresaId !== empresaId) {
          return patch.padrao ? { ...item, padrao: false } : item;
        }

        const roleEmpresa = patch.roleEmpresa ?? item.roleEmpresa;
        const role = baseRoleFromRoleEmpresa(roleEmpresa);

        return {
          ...item,
          ...patch,
          modoSomenteLeitura: patch.modoSomenteLeitura ?? (roleEmpresa === "VISUALIZADOR" ? true : item.modoSomenteLeitura),
          permissoesAcesso: patch.roleEmpresa ? mergeModulePermissions([role]) : (patch.permissoesAcesso ?? item.permissoesAcesso)
        };
      });
      const defaultEmpresa = next.find((item) => item.padrao) ?? next[0];
      const defaultRole = defaultEmpresa ? baseRoleFromRoleEmpresa(defaultEmpresa.roleEmpresa) : current.roles[0] ?? "OPERACIONAL";

      return {
        ...current,
        roleEmpresa: defaultEmpresa?.roleEmpresa ?? current.roleEmpresa,
        roles: [defaultRole],
        modoSomenteLeitura: defaultEmpresa?.modoSomenteLeitura ?? current.modoSomenteLeitura,
        permissoesAcesso: defaultEmpresa?.permissoesAcesso ?? current.permissoesAcesso,
        empresasAcesso: next
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const endpoint = form.id ? `/api/usuarios/${form.id}` : "/api/usuarios";
    const method = form.id ? "PATCH" : "POST";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          status: form.status,
          roleEmpresa: form.roleEmpresa,
          roles: form.roles,
          modoSomenteLeitura: form.roles[0] === "CONSULTA",
          permissoesAcesso: form.permissoesAcesso,
          empresasAcesso: form.empresasAcesso
        })
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o usuario.");
        return;
      }

      setMessage(
        form.id
          ? "Usuario atualizado com sucesso."
          : "Usuario criado com sucesso."
      );
      handleReset();
      await loadUsuarios();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Usuarios e acessos</h1>
          <p className="page-copy">
            Controle quem entra no sistema e quais modulos cada perfil pode utilizar.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">{form.id ? "Editar acesso" : "Novo acesso"}</h2>
            <p className="section-copy">
              Cadastre quem pode entrar no sistema e defina o perfil de acesso de cada pessoa.
            </p>
          </div>
          {form.id ? (
            <button type="button" className="button-secondary" onClick={handleReset}>
              Cancelar edicao
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="field">
              <span className="field-label">Nome</span>
              <input className="field-control" value={form.nome} onChange={(e) => updateField("nome", e.target.value)} required />
            </label>

            <label className="field">
              <span className="field-label">E-mail</span>
              <input className="field-control" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
            </label>

            <label className="field">
              <span className="field-label">{form.id ? "Nova senha (opcional)" : "Senha inicial"}</span>
              <input
                className="field-control"
                type="password"
                value={form.senha}
                onChange={(e) => updateField("senha", e.target.value)}
                placeholder={form.id ? "Preencha apenas se quiser trocar" : "Minimo 8 caracteres"}
                required={!form.id}
              />
            </label>

            <label className="field">
              <span className="field-label">Status</span>
              <select className="field-control" value={form.status} onChange={(e) => updateField("status", e.target.value as StatusCadastro)}>
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Funcao na empresa</span>
              <select
                className="field-control"
                value={form.roleEmpresa}
                onChange={(e) => {
                  const value = e.target.value as RoleEmpresa;
                  updateField("roleEmpresa", value);
                  if (value === "VISUALIZADOR") {
                    applyBaseProfile("CONSULTA");
                  }
                }}
              >
                {roleEmpresaOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section className="surface-subtle" style={{ display: "grid", gap: 14, padding: 16, borderRadius: 18 }}>
            <div>
              <h3 className="section-title" style={{ fontSize: 16 }}>Empresas permitidas</h3>
              <p className="section-copy">
                O usuario acessa somente a empresa ativa selecionada. Permissoes e funcao podem variar por empresa.
              </p>
            </div>

            <label className="field">
              <span className="field-label">Pesquisar empresas</span>
              <input
                className="field-control"
                value={empresaSearch}
                onChange={(event) => setEmpresaSearch(event.target.value)}
                placeholder="Digite nome fantasia ou razao social"
              />
            </label>

            {empresaSearch.trim() ? (
              <div style={{ display: "grid", gap: 8, maxHeight: 180, overflow: "auto" }}>
                {filteredEmpresas.slice(0, 12).map((empresa) => (
                  <button
                    key={empresa.id}
                    type="button"
                    className="button-secondary"
                    onClick={() => addEmpresaAcesso(empresa)}
                    style={{ justifyContent: "space-between" }}
                  >
                    <span>{empresa.nomeFantasia || empresa.razaoSocial || empresa.nome}</span>
                    <small>Adicionar</small>
                  </button>
                ))}
                {filteredEmpresas.length === 0 ? (
                  <p className="message-inline">Nenhuma empresa encontrada ou todas ja foram selecionadas.</p>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10 }}>
              {form.empresasAcesso.map((empresa) => (
                <div
                  key={empresa.empresaId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1fr) 180px 150px 120px auto",
                    gap: 10,
                    alignItems: "end",
                    padding: 12,
                    border: "1px solid var(--line-soft)",
                    borderRadius: 16,
                    background: "var(--surface)"
                  }}
                >
                  <div>
                    <span className="field-label">Empresa</span>
                    <strong>{getEmpresaLabel(empresa.empresaId)}</strong>
                  </div>
                  <label className="field">
                    <span className="field-label">Funcao nesta empresa</span>
                    <select
                      className="field-control"
                      value={empresa.roleEmpresa}
                      onChange={(event) => updateEmpresaAcesso(empresa.empresaId, { roleEmpresa: event.target.value as RoleEmpresa })}
                    >
                      {roleEmpresaOptions.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Status do vinculo</span>
                    <select
                      className="field-control"
                      value={empresa.status}
                      onChange={(event) => updateEmpresaAcesso(empresa.empresaId, { status: event.target.value as StatusCadastro })}
                    >
                      <option value="ATIVO">ATIVO</option>
                      <option value="INATIVO">INATIVO</option>
                    </select>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, paddingBottom: 12 }}>
                    <input
                      type="radio"
                      name="empresaPadrao"
                      checked={empresa.padrao}
                      onChange={() => updateEmpresaAcesso(empresa.empresaId, { padrao: true })}
                    />
                    Padrao
                  </label>
                  <button
                    type="button"
                    className="button-secondary button-compact"
                    onClick={() => removeEmpresaAcesso(empresa.empresaId)}
                    disabled={form.empresasAcesso.length <= 1}
                  >
                    Remover
                  </button>
                </div>
              ))}
              {form.empresasAcesso.length === 0 ? (
                <p className="message-inline">Selecione ao menos uma empresa permitida para este usuario.</p>
              ) : null}
            </div>
          </section>

          <section className="surface-subtle" style={{ display: "grid", gap: 16, padding: 16, borderRadius: 18 }}>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(220px, 320px) 1fr" }}>
              <label className="field">
                <span className="field-label">Perfil base</span>
                <select
                  className="field-control"
                  value={form.roles[0] ?? "CONSULTA"}
                  onChange={(event) => applyBaseProfile(event.target.value as RoleCodigo)}
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="message-inline" style={{ margin: 0, alignSelf: "end" }}>
                As permissoes abaixo sobrescrevem o perfil base. Perfil Consulta permite apenas visualizacao.
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" className="button-secondary button-compact" onClick={markAllViews}>
                Marcar todas as visualizacoes
              </button>
              <button type="button" className="button-secondary button-compact" onClick={clearAllPermissions}>
                Limpar permissoes
              </button>
              <button type="button" className="button-secondary button-compact" onClick={restoreBaseProfile}>
                Restaurar padrao do perfil
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {Object.entries(permissionGroups).map(([group, modules]) => {
                const isOpen = openPermissionGroups[group] ?? false;

                return (
                  <section
                    key={group}
                    style={{
                      border: "1px solid var(--line-strong)",
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "var(--surface)"
                    }}
                  >
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => togglePermissionGroup(group)}
                      style={{ width: "100%", justifyContent: "space-between", borderRadius: 0 }}
                    >
                      <span>{group}</span>
                      <span>{isOpen ? "Recolher" : "Expandir"}</span>
                    </button>

                    {isOpen ? (
                      <div style={{ display: "grid", gap: 8, padding: 12 }}>
                        {modules.map((module) => {
                          const permission = form.permissoesAcesso[module.id] ?? { view: false, manage: false };
                          const isMasterModule = module.id === "master";
                          const manageDisabled = form.roles[0] === "CONSULTA" || !module.allowManage || isMasterModule;

                          return (
                            <div
                              key={module.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(180px, 1fr) 120px 120px",
                                gap: 12,
                                alignItems: "center",
                                padding: "10px 12px",
                                borderRadius: 14,
                                border: "1px solid var(--line-soft)",
                                background: "var(--surface-strong)"
                              }}
                            >
                              <span>{module.label}</span>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={permission.view === true}
                                  onChange={() => toggleModulePermission(module.id, "view")}
                                  disabled={isMasterModule}
                                />
                                Visualizar
                              </label>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: manageDisabled ? 0.55 : 1 }}>
                                <input
                                  type="checkbox"
                                  checked={permission.manage === true}
                                  onChange={() => toggleModulePermission(module.id, "manage")}
                                  disabled={manageDisabled}
                                />
                                Gerenciar
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </section>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Salvar usuario" : "Criar usuario"}
            </button>
            <button type="button" className="button-secondary" onClick={handleReset}>
              Limpar formulario
            </button>
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Acessos cadastrados</h2>
            <p className="section-copy">
              Veja quem esta ativo, quais perfis tem acesso e quando foi o ultimo login.
            </p>
          </div>

          <label className="field" style={{ minWidth: 280 }}>
            <span className="field-label">Buscar</span>
            <input
              className="field-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou perfil"
            />
          </label>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Funcao</th>
                <th>Perfis</th>
                <th>Modo</th>
                <th>Status</th>
                <th>Ultimo login</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((usuario) => (
                <tr key={usuario.id} style={selectedUserId === usuario.id ? { background: "rgba(249, 115, 22, 0.08)" } : undefined}>
                  <td>{usuario.nome}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.roleEmpresa}</td>
                  <td>{usuario.roles.join(", ")}</td>
                  <td>
                    <span className={usuario.modoSomenteLeitura ? "badge badge-success" : "badge"}>
                      {usuario.modoSomenteLeitura ? "Somente leitura" : "Gerenciamento"}
                    </span>
                  </td>
                  <td>
                    <span className={usuario.status === "ATIVO" ? "badge badge-success" : "badge badge-danger"}>
                      {usuario.status}
                    </span>
                  </td>
                  <td>{formatDateTime(usuario.ultimoLoginEm)}</td>
                  <td>
                    <button type="button" className="button-secondary" onClick={() => handleEdit(usuario)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>
                    Nenhum usuario encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
