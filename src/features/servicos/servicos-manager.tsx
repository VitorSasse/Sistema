"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type Servico = {
  id: string;
  codigo: string;
  tipoServico: string;
  categoria: string | null;
  servicoTecnico: boolean;
  faturamentoFechado: boolean;
  valorFechadoPadrao: string | null;
  formaMedicao: string;
  unidadeApontamento: string | null;
  unidadeFaturamento: string;
  exigeMaterial: boolean;
  ativoParaMedicao: boolean;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
};

type FormState = {
  id?: string;
  tipoServico: string;
  categoria: string;
  servicoTecnico: boolean;
  faturamentoFechado: boolean;
  valorFechadoPadrao: string;
  formaMedicao: string;
  unidadeApontamento: string;
  unidadeFaturamento: string;
  exigeMaterial: boolean;
  ativoParaMedicao: boolean;
  observacao: string;
  status: "ATIVO" | "INATIVO";
};

const initialForm: FormState = {
  tipoServico: "",
  categoria: "",
  servicoTecnico: false,
  faturamentoFechado: false,
  valorFechadoPadrao: "",
  formaMedicao: "",
  unidadeApontamento: "",
  unidadeFaturamento: "",
  exigeMaterial: false,
  ativoParaMedicao: true,
  observacao: "",
  status: "ATIVO"
};

