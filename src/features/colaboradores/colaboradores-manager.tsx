"use client";

import type { ReactNode } from "react";
import { FuncaoColaborador } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";
import { formatCpf } from "@/lib/utils/cpf";

type Colaborador = {
  id: string;
  codigo: string;
  nome: string;
  apelido: string | null;
  funcao: FuncaoColaborador;
  documento: string | null;
  telefone: string | null;
  dataAdmissao: string | null;
  dataSaida: string | null;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
};

type FormState = {
  id?: string;
  nome: string;
  apelido: string;
  funcao: FuncaoColaborador;
  documento: string;
  telefone: string;
  dataAdmissao: string;
  dataSaida: string;
  observacao: string;
  status: "ATIVO" | "INATIVO";
};

const initialForm: FormState = {
  nome: "",
  apelido: "",
  funcao: "OPERADOR",
  documento: "",
  telefone: "",
  dataAdmissao: "",
  dataSaida: "",
  observacao: "",
  status: "ATIVO"
};

const funcaoOptions: FuncaoColaborador[] = [
  "MOTORISTA",
  "OPERADOR",
  "ENCARREGADO",
  "ADMINISTRATIVO",
  "OUTRO"
];

export function ColaboradoresManager() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [funcaoFilter, setFuncaoFilter] = useState<"TODOS" | FuncaoColaborador>("TODOS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadColaboradores() {
    const response = await fetch("/api/colaboradores", { cache: "no-store" });
    const data = (await response.json()) as { items: Colaborador[] };
    setColaboradores(data.items);
  }

  useEffect(() => {
    void loadColaboradores();
  }, []);

  const filteredColaboradores = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return colaboradores.filter((colaborador) => {
      const matchesFuncao = funcaoFilter === "TODOS" || colaborador.funcao === funcaoFilter;
      const matchesStatus = statusFilter === "TODOS" || colaborador.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [
          colaborador.codigo,
          colaborador.nome,
          colaborador.apelido ?? "",
          colaborador.documento ?? "",
          colaborador.telefone ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesFuncao && matchesStatus && matchesSearch;
    });
  }, [colaboradores, search, funcaoFilter, statusFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/colaboradores/${form.id}` : "/api/colaboradores";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o colaborador.");
        return;
      }

      setForm(initialForm);
      setMessage(form.id ? "Colaborador atualizado com sucesso." : "Colaborador cadastrado com sucesso.");
      await loadColaboradores();
    });
  }

  function handleEdit(colaborador: Colaborador) {
    setForm({
      id: colaborador.id,
      nome: colaborador.nome,
      apelido: colaborador.apelido ?? "",
      funcao: colaborador.funcao,
      documento: formatCpf(colaborador.documento),
      telefone: colaborador.telefone ?? "",
      dataAdmissao: colaborador.dataAdmissao ? colaborador.dataAdmissao.slice(0, 10) : "",
      dataSaida: colaborador.dataSaida ? colaborador.dataSaida.slice(0, 10) : "",
      observacao: colaborador.observacao ?? "",
      status: colaborador.status
    });
    setMessage("");
  }

  function handleReset() {
    setForm(initialForm);
    setMessage("");
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/colaboradores/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o colaborador.");
        return;
      }

      setMessage("Colaborador inativado.");
      await loadColaboradores();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("este colaborador")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/colaboradores/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o colaborador.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Colaborador excluido.");
      await loadColaboradores();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Colaboradores</h1>
          <p className="page-copy">
            Cadastro da equipe operacional com funcao, documentos e situacao atual.
          </p>
        </div>
      </section>

      <section className="surface section-card manager-panel">
        <h2 style={{ marginTop: 0 }}>{form.id ? "Editar colaborador" : "Novo colaborador"}</h2>
        {!form.id ? (
          <p className="manager-panel-note" style={{ marginBottom: 18 }}>
            O codigo do colaborador sera gerado automaticamente no salvamento.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="manager-form-grid">
            <Field label="Nome completo">
              <input
                placeholder="Nome do colaborador"
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Apelido">
              <input
                placeholder="Nome operacional"
                value={form.apelido}
                onChange={(event) => updateField("apelido", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Funcao">
              <select
                value={form.funcao}
                onChange={(event) => updateField("funcao", event.target.value as FuncaoColaborador)}
                className="field-control manager-field-control"
              >
                {funcaoOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="CPF">
              <input
                placeholder="000.000.000-00"
                value={form.documento}
                onChange={(event) => updateField("documento", formatCpf(event.target.value))}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Telefone">
              <input
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Data de admissao">
              <input
                type="date"
                value={form.dataAdmissao}
                onChange={(event) => updateField("dataAdmissao", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Data de saida">
              <input
                type="date"
                value={form.dataSaida}
                onChange={(event) => updateField("dataSaida", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as FormState["status"])}
                className="field-control manager-field-control"
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>
          </div>

          <Field label="Observacao">
            <textarea
              placeholder="Observacoes operacionais do colaborador"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
              className="field-control textarea-lg manager-field-control"
            />
          </Field>

          <div className="manager-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar colaborador" : "Salvar colaborador"}
            </button>
            <button type="button" onClick={handleReset} className="button-secondary">
              Limpar formulario
            </button>
          </div>

          {message ? <p className="manager-panel-note">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card manager-panel">
        <div className="manager-toolbar">
          <div>
            <h2 style={{ margin: "0 0 6px" }}>Colaboradores cadastrados</h2>
            <p className="manager-panel-note">
              {filteredColaboradores.length} registro(s) exibido(s) de {colaboradores.length}.
            </p>
          </div>
          <div className="manager-actions">
            <input
              placeholder="Buscar por codigo, nome, apelido ou CPF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field-control manager-field-control"
            />
            <select
              value={funcaoFilter}
              onChange={(event) =>
                setFuncaoFilter(event.target.value as "TODOS" | FuncaoColaborador)
              }
              className="field-control manager-field-control"
            >
              <option value="TODOS">Todas as funcoes</option>
              {funcaoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "TODOS" | "ATIVO" | "INATIVO")
              }
              className="field-control manager-field-control"
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </select>
          </div>
        </div>

        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nome</th>
                <th>Funcao</th>
                <th>CPF / Contato</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredColaboradores.map((colaborador) => (
                <tr key={colaborador.id}>
                  <td>{colaborador.codigo}</td>
                  <td>
                    <div>{colaborador.nome}</div>
                    <div className="manager-subtle">{colaborador.apelido ?? "-"}</div>
                  </td>
                  <td>{colaborador.funcao}</td>
                  <td>
                    <div>{formatCpf(colaborador.documento) || "-"}</div>
                    <div className="manager-subtle">{colaborador.telefone ?? "-"}</div>
                  </td>
                  <td>
                    <span className={colaborador.status === "ATIVO" ? "manager-badge manager-badge-success" : "manager-badge manager-badge-warn"}>
                      {colaborador.status}
                    </span>
                  </td>
                  <td>
                    <div className="manager-inline-actions">
                      <button type="button" onClick={() => handleEdit(colaborador)} className="button-secondary">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDisable(colaborador.id)} className="button-secondary manager-button-warn">
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(colaborador.id)} className="button-secondary manager-button-danger">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="manager-field">
      <span className="manager-field-label">{label}</span>
      {children}
    </label>
  );
}
