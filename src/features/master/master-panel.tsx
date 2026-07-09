"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

type StatusCadastro = "ATIVO" | "INATIVO";
type RoleEmpresa = "ADMIN_EMPRESA" | "GERENTE" | "OPERADOR" | "FINANCEIRO" | "VISUALIZADOR";

type EmpresaItem = {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  logoUrl: string | null;
  corPrimaria: string | null;
  status: StatusCadastro;
  plano: string | null;
  createdAt: string;
  counts: {
    usuarios: number;
    clientes: number;
    obras: number;
    lancamentos: number;
    medicoes: number;
  };
};

type UsuarioEmpresa = {
  id: string;
  nome: string;
  email: string;
  status: StatusCadastro;
  roleEmpresa: RoleEmpresa | "MASTER";
  ultimoLoginEm: string | null;
  createdAt: string;
};

type EmpresaForm = {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  logoUrl: string;
  corPrimaria: string;
  status: StatusCadastro;
  plano: string;
};

type UsuarioForm = {
  id?: string;
  nome: string;
  email: string;
  senha: string;
  status: StatusCadastro;
  roleEmpresa: RoleEmpresa;
};

const empresaFormInicial: EmpresaForm = {
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  logoUrl: "",
  corPrimaria: "#F97316",
  status: "ATIVO",
  plano: "PADRAO"
};

const usuarioFormInicial: UsuarioForm = {
  nome: "",
  email: "",
  senha: "",
  status: "ATIVO",
  roleEmpresa: "OPERADOR"
};