export function ServicosManager() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadServicos() {
    const response = await fetch("/api/servicos", { cache: "no-store" });
    const data = (await response.json()) as { items: Servico[] };
    setServicos(data.items);
  }

  useEffect(() => {
    void loadServicos();
  }, []);

  const filteredServicos = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return servicos.filter((servico) => {
      const matchesStatus = statusFilter === "TODOS" || servico.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [
          servico.codigo,
          servico.tipoServico,
          servico.categoria ?? "",
          servico.servicoTecnico ? "tecnico" : "",
          servico.faturamentoFechado ? "fechado" : "",
          servico.formaMedicao,
          servico.unidadeFaturamento,
          servico.valorFechadoPadrao ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesStatus && matchesSearch;
    });
  }, [servicos, search, statusFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      if (key === "faturamentoFechado") {
        const enabled = value as boolean;
        return {
          ...current,
          [key]: value,
          unidadeApontamento: enabled ? "SERVICO" : current.unidadeApontamento,
          unidadeFaturamento: enabled ? "SERVICO" : current.unidadeFaturamento
        };
      }

      return { ...current, [key]: value };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/servicos/${form.id}` : "/api/servicos";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o servico.");
        return;
      }

      setForm(initialForm);
      setMessage(form.id ? "Servico atualizado com sucesso." : "Servico cadastrado com sucesso.");
      await loadServicos();
    });
  }

  function handleEdit(servico: Servico) {
    setForm({
      id: servico.id,
      tipoServico: servico.tipoServico,
      categoria: servico.categoria ?? "",
      servicoTecnico: servico.servicoTecnico,
      faturamentoFechado: servico.faturamentoFechado,
      valorFechadoPadrao: servico.valorFechadoPadrao ?? "",
      formaMedicao: servico.formaMedicao,
      unidadeApontamento: servico.unidadeApontamento ?? "",
      unidadeFaturamento: servico.unidadeFaturamento,
      exigeMaterial: servico.exigeMaterial,
      ativoParaMedicao: servico.ativoParaMedicao,
      observacao: servico.observacao ?? "",
      status: servico.status
    });
    setMessage("");
  }

  function handleReset() {
    setForm(initialForm);
    setMessage("");
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/servicos/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o servico.");
        return;
      }

      setMessage("Servico inativado.");
      await loadServicos();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("este servico")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/servicos/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o servico.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Servico excluido.");
      await loadServicos();
    });
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{form.id ? "Editar servico" : "Novo servico"}</h2>
        {!form.id ? (
          <p style={{ margin: "0 0 18px", color: "var(--muted)" }}>
            O codigo do servico sera gerado automaticamente no salvamento.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div style={formGridStyle}>
            <Field label="Tipo de servico">
              <input
                placeholder="Escavacao, transporte, carga"
                value={form.tipoServico}
                onChange={(event) => updateField("tipoServico", event.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Categoria">
              <input
                placeholder="Terraplenagem, apoio, locacao"
                value={form.categoria}
                onChange={(event) => updateField("categoria", event.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Forma de medicao">
              <input
                placeholder="Hora, viagem, m3, diaria"
                value={form.formaMedicao}
                onChange={(event) => updateField("formaMedicao", event.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Servico tecnico faturavel">
              <select
                value={form.servicoTecnico ? "SIM" : "NAO"}
                onChange={(event) => updateField("servicoTecnico", event.target.value === "SIM")}
                style={fieldStyle}
              >
                <option value="NAO">NAO</option>
                <option value="SIM">SIM</option>
              </select>
            </Field>
            <Field label="Faturamento fechado">
              <select
                value={form.faturamentoFechado ? "SIM" : "NAO"}
                onChange={(event) => updateField("faturamentoFechado", event.target.value === "SIM")}
                style={fieldStyle}
              >
                <option value="NAO">NAO</option>
                <option value="SIM">SIM</option>
              </select>
            </Field>
            <Field label="Unidade de apontamento">
              <input
                placeholder="h, viagem, m3"
                value={form.unidadeApontamento}
                onChange={(event) => updateField("unidadeApontamento", event.target.value)}
                disabled={form.faturamentoFechado}
                style={fieldStyle}
              />
            </Field>
            <Field label="Unidade de faturamento">
              <input
                placeholder="h, viagem, m3"
                value={form.unidadeFaturamento}
                onChange={(event) => updateField("unidadeFaturamento", event.target.value)}
                disabled={form.faturamentoFechado}
                style={fieldStyle}
              />
            </Field>
            <Field label="Valor fechado padrao">
              <input
                placeholder="0,00"
                value={form.valorFechadoPadrao}
                onChange={(event) => updateField("valorFechadoPadrao", event.target.value)}
                disabled={!form.faturamentoFechado}
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
            <Field label="Exige material">
              <select
                value={form.exigeMaterial ? "SIM" : "NAO"}
                onChange={(event) => updateField("exigeMaterial", event.target.value === "SIM")}
                style={fieldStyle}
              >
                <option value="NAO">NAO</option>
                <option value="SIM">SIM</option>
              </select>
            </Field>
            <Field label="Ativo para medicao">
              <select
                value={form.ativoParaMedicao ? "SIM" : "NAO"}
                onChange={(event) => updateField("ativoParaMedicao", event.target.value === "SIM")}
                style={fieldStyle}
              >
                <option value="SIM">SIM</option>
                <option value="NAO">NAO</option>
              </select>
            </Field>
          </div>

          {form.faturamentoFechado ? (
            <p style={{ margin: "-8px 0 0", color: "var(--muted)" }}>
              Esse servico sera tratado como item fechado de medicao, usando a unidade
              <strong> SERVICO</strong> e o valor padrao informado acima.
            </p>
          ) : null}

          <Field label="Observacao">
            <textarea
              placeholder="Regras ou observacoes do servico"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
              style={{ ...fieldStyle, minHeight: 96, resize: "vertical" as const }}
            />
          </Field>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={isPending} style={primaryButtonStyle}>
              {isPending ? "Salvando..." : form.id ? "Atualizar servico" : "Salvar servico"}
            </button>
            <button type="button" onClick={handleReset} style={secondaryButtonStyle}>
              Limpar formulario
            </button>
          </div>

          {message ? <p style={{ margin: 0, color: "var(--muted)" }}>{message}</p> : null}
        </form>
      </section>

      <section style={panelStyle}>
        <div style={toolbarStyle}>
          <div>
            <h2 style={{ margin: "0 0 6px" }}>Servicos cadastrados</h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {filteredServicos.length} registro(s) exibido(s) de {servicos.length}.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              placeholder="Buscar por codigo, tipo, categoria ou unidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ ...fieldStyle, width: 320 }}
            />
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
                <th style={thStyle}>Servico</th>
                <th style={thStyle}>Forma medicao</th>
                <th style={thStyle}>Tecnico</th>
                <th style={thStyle}>Fechado</th>
                <th style={thStyle}>Unidade</th>
                <th style={thStyle}>Valor fechado</th>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Medicao</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredServicos.map((servico) => (
                <tr key={servico.id}>
                  <td style={tdStyle}>{servico.codigo}</td>
                  <td style={tdStyle}>
                    <div>{servico.tipoServico}</div>
                    <div style={subtleTextStyle}>{servico.categoria ?? "-"}</div>
                  </td>
                  <td style={tdStyle}>{servico.formaMedicao}</td>
                  <td style={tdStyle}>
                    <span style={servico.servicoTecnico ? statusActiveStyle : neutralStyle}>
                      {servico.servicoTecnico ? "SIM" : "NAO"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={servico.faturamentoFechado ? statusActiveStyle : neutralStyle}>
                      {servico.faturamentoFechado ? "SIM" : "NAO"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {servico.unidadeApontamento || servico.unidadeFaturamento
                      ? `${servico.unidadeApontamento ?? "-"} / ${servico.unidadeFaturamento}`
                      : servico.unidadeFaturamento}
                  </td>
                  <td style={tdStyle}>{servico.valorFechadoPadrao ?? "-"}</td>
                  <td style={tdStyle}>
                    <span style={servico.exigeMaterial ? statusActiveStyle : neutralStyle}>
                      {servico.exigeMaterial ? "EXIGE" : "NAO"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={servico.ativoParaMedicao ? statusActiveStyle : statusInactiveStyle}>
                      {servico.ativoParaMedicao ? "ATIVO" : "BLOQUEADO"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={servico.status === "ATIVO" ? statusActiveStyle : statusInactiveStyle}>
                      {servico.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => handleEdit(servico)} style={secondaryInlineButton}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDisable(servico.id)} style={dangerInlineButton}>
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(servico.id)} style={deleteInlineButton}>
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
      <span style={{ fontSize: 14, color: "var(--muted)" }}>{label}</span>
      {children}
    </label>
  );
}

const panelStyle = {
  padding: 24,
  borderRadius: 22,
  background: "var(--surface)",
  border: "1px solid var(--line-strong)",
  boxShadow: "var(--shadow-md)"
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
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid var(--line-strong)",
  background: "var(--surface-strong)",
  color: "var(--text)",
  width: "100%"
};

const primaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #fb923c, #f97316)",
  color: "var(--text-on-brand)"
};

const secondaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 14,
  border: "1px solid rgba(15, 42, 68, 0.5)",
  background: "rgba(15, 42, 68, 0.12)",
  color: "var(--text)"
};

const secondaryInlineButton = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(15, 42, 68, 0.42)",
  background: "rgba(15, 42, 68, 0.14)",
  color: "var(--text)"
};

const dangerInlineButton = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(249, 115, 22, 0.28)",
  background: "rgba(249, 115, 22, 0.14)",
  color: "#fdba74"
};

const deleteInlineButton = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(239, 68, 68, 0.32)",
  background: "rgba(239, 68, 68, 0.14)",
  color: "#fca5a5"
};

const thStyle = {
  textAlign: "left" as const,
  padding: 12,
  borderBottom: "1px solid var(--line-strong)",
  whiteSpace: "nowrap" as const
};

const tdStyle = {
  padding: 12,
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top" as const
};

const subtleTextStyle = {
  color: "var(--muted)",
  fontSize: 13
};

const statusActiveStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(34, 197, 94, 0.14)",
  color: "#86efac",
  fontSize: 12,
  fontWeight: 700
};

const statusInactiveStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(249, 115, 22, 0.14)",
  color: "#fdba74",
  fontSize: 12,
  fontWeight: 700
};

const neutralStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(148, 163, 184, 0.16)",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 700
};
