"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type OrdemResumo = {
  id: string;
  numeroOrdem: string;
  dataEmissao: string;
  status: string;
  valorTotal: string | number;
};

type CentroCusto = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: "ATIVO" | "INATIVO";
  ordensCompra: OrdemResumo[];
};

type FormState = {
  id?: string;
  nome: string;
  descricao: string;
  status: "ATIVO" | "INATIVO";
};

const initialForm: FormState = {
  nome: "",
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

export function CentrosCustoManager() {
  const [items, setItems] = useState<CentroCusto[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadItems() {
    const response = await fetch("/api/centros-custo", { cache: "no-store" });
    const data = (await response.json()) as { items: CentroCusto[] };
    setItems(data.items);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = statusFilter === "TODOS" || item.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [item.codigo, item.nome, item.descricao ?? ""].join(" ").toLowerCase().includes(normalized);

      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/centros-custo/${form.id}` : "/api/centros-custo";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o centro de custo.");
        return;
      }

      setForm(initialForm);
      setMessage(
        form.id
          ? "Centro de custo atualizado com sucesso."
          : "Centro de custo cadastrado com sucesso."
      );
      await loadItems();
    });
  }

  function handleEdit(item: CentroCusto) {
    setForm({
      id: item.id,
      nome: item.nome,
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
      const response = await fetch(`/api/centros-custo/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o centro de custo.");
        return;
      }

      setMessage("Centro de custo inativado.");
      await loadItems();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("este centro de custo")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/centros-custo/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o centro de custo.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Centro de custo excluido.");
      await loadItems();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Centros de custo</h1>
          <p className="page-copy">
            Cadastro financeiro para vincular ordens de compra ao custo correto.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {form.id ? "Editar centro de custo" : "Novo centro de custo"}
            </h2>
            <p className="section-copy">O codigo e gerado automaticamente no cadastro.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="form-grid-4">
            <Field label="Nome">
              <input
                className="field-control"
                placeholder="Ex.: ESC 150 II, Oficina, Administrativo"
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
              />
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

          <Field label="Descricao">
            <textarea
              className="field-control textarea-lg"
              placeholder="Observacoes sobre uso ou classificacao deste centro de custo"
              value={form.descricao}
              onChange={(event) => updateField("descricao", event.target.value)}
            />
          </Field>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending
                ? "Salvando..."
                : form.id
                  ? "Atualizar centro de custo"
                  : "Salvar centro de custo"}
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
            <h2 className="section-title">Centros de custo cadastrados</h2>
            <p className="section-copy">
              {filteredItems.length} registro(s) exibido(s) de {items.length}.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              className="field-control"
              placeholder="Buscar por codigo, nome ou descricao"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 360, maxWidth: "100%" }}
            />
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
                <th>Centro de custo</th>
                <th>Ordens</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.codigo}</td>
                  <td>
                    <div>{item.nome}</div>
                    <div className="subtle">{item.descricao ?? "-"}</div>
                  </td>
                  <td>{item.ordensCompra.length}</td>
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
