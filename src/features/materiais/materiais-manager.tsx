"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";

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
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{form.id ? "Editar material" : "Novo material"}</h2>
        {!form.id ? (
          <p style={{ margin: "0 0 18px", color: "#6e6457" }}>
            O codigo do material sera gerado automaticamente no salvamento.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div style={formGridStyle}>
            <Field label="Descricao">
              <input value={form.descricao} onChange={(e) => updateField("descricao", e.target.value)} style={fieldStyle} placeholder="Descricao do material" />
            </Field>
            <Field label="Categoria">
              <input value={form.categoria} onChange={(e) => updateField("categoria", e.target.value)} style={fieldStyle} placeholder="Solo, brita, cascalho" />
            </Field>
            <Field label="Unidade padrao">
              <input value={form.unidadePadrao} onChange={(e) => updateField("unidadePadrao", e.target.value)} style={fieldStyle} placeholder="m3, t, un" />
            </Field>
            <Field label="Origem do material">
              <input value={form.origemMaterial} onChange={(e) => updateField("origemMaterial", e.target.value)} style={fieldStyle} placeholder="Jazida, fornecedor, usina" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => updateField("status", e.target.value as FormState["status"])} style={fieldStyle}>
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>
          </div>

          <Field label="Observacao">
            <textarea value={form.observacao} onChange={(e) => updateField("observacao", e.target.value)} style={{ ...fieldStyle, minHeight: 96, resize: "vertical" as const }} placeholder="Observacoes do material" />
          </Field>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={isPending} style={primaryButtonStyle}>
              {isPending ? "Salvando..." : form.id ? "Atualizar material" : "Salvar material"}
            </button>
            <button type="button" onClick={handleReset} style={secondaryButtonStyle}>
              Limpar formulario
            </button>
          </div>

          {message ? <p style={{ margin: 0, color: "#6e6457" }}>{message}</p> : null}
        </form>
      </section>

      <section style={panelStyle}>
        <div style={toolbarStyle}>
          <div>
            <h2 style={{ margin: "0 0 6px" }}>Materiais cadastrados</h2>
            <p style={{ margin: 0, color: "#6e6457" }}>
              {filteredMateriais.length} registro(s) exibido(s) de {materiais.length}.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...fieldStyle, width: 320 }} placeholder="Buscar por codigo, descricao, categoria ou origem" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "TODOS" | "ATIVO" | "INATIVO")} style={{ ...fieldStyle, width: 160 }}>
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Codigo</th>
                <th style={thStyle}>Descricao</th>
                <th style={thStyle}>Categoria</th>
                <th style={thStyle}>Unidade</th>
                <th style={thStyle}>Densidade</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMateriais.map((material) => (
                <tr key={material.id}>
                  <td style={tdStyle}>{material.codigoMaterial}</td>
                  <td style={tdStyle}>
                    <div>{material.descricao}</div>
                    <div style={subtleTextStyle}>{material.origemMaterial ?? "-"}</div>
                  </td>
                  <td style={tdStyle}>{material.categoria ?? "-"}</td>
                  <td style={tdStyle}>{material.unidadePadrao}</td>
                  <td style={tdStyle}>{material.densidade ?? "-"}</td>
                  <td style={tdStyle}>
                    <span style={material.status === "ATIVO" ? statusActiveStyle : statusInactiveStyle}>
                      {material.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => handleEdit(material)} style={secondaryInlineButton}>Editar</button>
                      <button type="button" onClick={() => handleDisable(material.id)} style={dangerInlineButton}>Inativar</button>
                      <button type="button" onClick={() => handleDelete(material.id)} style={deleteInlineButton}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 14, color: "#6e6457" }}>{label}</span>
      {children}
    </label>
  );
}

const panelStyle = {
  padding: 20,
  borderRadius: 20,
  background: "#fffdf8",
  border: "1px solid #d7cfbf"
};

const formGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
  flexWrap: "wrap" as const
};

const fieldStyle = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d7cfbf",
  background: "#fffdf8",
  width: "100%"
};

const primaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background: "#125b50",
  color: "#fff"
};

const secondaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #d7cfbf",
  background: "#fffdf8"
};

const secondaryInlineButton = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d7cfbf",
  background: "#fffdf8"
};

const dangerInlineButton = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e2b6aa",
  background: "#fff0eb",
  color: "#bc4b2f"
};

const deleteInlineButton = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #c79f94",
  background: "#fbe5de",
  color: "#9f2f1c"
};

const thStyle = {
  textAlign: "left" as const,
  padding: 12,
  borderBottom: "1px solid #d7cfbf",
  whiteSpace: "nowrap" as const
};

const tdStyle = {
  padding: 12,
  borderBottom: "1px solid #ece5d9",
  verticalAlign: "top" as const
};

const subtleTextStyle = {
  color: "#6e6457",
  fontSize: 13
};

const statusActiveStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#dcefe9",
  color: "#125b50",
  fontSize: 12,
  fontWeight: 700
};

const statusInactiveStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f3e5e1",
  color: "#bc4b2f",
  fontSize: 12,
  fontWeight: 700
};
