"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type ClienteOption = {
  id: string;
  codigo: string;
  nome: string;
  status: "ATIVO" | "INATIVO" | "PROSPECTO";
};

type Obra = {
  id: string;
  clienteId: string;
  codigo: string;
  nome: string;
  contratoNumero: string | null;
  localidade: string | null;
  cidade: string | null;
  uf: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  observacao: string | null;
  status: "ATIVO" | "INATIVO" | "PROVISORIA";
  liberadaParaLancamento: boolean;
  cliente: {
    id: string;
    codigo: string;
    nome: string;
  };
};

type FormState = {
  id?: string;
  clienteId: string;
  nome: string;
  contratoNumero: string;
  localidade: string;
  cidade: string;
  uf: string;
  dataInicio: string;
  dataFim: string;
  observacao: string;
  status: "ATIVO" | "INATIVO" | "PROVISORIA";
  liberadaParaLancamento: boolean;
};

const initialForm: FormState = {
  clienteId: "",
  nome: "",
  contratoNumero: "",
  localidade: "",
  cidade: "",
  uf: "",
  dataInicio: "",
  dataFim: "",
  observacao: "",
  status: "ATIVO",
  liberadaParaLancamento: true
};

export function ObrasManager() {
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO" | "PROVISORIA">("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadBase() {
    const [clientesResponse, obrasResponse] = await Promise.all([
      fetch("/api/clientes", { cache: "no-store" }),
      fetch("/api/obras", { cache: "no-store" })
    ]);

    const clientesData = (await clientesResponse.json()) as { items: ClienteOption[] };
    const obrasData = (await obrasResponse.json()) as { items: Obra[] };

    setClientes(clientesData.items);
    setObras(obrasData.items);
  }

  useEffect(() => {
    void loadBase();
  }, []);

  const clientesAtivos = useMemo(
    () => clientes.filter((cliente) => cliente.status === "ATIVO"),
    [clientes]
  );

  const clienteOptions = useMemo(
    () =>
      clientesAtivos.map((cliente) => ({
        value: cliente.id,
        label: `${cliente.codigo} - ${cliente.nome}`
      })),
    [clientesAtivos]
  );

  const filteredObras = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return obras.filter((obra) => {
      const matchesStatus = statusFilter === "TODOS" || obra.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          obra.codigo,
          obra.nome,
          obra.cliente.codigo,
          obra.cliente.nome,
          obra.cidade ?? "",
          obra.localidade ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [obras, search, statusFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCompleteObra(obra: Obra) {
    handleEdit(obra);
    setForm((current) => ({
      ...current,
      status: "ATIVO",
      liberadaParaLancamento: true
    }));
    setMessage("Complete os dados da obra e salve para ativar o cadastro.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/obras/${form.id}` : "/api/obras";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar a obra.");
        return;
      }

      setForm(initialForm);
      setMessage(form.id ? "Obra atualizada com sucesso." : "Obra cadastrada com sucesso. O codigo foi gerado automaticamente.");
      await loadBase();
    });
  }

  function handleEdit(obra: Obra) {
    setForm({
      id: obra.id,
      clienteId: obra.clienteId,
      nome: obra.nome,
      contratoNumero: obra.contratoNumero ?? "",
      localidade: obra.localidade ?? "",
      cidade: obra.cidade ?? "",
      uf: obra.uf ?? "",
      dataInicio: obra.dataInicio ? obra.dataInicio.slice(0, 10) : "",
      dataFim: obra.dataFim ? obra.dataFim.slice(0, 10) : "",
      observacao: obra.observacao ?? "",
      status: obra.status,
      liberadaParaLancamento: obra.liberadaParaLancamento
    });
    setMessage(`Editando obra ${obra.codigo}.`);
  }

  function handleReset() {
    setForm(initialForm);
    setMessage("");
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/obras/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar a obra.");
        return;
      }

      setMessage("Obra inativada e bloqueada para lancamentos.");
      await loadBase();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("esta obra")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/obras/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir a obra.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Obra excluida.");
      await loadBase();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Obras</h1>
          <p className="page-copy">
            Cadastro mestre de obras com cliente vinculado, dados contratuais e liberacao operacional.
          </p>
        </div>
      </section>

      <section className="surface section-card manager-panel">
        <div className="manager-header-block">
          <div>
            <h2 style={{ margin: "0 0 6px" }}>{form.id ? "Editar obra" : "Nova obra"}</h2>
            <p className="manager-panel-note">
              O codigo da obra e gerado automaticamente e o vinculo com cliente e obrigatorio.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="manager-form-grid">
            <Field label="Cliente">
              <SearchableSelect
                value={form.clienteId}
                onChange={(value) => updateField("clienteId", value)}
                options={clienteOptions}
                placeholder="Digite a primeira letra do cliente"
                emptyLabel="Nenhum cliente encontrado."
              />
            </Field>

            <Field label="Nome da obra">
              <input
                placeholder="Nome operacional da obra"
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>

            <Field label="Numero do contrato">
              <input
                placeholder="Contrato"
                value={form.contratoNumero}
                onChange={(event) => updateField("contratoNumero", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>

            <Field label="Localidade">
              <input
                placeholder="Fazenda, trecho, bairro ou referencia"
                value={form.localidade}
                onChange={(event) => updateField("localidade", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>

            <Field label="Cidade">
              <input
                placeholder="Cidade"
                value={form.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>

            <Field label="UF">
              <input
                placeholder="SP"
                maxLength={2}
                value={form.uf}
                onChange={(event) => updateField("uf", event.target.value.toUpperCase())}
                className="field-control manager-field-control"
              />
            </Field>

            <Field label="Data inicio">
              <input
                type="date"
                value={form.dataInicio}
                onChange={(event) => updateField("dataInicio", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>

            <Field label="Data fim">
              <input
                type="date"
                value={form.dataFim}
                onChange={(event) => updateField("dataFim", event.target.value)}
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
                <option value="PROVISORIA">PROVISORIA</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>

            <Field label="Liberada para lancamento">
              <select
                value={form.liberadaParaLancamento ? "SIM" : "NAO"}
                onChange={(event) => updateField("liberadaParaLancamento", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="SIM">SIM</option>
                <option value="NAO">NAO</option>
              </select>
            </Field>
          </div>

          <Field label="Observacao">
            <textarea
              placeholder="Observacoes contratuais, operacionais ou administrativas"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
              className="field-control textarea-lg manager-field-control"
            />
          </Field>

          <div className="manager-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar obra" : "Salvar obra"}
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
            <h2 style={{ margin: "0 0 6px" }}>Obras cadastradas</h2>
            <p className="manager-panel-note">
              {filteredObras.length} registro(s) exibido(s) de {obras.length}.
            </p>
          </div>
          <div className="manager-actions">
            <input
              placeholder="Buscar por codigo, nome, cliente, cidade ou localidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field-control manager-field-control"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "TODOS" | "ATIVO" | "INATIVO" | "PROVISORIA")}
              className="field-control manager-field-control"
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativas</option>
              <option value="PROVISORIA">Provisorias</option>
              <option value="INATIVO">Inativas</option>
            </select>
          </div>
        </div>

        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Obra</th>
                <th>Cliente</th>
                <th>Cidade/UF</th>
                <th>Lancamento</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredObras.map((obra) => (
                <tr key={obra.id}>
                  <td>{obra.codigo}</td>
                  <td>
                    <div>{obra.nome}</div>
                    <div className="manager-subtle">{obra.localidade ?? obra.contratoNumero ?? "-"}</div>
                  </td>
                  <td>
                    <div>{obra.cliente.nome}</div>
                    <div className="manager-subtle">{obra.cliente.codigo}</div>
                  </td>
                  <td>{[obra.cidade, obra.uf].filter(Boolean).join("/") || "-"}</td>
                  <td>
                    <span className={obra.liberadaParaLancamento ? "manager-badge manager-badge-success" : "manager-badge manager-badge-warn"}>
                      {obra.liberadaParaLancamento ? "LIBERADA" : "BLOQUEADA"}
                    </span>
                  </td>
                  <td>
                    <span className={obra.status === "ATIVO" ? "manager-badge manager-badge-success" : "manager-badge manager-badge-warn"}>
                      {obra.status}
                    </span>
                  </td>
                  <td>
                    <div className="manager-inline-actions">
                      {obra.status === "PROVISORIA" ? (
                        <button type="button" onClick={() => handleCompleteObra(obra)} className="button-primary">
                          Completar cadastro
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleEdit(obra)} className="button-secondary">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDisable(obra.id)} className="button-secondary manager-button-warn">
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(obra.id)} className="button-secondary manager-button-danger">
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
