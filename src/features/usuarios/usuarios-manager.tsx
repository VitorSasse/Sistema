"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type RoleCodigo = "ADMIN" | "GESTOR" | "OPERACIONAL" | "FINANCEIRO" | "CONSULTA";
type StatusCadastro = "ATIVO" | "INATIVO";

type UsuarioItem = {
  id: string;
  nome: string;
  email: string;
  status: StatusCadastro;
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
  roles: RoleCodigo[];
};

const roleOptions: { value: RoleCodigo; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "GESTOR", label: "Gestor" },
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "CONSULTA", label: "Consulta" }
];

const initialForm: FormState = {
  nome: "",
  email: "",
  senha: "",
  status: "ATIVO",
  roles: ["OPERACIONAL"]
};

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
      [usuario.nome, usuario.email, usuario.roles.join(" "), usuario.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [search, usuarios]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(role: RoleCodigo) {
    setForm((current) => {
      const hasRole = current.roles.includes(role);
      const nextRoles = hasRole
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];

      return {
        ...current,
        roles: nextRoles.length > 0 ? nextRoles : current.roles
      };
    });
  }

  function handleEdit(usuario: UsuarioItem) {
    setForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      status: usuario.status,
      roles: usuario.roles
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
          roles: form.roles
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
    <div style={{ display: "grid", gap: 24 }}>
      <section className="panel-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>{form.id ? "Editar acesso" : "Novo acesso"}</h2>
            <p style={{ margin: 0, color: "#6e6457" }}>
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
                      border: checked ? "1px solid rgba(21, 91, 82, 0.35)" : "1px solid rgba(158, 143, 123, 0.35)",
                      background: checked ? "rgba(21, 91, 82, 0.08)" : "rgba(255,255,255,0.72)"
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleRole(role.value)} />
                    <span>{role.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

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

      <section className="panel-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Acessos cadastrados</h2>
            <p style={{ margin: 0, color: "#6e6457" }}>
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

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfis</th>
                <th>Status</th>
                <th>Ultimo login</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((usuario) => (
                <tr key={usuario.id} style={selectedUserId === usuario.id ? { background: "rgba(21, 91, 82, 0.05)" } : undefined}>
                  <td>{usuario.nome}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.roles.join(", ")}</td>
                  <td>{usuario.status}</td>
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
                  <td colSpan={6} style={{ textAlign: "center", color: "#6e6457" }}>
                    Nenhum usuario encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
