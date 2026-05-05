"use client";

import type { ReactNode } from "react";
import { FuncaoColaborador } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";
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
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{form.id ? "Editar colaborador" : "Novo colaborador"}</h2>
        {!form.id ? (
          <p style={{ margin: "0 0 18px", color: "#6e6457" }}>
            O codigo do colaborador sera gerado automaticamente no salvamento.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div style={formGridStyle}>
            <Field label="Nome completo">
              <input
                placeholder="Nome do colaborador"
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Apelido">
              <input
                placeholder="Nome operacional"
                value={form.apelido}
                onChange={(event) => updateField("apelido", event.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Funcao">
              <select
                value={form.funcao}
                onChange={(event) => updateField("funcao", event.target.value as FuncaoColaborador)}
                style={fieldStyle}
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
                style={fieldStyle}
              />
            </Field>
            <Field label="Telefone">
              <input
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Data de admissao">
              <input
                type="date"
                value={form.dataAdmissao}
                onChange={(event) => updateField("dataAdmissao", event.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Data de saida">
              <input
                type="date"
                value={form.dataSaida}
                onChange={(event) => updateField("dataSaida", event.target.value)}
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
          </div>

          <Field label="Observacao">
            <textarea
              placeholder="Observacoes operacionais do colaborador"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
              style={{ ...fieldStyle, minHeight: 96, resize: "vertical" as const }}
            />
          </Field>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={isPending} style={primaryButtonStyle}>
              {isPending ? "Salvando..." : form.id ? "Atualizar colaborador" : "Salvar colaborador"}
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
            <h2 style={{ margin: "0 0 6px" }}>Colaboradores cadastrados</h2>
            <p style={{ margin: 0, color: "#6e6457" }}>
              {filteredColaboradores.length} registro(s) exibido(s) de {colaboradores.length}.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              placeholder="Buscar por codigo, nome, apelido ou CPF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ ...fieldStyle, width: 320 }}
            />
            <select
              value={funcaoFilter}
              onChange={(event) =>
                setFuncaoFilter(event.target.value as "TODOS" | FuncaoColaborador)
              }
              style={{ ...fieldStyle, width: 180 }}
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
              style={{ ...fieldStyle, width: 160 }}
            >
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
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Funcao</th>
                <th style={thStyle}>CPF / Contato</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredColaboradores.map((colaborador) => (
                <tr key={colaborador.id}>
                  <td style={tdStyle}>{colaborador.codigo}</td>
                  <td style={tdStyle}>
                    <div>{colaborador.nome}</div>
                    <div style={subtleTextStyle}>{colaborador.apelido ?? "-"}</div>
                  </td>
                  <td style={tdStyle}>{colaborador.funcao}</td>
                  <td style={tdStyle}>
                    <div>{formatCpf(colaborador.documento) || "-"}</div>
                    <div style={subtleTextStyle}>{colaborador.telefone ?? "-"}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={colaborador.status === "ATIVO" ? statusActiveStyle : statusInactiveStyle}>
                      {colaborador.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => handleEdit(colaborador)} style={secondaryInlineButton}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDisable(colaborador.id)} style={dangerInlineButton}>
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(colaborador.id)} style={deleteInlineButton}>
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
