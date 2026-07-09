"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type NaturezaServico =
  | "OPERACIONAL"
  | "ORCAMENTARIO_COMPOSTO"
  | "TECNICO_ADMINISTRATIVO";

type Servico = {
  id: string;
  codigo: string;
  tipoServico: string;
  categoria: string | null;
  natureza: NaturezaServico;
  usarEmOrcamentos: boolean;
  usarEmFichas: boolean;
  usarEmMedicoes: boolean;
  usarEmFaturamento: boolean;
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
  natureza: NaturezaServico;
  usarEmOrcamentos: boolean;
  usarEmFichas: boolean;
  usarEmMedicoes: boolean;
  usarEmFaturamento: boolean;
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
  natureza: "OPERACIONAL",
  usarEmOrcamentos: true,
  usarEmFichas: true,
  usarEmMedicoes: true,
  usarEmFaturamento: true,
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

const naturezaOptions: { value: NaturezaServico; label: string; helper: string }[] = [
  {
    value: "OPERACIONAL",
    label: "Servico operacional",
    helper: "Orcamentos, fichas, medicoes e faturamento."
  },
  {
    value: "ORCAMENTARIO_COMPOSTO",
    label: "Servico orcamentario / composto",
    helper: "Orcamentos e medicoes quando aplicavel. Nao aparece em fichas."
  },
  {
    value: "TECNICO_ADMINISTRATIVO",
    label: "Servico tecnico / administrativo",
    helper: "Orcamentos, medicoes e faturamento. Nao aparece em fichas."
  }
];

function getDefaultsByNatureza(natureza: NaturezaServico) {
  if (natureza === "ORCAMENTARIO_COMPOSTO") {
    return {
      usarEmOrcamentos: true,
      usarEmFichas: false,
      usarEmMedicoes: true,
      usarEmFaturamento: false,
      servicoTecnico: false
    };
  }

  if (natureza === "TECNICO_ADMINISTRATIVO") {
    return {
      usarEmOrcamentos: true,
      usarEmFichas: false,
      usarEmMedicoes: true,
      usarEmFaturamento: true,
      servicoTecnico: true
    };
  }

  return {
    usarEmOrcamentos: true,
    usarEmFichas: true,
    usarEmMedicoes: true,
    usarEmFaturamento: true,
    servicoTecnico: false
  };
}

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
          servico.natureza,
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
      if (key === "natureza") {
        const natureza = value as NaturezaServico;
        return {
          ...current,
          natureza,
          ...getDefaultsByNatureza(natureza)
        };
      }

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
      natureza: servico.natureza ?? "OPERACIONAL",
      usarEmOrcamentos: servico.usarEmOrcamentos ?? true,
      usarEmFichas: servico.usarEmFichas ?? true,
      usarEmMedicoes: servico.usarEmMedicoes ?? true,
      usarEmFaturamento: servico.usarEmFaturamento ?? true,
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
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Servicos</h1>
          <p className="page-copy">
            Cadastro mestre de servicos, medicao, faturamento e regras operacionais.
          </p>
        </div>
      </section>

      <section className="surface section-card manager-panel">
        <h2 style={{ marginTop: 0 }}>{form.id ? "Editar servico" : "Novo servico"}</h2>
        {!form.id ? (
          <p className="manager-panel-note" style={{ marginBottom: 18 }}>
            O codigo do servico sera gerado automaticamente no salvamento.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="manager-form-grid">
            <Field label="Tipo de servico">
              <input
                placeholder="Escavacao, transporte, carga"
                value={form.tipoServico}
                onChange={(event) => updateField("tipoServico", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Categoria">
              <input
                placeholder="Terraplenagem, apoio, locacao"
                value={form.categoria}
                onChange={(event) => updateField("categoria", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Natureza do servico">
              <select
                value={form.natureza}
                onChange={(event) => updateField("natureza", event.target.value as NaturezaServico)}
                className="field-control manager-field-control"
              >
                {naturezaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Forma de medicao">
              <input
                placeholder="Hora, viagem, m3, diaria"
                value={form.formaMedicao}
                onChange={(event) => updateField("formaMedicao", event.target.value)}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Servico tecnico faturavel">
              <select
                value={form.servicoTecnico ? "SIM" : "NAO"}
                onChange={(event) => updateField("servicoTecnico", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="NAO">NAO</option>
                <option value="SIM">SIM</option>
              </select>
            </Field>
            <Field label="Faturamento fechado">
              <select
                value={form.faturamentoFechado ? "SIM" : "NAO"}
                onChange={(event) => updateField("faturamentoFechado", event.target.value === "SIM")}
                className="field-control manager-field-control"
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
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Unidade de faturamento">
              <input
                placeholder="h, viagem, m3"
                value={form.unidadeFaturamento}
                onChange={(event) => updateField("unidadeFaturamento", event.target.value)}
                disabled={form.faturamentoFechado}
                className="field-control manager-field-control"
              />
            </Field>
            <Field label="Valor fechado padrao">
              <input
                placeholder="0,00"
                value={form.valorFechadoPadrao}
                onChange={(event) => updateField("valorFechadoPadrao", event.target.value)}
                disabled={!form.faturamentoFechado}
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
            <Field label="Exige material">
              <select
                value={form.exigeMaterial ? "SIM" : "NAO"}
                onChange={(event) => updateField("exigeMaterial", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="NAO">NAO</option>
                <option value="SIM">SIM</option>
              </select>
            </Field>
            <Field label="Ativo para medicao">
              <select
                value={form.ativoParaMedicao ? "SIM" : "NAO"}
                onChange={(event) => updateField("ativoParaMedicao", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="SIM">SIM</option>
                <option value="NAO">NAO</option>
              </select>
            </Field>
            <Field label="Usar em orcamentos">
              <select
                value={form.usarEmOrcamentos ? "SIM" : "NAO"}
                onChange={(event) => updateField("usarEmOrcamentos", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="SIM">SIM</option>
                <option value="NAO">NAO</option>
              </select>
            </Field>
            <Field label="Usar em fichas">
              <select
                value={form.usarEmFichas ? "SIM" : "NAO"}
                onChange={(event) => updateField("usarEmFichas", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="SIM">SIM</option>
                <option value="NAO">NAO</option>
              </select>
            </Field>
            <Field label="Usar em medicoes">
              <select
                value={form.usarEmMedicoes ? "SIM" : "NAO"}
                onChange={(event) => updateField("usarEmMedicoes", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="SIM">SIM</option>
                <option value="NAO">NAO</option>
              </select>
            </Field>
            <Field label="Usar em faturamento">
              <select
                value={form.usarEmFaturamento ? "SIM" : "NAO"}
                onChange={(event) => updateField("usarEmFaturamento", event.target.value === "SIM")}
                className="field-control manager-field-control"
              >
                <option value="SIM">SIM</option>
                <option value="NAO">NAO</option>
              </select>
            </Field>
          </div>

          <p className="manager-panel-note" style={{ marginTop: -8 }}>
            {naturezaOptions.find((option) => option.value === form.natureza)?.helper}
          </p>

          {form.faturamentoFechado ? (
            <p className="manager-panel-note" style={{ marginTop: -8 }}>
              Esse servico sera tratado como item fechado de medicao, usando a unidade
              <strong> SERVICO</strong> e o valor padrao informado acima.
            </p>
          ) : null}

          <Field label="Observacao">
            <textarea
              placeholder="Regras ou observacoes do servico"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
              className="field-control textarea-lg manager-field-control"
            />
          </Field>

          <div className="manager-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar servico" : "Salvar servico"}
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
            <h2 style={{ margin: "0 0 6px" }}>Servicos cadastrados</h2>
            <p className="manager-panel-note">
              {filteredServicos.length} registro(s) exibido(s) de {servicos.length}.
            </p>
          </div>
          <div className="manager-actions">
            <input
              placeholder="Buscar por codigo, tipo, categoria ou unidade"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field-control manager-field-control"
            />
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
                <th>Servico</th>
                <th>Natureza</th>
                <th>Uso</th>
                <th>Forma medicao</th>
                <th>Tecnico</th>
                <th>Fechado</th>
                <th>Unidade</th>
                <th>Valor fechado</th>
                <th>Material</th>
                <th>Medicao</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredServicos.map((servico) => (
                <tr key={servico.id}>
                  <td>{servico.codigo}</td>
                  <td>
                    <div>{servico.tipoServico}</div>
                    <div className="manager-subtle">{servico.categoria ?? "-"}</div>
                  </td>
                  <td>{naturezaOptions.find((option) => option.value === servico.natureza)?.label ?? servico.natureza}</td>
                  <td>
                    <div className="manager-subtle">
                      Orc: {servico.usarEmOrcamentos ? "SIM" : "NAO"} | Fichas: {servico.usarEmFichas ? "SIM" : "NAO"}
                    </div>
                    <div className="manager-subtle">
                      Med: {servico.usarEmMedicoes ? "SIM" : "NAO"} | Fat: {servico.usarEmFaturamento ? "SIM" : "NAO"}
                    </div>
                  </td>
                  <td>{servico.formaMedicao}</td>
                  <td>
                    <span className={servico.servicoTecnico ? "manager-badge manager-badge-success" : "manager-badge manager-badge-neutral"}>
                      {servico.servicoTecnico ? "SIM" : "NAO"}
                    </span>
                  </td>
                  <td>
                    <span className={servico.faturamentoFechado ? "manager-badge manager-badge-success" : "manager-badge manager-badge-neutral"}>
                      {servico.faturamentoFechado ? "SIM" : "NAO"}
                    </span>
                  </td>
                  <td>
                    {servico.unidadeApontamento || servico.unidadeFaturamento
                      ? `${servico.unidadeApontamento ?? "-"} / ${servico.unidadeFaturamento}`
                      : servico.unidadeFaturamento}
                  </td>
                  <td>{servico.valorFechadoPadrao ?? "-"}</td>
                  <td>
                    <span className={servico.exigeMaterial ? "manager-badge manager-badge-success" : "manager-badge manager-badge-neutral"}>
                      {servico.exigeMaterial ? "EXIGE" : "NAO"}
                    </span>
                  </td>
                  <td>
                    <span className={servico.ativoParaMedicao ? "manager-badge manager-badge-success" : "manager-badge manager-badge-warn"}>
                      {servico.ativoParaMedicao ? "ATIVO" : "BLOQUEADO"}
                    </span>
                  </td>
                  <td>
                    <span className={servico.status === "ATIVO" ? "manager-badge manager-badge-success" : "manager-badge manager-badge-warn"}>
                      {servico.status}
                    </span>
                  </td>
                  <td>
                    <div className="manager-inline-actions">
                      <button type="button" onClick={() => handleEdit(servico)} className="button-secondary">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDisable(servico.id)} className="button-secondary manager-button-warn">
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(servico.id)} className="button-secondary manager-button-danger">
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
