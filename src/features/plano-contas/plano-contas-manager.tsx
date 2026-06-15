"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type PlanoConta = {
  id: string;
  codigo: string;
  classificacao: string;
  nome: string;
  tipo: "DESPESA" | "RECEITA";
  categoria: string | null;
  descricao: string | null;
  status: "ATIVO" | "INATIVO";
};

type FormState = {
  id?: string;
  classificacao: string;
  nome: string;
  tipo: "DESPESA" | "RECEITA";
  categoria: string;
  descricao: string;
  status: "ATIVO" | "INATIVO";
};

const initialForm: FormState = {
  classificacao: "",
  nome: "",
  tipo: "DESPESA",
  categoria: "",
  descricao: "",
  status: "ATIVO"
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function PlanoContasManager() {
  const [items, setItems] = useState<PlanoConta[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [tipoFilter, setTipoFilter] = useState<"TODOS" | "DESPESA" | "RECEITA">("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadItems() {
    const response = await fetch("/api/plano-contas", { cache: "no-store" });
    const data = (await response.json()) as { items: PlanoConta[] };
    setItems(data.items);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = statusFilter === "TODOS" || item.status === statusFilter;
      const matchesTipo = tipoFilter === "TODOS" || item.tipo === tipoFilter;
      const matchesSearch =
        !normalized ||
        [item.codigo, item.classificacao, item.nome, item.tipo, item.categoria ?? "", item.descricao ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesStatus && matchesTipo && matchesSearch;
    });
  }, [items, search, statusFilter, tipoFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/plano-contas/${form.id}` : "/api/plano-contas";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o plano de contas.");
        return;
      }

      setForm(initialForm);
      setMessage(
        form.id
          ? "Plano de contas atualizado com sucesso."
          : "Plano de contas cadastrado com sucesso."
      );
      await loadItems();
    });
  }

  function handleEdit(item: PlanoConta) {
    setForm({
      id: item.id,
      classificacao: item.classificacao,
      nome: item.nome,
      tipo: item.tipo,
      categoria: item.categoria ?? "",
      descricao: item.descricao ?? "",
      status: item.status
    });
    setMessage(`Editando ${item.codigo}.`);
  }

  function handleReset() {
    setForm(initialForm);
    setMessage("");
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/plano-contas/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o plano de contas.");
        return;
      }

      setMessage("Plano de contas inativado.");
      await loadItems();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("este plano de contas")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/plano-contas/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o plano de contas.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Plano de contas excluido.");
      await loadItems();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Plano de contas</h1>
          <p className="page-copy">
            Estruture as contas financeiras por classificacao, tipo e categoria.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {form.id ? "Editar plano de contas" : "Novo plano de contas"}
            </h2>
            <p className="section-copy">
              O codigo interno e gerado automaticamente. A classificacao contabil e definida no cadastro.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="form-grid-4">
            <Field label="Classificacao">
              <input
                className="field-control"
                placeholder="Ex.: 3.1.02"
                value={form.classificacao}
                onChange={(event) => updateField("classificacao", event.target.value)}
              />
            </Field>
            <Field label="Nome da conta">
              <input
                className="field-control"
                placeholder="Ex.: Combustiveis, Pecas, Servicos terceirizados"
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
              />
            </Field>
            <Field label="Tipo">
              <select
                className="field-control"
                value={form.tipo}
                onChange={(event) => updateField("tipo", event.target.value as FormState["tipo"])}
              >
                <option value="DESPESA">DESPESA</option>
                <option value="RECEITA">RECEITA</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                className="field-control"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as FormState["status"])}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>
          </div>

          <div className="form-grid-4">
            <Field label="Categoria">
              <input
                className="field-control"
                placeholder="Ex.: Operacional, Administrativo, Manutencao"
                value={form.categoria}
                onChange={(event) => updateField("categoria", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Descricao">
            <textarea
              className="field-control textarea-lg"
              placeholder="Observacoes sobre a finalidade desta conta"
              value={form.descricao}
              onChange={(event) => updateField("descricao", event.target.value)}
            />
          </Field>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending
                ? "Salvando..."
                : form.id
                  ? "Atualizar plano de contas"
                  : "Salvar plano de contas"}
            </button>
            <button type="button" onClick={handleReset} className="button-ghost">
              Limpar formulario
            </button>
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Planos de contas cadastrados</h2>
            <p className="section-copy">
              {filteredItems.length} registro(s) exibido(s) de {items.length}.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              className="field-control"
              placeholder="Buscar por codigo, classificacao, nome ou categoria"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 360, maxWidth: "100%" }}
            />
            <select
              className="field-control"
              value={tipoFilter}
              onChange={(event) =>
                setTipoFilter(event.target.value as "TODOS" | "DESPESA" | "RECEITA")
              }
            >
              <option value="TODOS">Todos os tipos</option>
              <option value="DESPESA">Despesas</option>
              <option value="RECEITA">Receitas</option>
            </select>
            <select
              className="field-control"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "TODOS" | "ATIVO" | "INATIVO")
              }
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </select>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Classificacao</th>
                <th>Conta</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.codigo}</td>
                  <td>{item.classificacao}</td>
                  <td>
                    <div>{item.nome}</div>
                    <div className="subtle">
                      {item.categoria ?? "-"} | {item.descricao ?? "-"}
                    </div>
                  </td>
                  <td>{item.tipo}</td>
                  <td>
                    <span className={item.status === "ATIVO" ? "badge badge-success" : "badge badge-danger"}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="toolbar-actions">
                      <button type="button" className="button-secondary" onClick={() => handleEdit(item)}>
                        Editar
                      </button>
                      <button type="button" className="button-danger" onClick={() => handleDisable(item.id)}>
                        Inativar
                      </button>
                      <button type="button" className="button-danger" onClick={() => handleDelete(item.id)}>
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