const roleOptions: Array<{ value: RoleEmpresa; label: string }> = [
  { value: "ADMIN_EMPRESA", label: "Admin empresa" },
  { value: "GERENTE", label: "Gerente" },
  { value: "OPERADOR", label: "Operador" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "VISUALIZADOR", label: "Visualizador" }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function empresaToForm(empresa: EmpresaItem): EmpresaForm {
  return {
    nomeFantasia: empresa.nomeFantasia ?? empresa.nome,
    razaoSocial: empresa.razaoSocial ?? "",
    cnpj: empresa.cnpj ?? "",
    email: empresa.email ?? "",
    telefone: empresa.telefone ?? "",
    endereco: empresa.endereco ?? "",
    cidade: empresa.cidade ?? "",
    estado: empresa.estado ?? "",
    cep: empresa.cep ?? "",
    logoUrl: empresa.logoUrl ?? "",
    corPrimaria: empresa.corPrimaria ?? "#F97316",
    status: empresa.status,
    plano: empresa.plano ?? "PADRAO"
  };
}

function extractMessage(data: { message?: string; issues?: { fieldErrors?: Record<string, string[]> } }) {
  const issueMessages = Object.entries(data.issues?.fieldErrors ?? {})
    .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
    .join(" ");

  return issueMessages || data.message || "Nao foi possivel concluir a operacao.";
}

export function MasterPanel() {
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [empresaForm, setEmpresaForm] = useState<EmpresaForm>(empresaFormInicial);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>(usuarioFormInicial);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedEmpresa = useMemo(
    () => empresas.find((empresa) => empresa.id === selectedEmpresaId) ?? null,
    [empresas, selectedEmpresaId]
  );

  const filteredEmpresas = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return empresas;
    }

    return empresas.filter((empresa) =>
      [empresa.nome, empresa.nomeFantasia, empresa.razaoSocial, empresa.cnpj, empresa.plano, empresa.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [empresas, search]);

  async function loadEmpresas(preferredId?: string | null) {
    const response = await fetch("/api/master/empresas", { cache: "no-store" });
    const data = (await response.json()) as { items?: EmpresaItem[]; message?: string };

    if (!response.ok) {
      setMessage(data.message ?? "Nao foi possivel carregar empresas.");
      return;
    }

    const items = data.items ?? [];
    setEmpresas(items);

    const nextSelected = preferredId ?? selectedEmpresaId ?? items[0]?.id ?? null;
    setSelectedEmpresaId(nextSelected);

    const selected = items.find((empresa) => empresa.id === nextSelected);
    setEmpresaForm(selected ? empresaToForm(selected) : empresaFormInicial);
  }

  async function loadUsuarios(empresaId: string | null) {
    if (!empresaId) {
      setUsuarios([]);
      return;
    }

    const response = await fetch(`/api/master/empresas/${empresaId}/usuarios`, { cache: "no-store" });
    const data = (await response.json()) as { items?: UsuarioEmpresa[]; message?: string };

    if (!response.ok) {
      setMessage(data.message ?? "Nao foi possivel carregar usuarios da empresa.");
      return;
    }

    setUsuarios(data.items ?? []);
  }

  useEffect(() => {
    void loadEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadUsuarios(selectedEmpresaId);
  }, [selectedEmpresaId]);

  function selectEmpresa(empresa: EmpresaItem) {
    setSelectedEmpresaId(empresa.id);
    setEmpresaForm(empresaToForm(empresa));
    setUsuarioForm(usuarioFormInicial);
    setMessage("");
  }

  function resetEmpresaForm() {
    setSelectedEmpresaId(null);
    setEmpresaForm(empresaFormInicial);
    setUsuarioForm(usuarioFormInicial);
    setUsuarios([]);
    setMessage("Formulario pronto para nova empresa.");
  }

  async function handleEmpresaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const endpoint = selectedEmpresaId ? `/api/master/empresas/${selectedEmpresaId}` : "/api/master/empresas";
    const method = selectedEmpresaId ? "PUT" : "POST";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresaForm)
      });
      const data = (await response.json()) as { id?: string; message?: string; issues?: { fieldErrors?: Record<string, string[]> } };

      if (!response.ok) {
        setMessage(extractMessage(data));
        return;
      }

      setMessage(selectedEmpresaId ? "Empresa atualizada." : "Empresa criada.");
      await loadEmpresas(data.id ?? selectedEmpresaId);
    });
  }

  async function handleUsuarioSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEmpresaId) {
      setMessage("Selecione uma empresa para gerenciar usuarios.");
      return;
    }

    const endpoint = usuarioForm.id
      ? `/api/master/empresas/${selectedEmpresaId}/usuarios/${usuarioForm.id}`
      : `/api/master/empresas/${selectedEmpresaId}/usuarios`;
    const method = usuarioForm.id ? "PATCH" : "POST";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usuarioForm)
      });
      const data = (await response.json()) as { message?: string; issues?: { fieldErrors?: Record<string, string[]> } };

      if (!response.ok) {
        setMessage(extractMessage(data));
        return;
      }

      setMessage(usuarioForm.id ? "Usuario atualizado." : "Usuario criado.");
      setUsuarioForm(usuarioFormInicial);
      await loadUsuarios(selectedEmpresaId);
      await loadEmpresas(selectedEmpresaId);
    });
  }

  function editUsuario(usuario: UsuarioEmpresa) {
    if (usuario.roleEmpresa === "MASTER") {
      setMessage("Usuarios MASTER devem ser mantidos fora do cadastro operacional de empresas.");
      return;
    }

    setUsuarioForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      status: usuario.status,
      roleEmpresa: usuario.roleEmpresa
    });
    setMessage(`Editando ${usuario.nome}.`);
  }

  return (
    <main className="page-stack master-panel">
      <section className="page-header master-hero">
        <div>
          <span className="basepro-kicker">SaaS multiempresa</span>
          <h1 className="page-title">Painel Master</h1>
          <p className="page-copy">
            Administre empresas, usuarios e valide o isolamento operacional sem interferir nos fluxos de fichas,
            medicoes e compras.
          </p>
        </div>
        <div className="master-hero-stats">
          <strong>{empresas.length}</strong>
          <span>empresa(s) no ambiente</span>
        </div>
      </section>

      <section className="master-grid">
        <aside className="surface section-card master-company-column">
          <div className="section-header">
            <div>
              <h2 className="section-title">Empresas</h2>
              <p className="section-copy">Selecione uma empresa para editar ou gerenciar usuarios.</p>
            </div>
          </div>

          <label className="field">
            <span className="field-label">Buscar empresa</span>
            <input
              className="field-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, CNPJ, plano ou status"
            />
          </label>

          <div className="master-company-list">
            {filteredEmpresas.map((empresa) => (
              <button
                key={empresa.id}
                type="button"
                className={`master-company-card${empresa.id === selectedEmpresaId ? " is-active" : ""}`}
                onClick={() => selectEmpresa(empresa)}
              >
                <span>
                  <strong>{empresa.nomeFantasia || empresa.nome}</strong>
                  <small>{empresa.razaoSocial || "Razao social nao informada"}</small>
                </span>
                <span className={`master-status is-${empresa.status.toLowerCase()}`}>{empresa.status}</span>
                <span className="master-company-metrics">
                  <small>{empresa.counts.usuarios} usuarios</small>
                  <small>{empresa.counts.clientes} clientes</small>
                  <small>{empresa.counts.obras} obras</small>
                  <small>{empresa.counts.lancamentos} lanc.</small>
                  <small>{empresa.counts.medicoes} med.</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="master-workspace">
          <section className="surface section-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">{selectedEmpresaId ? "Editar empresa" : "Nova empresa"}</h2>
                <p className="section-copy">
                  Dados de identidade usados pelo SaaS, relatórios e futuro painel de configuração da empresa.
                </p>
              </div>
              <button type="button" className="button-secondary" onClick={resetEmpresaForm}>
                Nova empresa
              </button>
            </div>

            <form className="master-form" onSubmit={handleEmpresaSubmit}>
              <label className="field">
                <span className="field-label">Nome fantasia</span>
                <input
                  className="field-control"
                  value={empresaForm.nomeFantasia}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, nomeFantasia: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Razao social</span>
                <input
                  className="field-control"
                  value={empresaForm.razaoSocial}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, razaoSocial: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">CNPJ</span>
                <input
                  className="field-control"
                  value={empresaForm.cnpj}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, cnpj: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">E-mail</span>
                <input
                  className="field-control"
                  type="email"
                  value={empresaForm.email}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Telefone</span>
                <input
                  className="field-control"
                  value={empresaForm.telefone}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, telefone: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Endereco</span>
                <input
                  className="field-control"
                  value={empresaForm.endereco}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, endereco: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Cidade</span>
                <input
                  className="field-control"
                  value={empresaForm.cidade}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, cidade: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Estado</span>
                <input
                  className="field-control"
                  value={empresaForm.estado}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, estado: event.target.value }))}
                  maxLength={2}
                />
              </label>
              <label className="field">
                <span className="field-label">CEP</span>
                <input
                  className="field-control"
                  value={empresaForm.cep}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, cep: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Logo URL</span>
                <input
                  className="field-control"
                  value={empresaForm.logoUrl}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, logoUrl: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Cor primaria</span>
                <input
                  className="field-control"
                  value={empresaForm.corPrimaria}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, corPrimaria: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Plano</span>
                <input
                  className="field-control"
                  value={empresaForm.plano}
                  onChange={(event) => setEmpresaForm((current) => ({ ...current, plano: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <select
                  className="field-control"
                  value={empresaForm.status}
                  onChange={(event) =>
                    setEmpresaForm((current) => ({ ...current, status: event.target.value as StatusCadastro }))
                  }
                >
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </label>

              <div className="master-form-actions">
                <button type="submit" className="button-primary" disabled={isPending}>
                  {isPending ? "Salvando..." : selectedEmpresaId ? "Salvar empresa" : "Criar empresa"}
                </button>
                {selectedEmpresa ? <span>Criada em {formatDate(selectedEmpresa.createdAt)}</span> : null}
              </div>
            </form>

            {message ? <p className="message-inline">{message}</p> : null}
          </section>

          <section className="surface section-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">Usuarios da empresa</h2>
                <p className="section-copy">
                  {selectedEmpresa
                    ? `Acessos vinculados a ${selectedEmpresa.nomeFantasia || selectedEmpresa.nome}.`
                    : "Selecione uma empresa para cadastrar usuarios."}
                </p>
              </div>
              <button type="button" className="button-secondary" onClick={() => setUsuarioForm(usuarioFormInicial)}>
                Novo usuario
              </button>
            </div>

            <form className="master-user-form" onSubmit={handleUsuarioSubmit}>
              <label className="field">
                <span className="field-label">Nome</span>
                <input
                  className="field-control"
                  value={usuarioForm.nome}
                  onChange={(event) => setUsuarioForm((current) => ({ ...current, nome: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">E-mail</span>
                <input
                  className="field-control"
                  type="email"
                  value={usuarioForm.email}
                  onChange={(event) => setUsuarioForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">{usuarioForm.id ? "Nova senha" : "Senha inicial"}</span>
                <input
                  className="field-control"
                  type="password"
                  value={usuarioForm.senha}
                  onChange={(event) => setUsuarioForm((current) => ({ ...current, senha: event.target.value }))}
                  placeholder={usuarioForm.id ? "Opcional" : "Minimo 8 caracteres"}
                  required={!usuarioForm.id}
                />
              </label>
              <label className="field">
                <span className="field-label">Role empresa</span>
                <select
                  className="field-control"
                  value={usuarioForm.roleEmpresa}
                  onChange={(event) =>
                    setUsuarioForm((current) => ({ ...current, roleEmpresa: event.target.value as RoleEmpresa }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <select
                  className="field-control"
                  value={usuarioForm.status}
                  onChange={(event) =>
                    setUsuarioForm((current) => ({ ...current, status: event.target.value as StatusCadastro }))
                  }
                >
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </label>
              <button type="submit" className="button-primary" disabled={isPending || !selectedEmpresaId}>
                {usuarioForm.id ? "Salvar usuario" : "Criar usuario"}
              </button>
            </form>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Role empresa</th>
                    <th>Status</th>
                    <th>Ultimo login</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.nome}</td>
                      <td>{usuario.email}</td>
                      <td>{usuario.roleEmpresa}</td>
                      <td>{usuario.status}</td>
                      <td>{formatDateTime(usuario.ultimoLoginEm)}</td>
                      <td>
                        <button type="button" className="button-secondary button-compact" onClick={() => editUsuario(usuario)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Nenhum usuario cadastrado para esta empresa.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
