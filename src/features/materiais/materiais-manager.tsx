"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type Material = {
  id: string;
  codigoMaterial: string;
  descricao: string;
  categoria: string | null;
  unidadePadrao: string;
  densidade: string | null;
  origemMaterial: string | null;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
};

type FormState = {
  id?: string;
  descricao: string;
  categoria: string;
  unidadePadrao: string;
  densidade: string;
  origemMaterial: string;
  observacao: string;
  status: "ATIVO" | "INATIVO";
};

const initialForm: FormState = {
  descricao: "",
  categoria: "",
  unidadePadrao: "",
  densidade: "",
  origemMaterial: "",
  observacao: "",
  status: "ATIVO"
};

export function MateriaisManager() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadMateriais() {
    const response = await fetch("/api/materiais", { cache: "no-store" });
    const data = (await response.json()) as { items: Material[] };
    setMateriais(data.items);
  }

  useEffect(() => {
    void loadMateriais();
  }, []);

  const filteredMateriais = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return materiais.filter((material) => {
      const matchesStatus = statusFilter === "TODOS" || material.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [
          material.codigoMaterial,
          material.descricao,
          material.categoria ?? "",
          material.unidadePadrao,
          material.origemMaterial ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesStatus && matchesSearch;
    });
  }, [materiais, search, statusFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/materiais/${form.id}` : "/api/materiais";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o material.");
        return;
      }

      setForm(initialForm);
      setMessage(form.id ? "Material atualizado com sucesso." : "Material cadastrado com sucesso.");
      await loadMateriais();
    });
  }

  function handleEdit(material: Material) {
    setForm({
      id: material.id,
      descricao: material.descricao,
      categoria: material.categoria ?? "",
      unidadePadrao: material.unidadePadrao,
      densidade: material.densidade ?? "",
      origemMaterial: material.origemMaterial ?? "",
      observacao: material.observacao ?? "",
      status: material.status
    });
    setMessage("");
  }

  function handleReset() {
    setForm(initialForm);
    setMessage("");
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/materiais/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o material.");
        return;
      }

      setMessage("Material inativado.");
      await loadMateriais();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("este material")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/materiais/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o material.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Material excluido.");
      await loadMateriais();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Materiais</h1>
          <p className="page-copy">
            Base de materiais com categoria, unidade padrao, origem e status de uso.
          </p>
        </div>
      </section>

      <section className="surface section-card manager-panel">
        <h2 style={{ marginTop: 0 }}>{form.id ? "Editar material" : "Novo material"}</h2>
        {!form.id ? (
          <p className="manager-panel-note" style={{ marginBottom: 18 }}>
            O codigo do material sera gerado automaticamente no salvamento.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="manager-form-grid">
            <Field label="Descricao">
              <input value={form.descricao} onChange={(e) => updateField("descricao", e.target.value)} className="field-control manager-field-control" placeholder="Descricao do material" />
            </Field>
            <Field label="Categoria">
              <input value={form.categoria} onChange={(e) => updateField("categoria", e.target.value)} className="field-control manager-field-control" placeholder="Solo, brita, cascalho" />
            </Field>
            <Field label="Unidade padrao">
              <input value={form.unidadePadrao} onChange={(e) => updateField("unidadePadrao", e.target.value)} className="field-control manager-field-control" placeholder="m3, t, un" />
            </Field>
            <Field label="Origem do material">
              <input value={form.origemMaterial} onChange={(e) => updateField("origemMaterial", e.target.value)} className="field-control manager-field-control" placeholder="Jazida, fornecedor, usina" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => updateField("status", e.target.value as FormState["status"])} className="field-control manager-field-control">
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>
          </div>

          <Field label="Observacao">
            <textarea value={form.observacao} onChange={(e) => updateField("observacao", e.target.value)} className="field-control textarea-lg manager-field-control" placeholder="Observacoes do material" />
          </Field>

          <div className="manager-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar material" : "Salvar material"}
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
            <h2 style={{ margin: "0 0 6px" }}>Materiais cadastrados</h2>
            <p className="manager-panel-note">
              {filteredMateriais.length} registro(s) exibido(s) de {materiais.length}.
            </p>
          </div>
          <div className="manager-actions">
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="field-control manager-field-control" placeholder="Buscar por codigo, descricao, categoria ou origem" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "TODOS" | "ATIVO" | "INATIVO")} className="field-control manager-field-control">
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
                <th>Descricao</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Densidade</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMateriais.map((material) => (
                <tr key={material.id}>
                  <td>{material.codigoMaterial}</td>
                  <td>
                    <div>{material.descricao}</div>
                    <div className="manager-subtle">{material.origemMaterial ?? "-"}</div>
                  </td>
                  <td>{material.categoria ?? "-"}</td>
                  <td>{material.unidadePadrao}</td>
                  <td>{material.densidade ?? "-"}</td>
                  <td>
                    <span className={material.status === "ATIVO" ? "manager-badge manager-badge-success" : "manager-badge manager-badge-warn"}>
                      {material.status}
                    </span>
                  </td>
                  <td>
                    <div className="manager-inline-actions">
                      <button type="button" onClick={() => handleEdit(material)} className="button-secondary">Editar</button>
                      <button type="button" onClick={() => handleDisable(material.id)} className="button-secondary manager-button-warn">Inativar</button>
                      <button type="button" onClick={() => handleDelete(material.id)} className="button-secondary manager-button-danger">Excluir</button>
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
