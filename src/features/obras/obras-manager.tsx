"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type ClienteOption = {
  id: string;
  codigo: string;
  nome: string;
  status: "ATIVO" | "INATIVO";
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
  status: "ATIVO" | "INATIVO";
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
  status: "ATIVO" | "INATIVO";
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
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
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
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <div style={headerBlockStyle}>
          <div>
            <h2 style={{ margin: "0 0 6px" }}>{form.id ? "Editar obra" : "Nova obra"}</h2>
            <p style={{ margin: 0, color: "#6e6457" }}>
              O codigo da obra e gerado automaticamente e o vinculo com cliente e obrigatorio.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div style={formGridStyle}>
            <Field label="Cliente">
              <select
                value={form.clienteId}
                onChange={(event) => updateField("clienteId", event.target.value)}
                style={fieldStyle}
              >
                <option value="">Selecione um cliente</option>
                {clientesAtivos.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.codigo} - {cliente.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nome da obra">
              <input
                placeholder="Nome operacional da obra"
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
                style={fieldStyle}
              />
            </Field>

            <Field label="Numero do contrato">
              <input
                placeholder="Contrato"
                value={form.contratoNumero}
                onChange={(event) => updateField("contratoNumero", event.target.value)}
                style={fieldStyle}
              />
            </Field>

            <Field label="Localidade">
              <input
                placeholder="Fazenda, trecho, bairro ou referencia"
                value={form.localidade}
                onChange={(event) => updateField("localidade", event.target.value)}
                style={fieldStyle}
              />
            </Field>

            <Field label="Cidade">
              <input
                placeholder="Cidade"
                value={form.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
                style={fieldStyle}
              />
            </Field>

            <Field label="UF">
              <input
                placeholder="SP"
                maxLength={2}
                value={form.uf}
                onChange={(event) => updateField("uf", event.target.value.toUpperCase())}
                style={fieldStyle}
              />
            </Field>

            <Field label="Data inicio">
              <input
                type="date"
                value={form.dataInicio}
                onChange={(event) => updateField("dataInicio", event.target.value)}
                style={fieldStyle}
              />
            </Field>

            <Field label="Data fim">
              <input
                type="date"
                value={form.dataFim}
                onChange={(event) => updateField("dataFim", event.target.value)}
                style={fieldStyle}
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as FormState["status"])}
                style={fieldStyle}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>

            <Field label="Liberada para lancamento">
              <select
                value={form.liberadaParaLancamento ? "SIM" : "NAO"}
                onChange={(event) => updateField("liberadaParaLancamento", event.target.value === "SIM")}
                style={fieldStyle}
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
              style={{ ...fieldStyle, minHeight: 96, resize: "vertical" as const }}
            />
          </Field>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={isPending} style={primaryButtonStyle}>
              {isPending ? "Salvando..." : form.id ? "Atualizar obra" : "Salvar obra"}
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
            <h2 style={{ margin: "0 0 6px" }}>Obras cadastradas</h2>
            <p style={{ margin: 0, color: "#6e6457" }}>
              {filteredObras.length} registro(s) exibido(s) de {obras.length}.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              placeholder="Buscar por codigo, nome, cliente, cidade ou localidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ ...fieldStyle, width: 340 }}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "TODOS" | "ATIVO" | "INATIVO")}
              style={{ ...fieldStyle, width: 160 }}
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativas</option>
              <option value="INATIVO">Inativas</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Codigo</th>
                <th style={thStyle}>Obra</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Cidade/UF</th>
                <th style={thStyle}>Lancamento</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredObras.map((obra) => (
                <tr key={obra.id}>
                  <td style={tdStyle}>{obra.codigo}</td>
                  <td style={tdStyle}>
                    <div>{obra.nome}</div>
                    <div style={subtleTextStyle}>{obra.localidade ?? obra.contratoNumero ?? "-"}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{obra.cliente.nome}</div>
                    <div style={subtleTextStyle}>{obra.cliente.codigo}</div>
                  </td>
                  <td style={tdStyle}>{[obra.cidade, obra.uf].filter(Boolean).join("/") || "-"}</td>
                  <td style={tdStyle}>
                    <span style={obra.liberadaParaLancamento ? statusActiveStyle : statusInactiveStyle}>
                      {obra.liberadaParaLancamento ? "LIBERADA" : "BLOQUEADA"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={obra.status === "ATIVO" ? statusActiveStyle : statusInactiveStyle}>
                      {obra.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => handleEdit(obra)} style={secondaryInlineButton}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDisable(obra.id)} style={dangerInlineButton}>
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(obra.id)} style={deleteInlineButton}>
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

const headerBlockStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 24,
  flexWrap: "wrap" as const
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
