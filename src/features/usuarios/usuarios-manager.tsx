"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { accessModules, buildReadOnlyPermissions, mergeModulePermissions, normalizeModulePermissions, type AccessModule, type ModulePermissionMap } from "@/lib/permissions";

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
  permissoesAcesso: mergeModulePermissions(["OPERACIONAL"])
};

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
  const [form, setForm] = useState<FormState>(initialForm);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadUsuarios() {
    const response = await fetch("/api/usuarios", { cache: "no-store" });
    const data = (await response.json()) as { items?: UsuarioItem[]; message?: string };

    if (!response.ok) {
      setMessage(data.message ?? "Nao foi possivel carregar os usuarios.");
      return;
    }

    setUsuarios(data.items ?? []);
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

  function updateReadOnly(value: boolean) {
    setForm((current) => ({
      ...current,
      modoSomenteLeitura: value,
      roleEmpresa: value ? "VISUALIZADOR" : current.roleEmpresa,
      roles: value ? ["CONSULTA"] : current.roles,
      permissoesAcesso: value
        ? normalizeModulePermissions(
            Object.fromEntries(
              Object.entries(current.permissoesAcesso).map(([module, permission]) => [
                module,
                { view: permission?.view === true, manage: false }
              ])
            )
          )
        : current.permissoesAcesso
    }));
  }

  function toggleRole(role: RoleCodigo) {
    setForm((current) => {
      const hasRole = current.roles.includes(role);
      const nextRoles = hasRole
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];

      return {
        ...current,
        roles: nextRoles.length > 0 ? nextRoles : current.roles,
        permissoesAcesso: current.modoSomenteLeitura
          ? current.permissoesAcesso
          : mergeModulePermissions(nextRoles.length > 0 ? nextRoles : current.roles)
      };
    });
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

      if (current.modoSomenteLeitura) {
        nextPermission.manage = false;
      }

      return {
        ...current,
        permissoesAcesso: {
          ...current.permissoesAcesso,
          [module]: nextPermission
        }
      };
    });
  }

  function markAllViews() {
    setForm((current) => ({
      ...current,
      permissoesAcesso: Object.fromEntries(
        accessModules
          .filter((module) => module.id !== "master")
          .map((module) => [module.id, { view: true, manage: current.modoSomenteLeitura ? false : Boolean(current.permissoesAcesso[module.id]?.manage) }])
      ) as ModulePermissionMap
    }));
  }

  function clearAllPermissions() {
    setForm((current) => ({
      ...current,
      permissoesAcesso: {}
    }));
  }

  function applyReadOnlyProfile() {
    setForm((current) => ({
      ...current,
      roleEmpresa: "VISUALIZADOR",
      roles: ["CONSULTA"],
      modoSomenteLeitura: true,
      permissoesAcesso: buildReadOnlyPermissions(accessModules.filter((module) => module.id !== "master").map((module) => module.id))
    }));
  }

  function applyRoleProfile(roles: RoleCodigo[], roleEmpresa: RoleEmpresa) {
    setForm((current) => ({
      ...current,
      roleEmpresa,
      roles,
      modoSomenteLeitura: false,
      permissoesAcesso: mergeModulePermissions(roles)
    }));
  }

  function handleEdit(usuario: UsuarioItem) {
    setForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      status: usuario.status,
      roleEmpresa: usuario.roleEmpresa,
      roles: usuario.roles,
      modoSomenteLeitura: usuario.modoSomenteLeitura,
      permissoesAcesso: normalizeModulePermissions(usuario.permissoesAcesso)
    });
    setSelectedUserId(usuario.id);
    setMessage(`Editando acesso de ${usuario.nome}.`);
  }

  function handleReset() {
    setForm(initialForm);
    setSelectedUserId(null);
    setMessage("");
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
          modoSomenteLeitura: form.modoSomenteLeitura,
          permissoesAcesso: form.permissoesAcesso
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
                    updateReadOnly(true);
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

          <div className="field">
            <span className="field-label">Perfis de acesso</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {roleOptions.map((role) => {
                const checked = form.roles.includes(role.value);
                return (
                  <label
                    key={role.value}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: checked ? "1px solid rgba(249, 115, 22, 0.35)" : "1px solid var(--line-strong)",
                      background: checked ? "rgba(249, 115, 22, 0.14)" : "var(--surface-strong)",
                      color: "var(--text)"
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleRole(role.value)} />
                    <span>{role.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <section className="surface-subtle" style={{ display: "grid", gap: 16, padding: 16, borderRadius: 18 }}>
            <div className="section-header" style={{ alignItems: "flex-start" }}>
              <div>
                <h3 className="section-title" style={{ fontSize: 18 }}>Permissoes de acesso</h3>
                <p className="section-copy">
                  Defina as telas liberadas. Visualizar permite consulta; gerenciar permite criar, editar, excluir e alterar status.
                </p>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid var(--line-strong)",
                  background: form.modoSomenteLeitura ? "rgba(34, 197, 94, 0.12)" : "var(--surface-strong)"
                }}
              >
                <input
                  type="checkbox"
                  checked={form.modoSomenteLeitura}
                  onChange={(event) => updateReadOnly(event.target.checked)}
                />
                <span>Modo somente leitura</span>
              </label>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" className="button-secondary button-compact" onClick={markAllViews}>
                Marcar todas as visualizacoes
              </button>
              <button type="button" className="button-secondary button-compact" onClick={clearAllPermissions}>
                Desmarcar todas
              </button>
              <button type="button" className="button-secondary button-compact" onClick={applyReadOnlyProfile}>
                Aplicar perfil somente leitura
              </button>
              <button type="button" className="button-secondary button-compact" onClick={() => applyRoleProfile(["OPERACIONAL"], "OPERADOR")}>
                Aplicar perfil operacional
              </button>
              <button type="button" className="button-secondary button-compact" onClick={() => applyRoleProfile(["FINANCEIRO"], "FINANCEIRO")}>
                Aplicar perfil financeiro
              </button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries(permissionGroups).map(([group, modules]) => (
                <div key={group} style={{ display: "grid", gap: 10 }}>
                  <strong style={{ color: "var(--text)" }}>{group}</strong>
                  <div style={{ display: "grid", gap: 8 }}>
                    {modules.map((module) => {
                      const permission = form.permissoesAcesso[module.id] ?? { view: false, manage: false };
                      const isMasterModule = module.id === "master";
                      const manageDisabled = form.modoSomenteLeitura || !module.allowManage || isMasterModule;

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
                            border: "1px solid var(--line-strong)",
                            background: "var(--surface)"
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
                </div>
              ))}
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
