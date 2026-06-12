"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type OrdemResumo = {
  id: string;
  numeroOrdem: string;
  dataEmissao: string;
  status: string;
  valorTotal: string;
};

type Fornecedor = {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  telefone: string | null;
  email: string | null;
  enderecoLinha1: string | null;
  enderecoLinha2: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
  ordensCompra: OrdemResumo[];
};

type FormState = {
  id?: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  telefone: string;
  email: string;
  enderecoLinha1: string;
  enderecoLinha2: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  observacao: string;
  status: "ATIVO" | "INATIVO";
};

const initialForm: FormState = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  inscricaoEstadual: "",
  telefone: "",
  email: "",
  enderecoLinha1: "",
  enderecoLinha2: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  observacao: "",
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

export function FornecedoresManager() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadFornecedores() {
    const response = await fetch("/api/fornecedores", { cache: "no-store" });
    const data = (await response.json()) as { items: Fornecedor[] };
    setFornecedores(data.items);
  }

  useEffect(() => {
    void loadFornecedores();
  }, []);

  const filteredFornecedores = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return fornecedores.filter((fornecedor) => {
      const matchesStatus =
        statusFilter === "TODOS" || fornecedor.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [
          fornecedor.codigo,
          fornecedor.razaoSocial,
          fornecedor.nomeFantasia ?? "",
          fornecedor.cnpj ?? "",
          fornecedor.cidade ?? "",
          fornecedor.email ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesStatus && matchesSearch;
    });
  }, [fornecedores, search, statusFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/fornecedores/${form.id}` : "/api/fornecedores";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o fornecedor.");
        return;
      }

      setForm(initialForm);
      setMessage(
        form.id
          ? "Fornecedor atualizado com sucesso."
          : "Fornecedor cadastrado com sucesso. O codigo foi gerado automaticamente."
      );
      await loadFornecedores();
    });
  }

  function handleEdit(fornecedor: Fornecedor) {
    setForm({
      id: fornecedor.id,
      razaoSocial: fornecedor.razaoSocial,
      nomeFantasia: fornecedor.nomeFantasia ?? "",
      cnpj: fornecedor.cnpj ?? "",
      inscricaoEstadual: fornecedor.inscricaoEstadual ?? "",
      telefone: fornecedor.telefone ?? "",
      email: fornecedor.email ?? "",
      enderecoLinha1: fornecedor.enderecoLinha1 ?? "",
      enderecoLinha2: fornecedor.enderecoLinha2 ?? "",
      bairro: fornecedor.bairro ?? "",
      cidade: fornecedor.cidade ?? "",
      uf: fornecedor.uf ?? "",
      cep: fornecedor.cep ?? "",
      observacao: fornecedor.observacao ?? "",
      status: fornecedor.status
    });
    setMessage(`Editando fornecedor ${fornecedor.codigo}.`);
  }

  function handleReset() {
    setForm(initialForm);
    setMessage("");
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/fornecedores/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o fornecedor.");
        return;
      }

      setMessage("Fornecedor inativado.");
      await loadFornecedores();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("este fornecedor")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/fornecedores/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o fornecedor.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Fornecedor excluido.");
      await loadFornecedores();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="page-copy">
            Cadastro base para compras de materiais, combustiveis, pecas e servicos.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">{form.id ? "Editar fornecedor" : "Novo fornecedor"}</h2>
            <p className="section-copy">
              O codigo do fornecedor e gerado automaticamente no cadastro.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="form-grid-4">
            <Field label="Razao social">
              <input
                className="field-control"
                placeholder="Razao social do fornecedor"
                value={form.razaoSocial}
                onChange={(event) => updateField("razaoSocial", event.target.value)}
              />
            </Field>
            <Field label="Nome fantasia">
              <input
                className="field-control"
                placeholder="Nome fantasia"
                value={form.nomeFantasia}
                onChange={(event) => updateField("nomeFantasia", event.target.value)}
              />
            </Field>
            <Field label="CNPJ">
              <input
                className="field-control"
                placeholder="00.000.000/0001-00"
                value={form.cnpj}
                onChange={(event) => updateField("cnpj", event.target.value)}
              />
            </Field>
            <Field label="Inscricao estadual">
              <input
                className="field-control"
                placeholder="Inscricao estadual"
                value={form.inscricaoEstadual}
                onChange={(event) => updateField("inscricaoEstadual", event.target.value)}
              />
            </Field>
            <Field label="Telefone">
              <input
                className="field-control"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
              />
            </Field>
            <Field label="E-mail">
              <input
                className="field-control"
                placeholder="compras@fornecedor.com.br"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </Field>
            <Field label="Endereco principal">
              <input
                className="field-control"
                placeholder="Rua, avenida ou referencia"
                value={form.enderecoLinha1}
                onChange={(event) => updateField("enderecoLinha1", event.target.value)}
              />
            </Field>
            <Field label="Complemento">
              <input
                className="field-control"
                placeholder="Bloco, sala, referencia"
                value={form.enderecoLinha2}
                onChange={(event) => updateField("enderecoLinha2", event.target.value)}
              />
            </Field>
            <Field label="Bairro">
              <input
                className="field-control"
                placeholder="Bairro"
                value={form.bairro}
                onChange={(event) => updateField("bairro", event.target.value)}
              />
            </Field>
            <Field label="Cidade">
              <input
                className="field-control"
                placeholder="Cidade"
                value={form.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
              />
            </Field>
            <Field label="UF">
              <input
                className="field-control"
                placeholder="SP"
                maxLength={2}
                value={form.uf}
                onChange={(event) => updateField("uf", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="CEP">
              <input
                className="field-control"
                placeholder="00000-000"
                value={form.cep}
                onChange={(event) => updateField("cep", event.target.value)}
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

          <Field label="Observacao">
            <textarea
              className="field-control textarea-lg"
              placeholder="Observacoes comerciais ou operacionais"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
            />
          </Field>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar fornecedor" : "Salvar fornecedor"}
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
            <h2 className="section-title">Fornecedores cadastrados</h2>
            <p className="section-copy">
              {filteredFornecedores.length} registro(s) exibido(s) de {fornecedores.length}.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              className="field-control"
              placeholder="Buscar por codigo, nome, CNPJ, cidade ou e-mail"
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
                <th>Fornecedor</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Cidade</th>
                <th>Ordens</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredFornecedores.map((fornecedor) => (
                <tr key={fornecedor.id}>
                  <td>{fornecedor.codigo}</td>
                  <td>
                    <div>{fornecedor.razaoSocial}</div>
                    <div className="subtle">{fornecedor.nomeFantasia ?? "-"}</div>
                  </td>
                  <td>{fornecedor.cnpj ?? "-"}</td>
                  <td>
                    <div>{fornecedor.telefone ?? "-"}</div>
                    <div className="subtle">{fornecedor.email ?? "-"}</div>
                  </td>
                  <td>
                    {fornecedor.cidade ?? "-"}
                    {fornecedor.uf ? `/${fornecedor.uf}` : ""}
                  </td>
                  <td>{fornecedor.ordensCompra.length}</td>
                  <td>
                    <span
                      className={
                        fornecedor.status === "ATIVO" ? "badge badge-success" : "badge badge-danger"
                      }
                    >
                      {fornecedor.status}
                    </span>
                  </td>
                  <td>
                    <div className="toolbar-actions">
                      <button
                        type="button"
                        onClick={() => handleEdit(fornecedor)}
                        className="button-secondary"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisable(fornecedor.id)}
                        className="button-danger"
                      >
                        Inativar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(fornecedor.id)}
                        className="button-danger"
                      >
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
