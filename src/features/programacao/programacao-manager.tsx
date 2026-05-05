"use client";

import type { ReactNode } from "react";
import { TipoRecurso } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";

type DashboardStatus =
  | "OPERANDO"
  | "DISPONIVEL"
  | "SEM_FRENTE"
  | "MANUTENCAO"
  | "FALTA"
  | "FERIAS"
  | "CHUVA";

type PeriodView = "HOJE" | "SEMANA" | "MES";

type ClientItem = {
  id: string;
  codigo: string;
  nome: string;
};

type ObraItem = {
  id: string;
  codigo: string;
  nome: string;
  clienteId: string;
  cliente: {
    id: string;
    codigo: string;
    nome: string;
  };
};

type SummaryItem = {
  status: DashboardStatus;
  count: number;
};

type DashboardCell = {
  date: string;
  programacaoId: string | null;
  status: DashboardStatus;
  obraId: string | null;
  obraNome: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  obraCodigo: string | null;
  local: string | null;
  turno: string | null;
  observacoes: string | null;
};

type DashboardRow = {
  equipamento: {
    id: string;
    descricao: string;
    placaOuTag: string;
    tipoRecurso: TipoRecurso;
    statusOperacional: string;
  };
  revision: {
    status: "EM_DIA" | "PROXIMA" | "VENCIDA" | "SEM_PLANO";
    label: string;
  };
  focusStatus: DashboardStatus;
  priority: number;
  cells: DashboardCell[];
};

type DashboardPayload = {
  filters: {
    clienteId: string | null;
    obraId: string | null;
    status: DashboardStatus | null;
    view: PeriodView;
    referenceDate: string;
  };
  range: {
    start: string;
    end: string;
    focusDate: string;
  };
  days: string[];
  clients: ClientItem[];
  obras: ObraItem[];
  summary: SummaryItem[];
  rows: DashboardRow[];
};

type ModalState = {
  open: boolean;
  programacaoId: string | null;
  equipamentoId: string;
  equipamentoNome: string;
  date: string;
  clienteId: string;
  obraId: string;
  status: DashboardStatus;
  observacoes: string;
  local: string;
};

const statusCards: Array<{
  status: DashboardStatus;
  label: string;
  accentClass: string;
  icon: string;
}> = [
  { status: "OPERANDO", label: "Operando", accentClass: "is-operando", icon: "OP" },
  { status: "DISPONIVEL", label: "Disponivel", accentClass: "is-disponivel", icon: "DP" },
  { status: "SEM_FRENTE", label: "Sem frente", accentClass: "is-sem-frente", icon: "SF" },
  { status: "MANUTENCAO", label: "Manutencao", accentClass: "is-manutencao", icon: "MN" },
  { status: "FALTA", label: "Falta", accentClass: "is-falta", icon: "FT" },
  { status: "FERIAS", label: "Ferias", accentClass: "is-ferias", icon: "FR" },
  { status: "CHUVA", label: "Chuva", accentClass: "is-chuva", icon: "CV" }
];

const initialModal: ModalState = {
  open: false,
  programacaoId: null,
  equipamentoId: "",
  equipamentoNome: "",
  date: "",
  clienteId: "",
  obraId: "",
  status: "OPERANDO",
  observacoes: "",
  local: ""
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfWeek(base: Date) {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function endOfWeek(base: Date) {
  const next = startOfWeek(base);
  next.setDate(next.getDate() + 6);
  return next;
}

function startOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function endOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0);
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  return {
    weekday: date
      .toLocaleDateString("pt-BR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase(),
    day: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  };
}

function formatRangeLabel(start: string, end: string) {
  return `${new Date(start).toLocaleDateString("pt-BR")} - ${new Date(end).toLocaleDateString("pt-BR")}`;
}

function buildQuery(params: {
  clienteId: string;
  obraId: string;
  status: string;
  view: PeriodView;
  referenceDate: string;
}) {
  const search = new URLSearchParams();
  if (params.clienteId) search.set("clienteId", params.clienteId);
  if (params.obraId) search.set("obraId", params.obraId);
  if (params.status) search.set("status", params.status);
  search.set("view", params.view);
  search.set("date", params.referenceDate);
  return search.toString();
}

function getRevisionClass(status: DashboardRow["revision"]["status"]) {
  if (status === "VENCIDA") return "revision-indicator is-danger";
  if (status === "PROXIMA") return "revision-indicator is-warn";
  if (status === "EM_DIA") return "revision-indicator is-success";
  return "revision-indicator is-muted";
}

export function ProgramacaoManager() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [obraId, setObraId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<PeriodView>("SEMANA");
  const [referenceDate, setReferenceDate] = useState(() => toDateInput(new Date()));
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "danger">("neutral");
  const [modal, setModal] = useState<ModalState>(initialModal);
  const [isPending, startTransition] = useTransition();

  async function loadDashboard(next?: Partial<{
    clienteId: string;
    obraId: string;
    statusFilter: string;
    view: PeriodView;
    referenceDate: string;
  }>) {
    const query = buildQuery({
      clienteId: next?.clienteId ?? clienteId,
      obraId: next?.obraId ?? obraId,
      status: next?.statusFilter ?? statusFilter,
      view: next?.view ?? view,
      referenceDate: next?.referenceDate ?? referenceDate
    });

    const response = await fetch(`/api/programacao/dashboard?${query}`, { cache: "no-store" });
    const data = (await response.json()) as DashboardPayload;
    setDashboard(data);
  }

  useEffect(() => {
    void loadDashboard();
  }, [clienteId, obraId, statusFilter, view, referenceDate]);

  const filteredObras = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return clienteId ? dashboard.obras.filter((item) => item.clienteId === clienteId) : [];
  }, [dashboard, clienteId]);

  const rangeLabel = useMemo(() => {
    if (!dashboard) return "";
    return formatRangeLabel(dashboard.range.start, dashboard.range.end);
  }, [dashboard]);

  const totalEquipamentos = dashboard?.rows.length ?? 0;

  function setFeedback(nextMessage: string, tone: "neutral" | "success" | "danger" = "neutral") {
    setMessage(nextMessage);
    setMessageTone(tone);
  }

  function handleClientChange(nextClienteId: string) {
    setClienteId(nextClienteId);
    setObraId("");
  }

  function shiftRange(direction: -1 | 1) {
    const base = new Date(`${referenceDate}T00:00:00`);

    if (view === "HOJE") {
      base.setDate(base.getDate() + direction);
    } else if (view === "SEMANA") {
      base.setDate(base.getDate() + direction * 7);
    } else {
      base.setMonth(base.getMonth() + direction);
    }

    setReferenceDate(toDateInput(base));
  }

  function jumpToToday(nextView?: PeriodView) {
    if (nextView) {
      setView(nextView);
    }
    setReferenceDate(toDateInput(new Date()));
  }

  function openCellModal(row: DashboardRow, cell: DashboardCell) {
    setModal({
      open: true,
      programacaoId: cell.programacaoId,
      equipamentoId: row.equipamento.id,
      equipamentoNome: row.equipamento.descricao,
      date: cell.date.slice(0, 10),
      clienteId: cell.clienteId ?? "",
      obraId: cell.obraId ?? "",
      status: cell.status,
      observacoes: cell.observacoes ?? "",
      local: cell.local ?? ""
    });
  }

  function closeModal() {
    setModal(initialModal);
  }

  async function handleSaveCell(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    startTransition(async () => {
      const method = modal.programacaoId ? "PATCH" : "POST";
      const url = modal.programacaoId ? `/api/programacao/${modal.programacaoId}` : "/api/programacao";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipamentoId: modal.equipamentoId,
          obraId: modal.obraId,
          local: modal.local,
          dataInicio: modal.date,
          dataFim: modal.date,
          turno: null,
          status: modal.status,
          observacoes: modal.observacoes
        })
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setFeedback(data.message ?? "Nao foi possivel salvar a celula da agenda.", "danger");
        return;
      }

      closeModal();
      setFeedback("Agenda atualizada com sucesso.", "success");
      await loadDashboard();
    });
  }

  const modalObras = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return modal.clienteId
      ? dashboard.obras.filter((item) => item.clienteId === modal.clienteId)
      : [];
  }, [dashboard, modal.clienteId]);

  if (!dashboard) {
    return <p className="section-copy">Carregando agenda operacional...</p>;
  }

  const days = dashboard.days;

  return (
    <main className="page-stack">
      <section className="surface section-card programacao-hero-panel fade-up">
        <div className="programacao-hero-top">
          <div>
            <h2 className="section-title programacao-hero-title">Agenda de programacao</h2>
            <p className="section-copy">
              Painel rapido para entender alocacao, status da operacao e revisao por equipamento.
            </p>
          </div>
          <div className="programacao-range-controls">
            <button type="button" className="button-secondary" onClick={() => shiftRange(-1)}>
              {"<"}
            </button>
            <div className="programacao-range-badge">{rangeLabel}</div>
            <button type="button" className="button-secondary" onClick={() => shiftRange(1)}>
              {">"}
            </button>
          </div>
        </div>

        <div className="programacao-toolbar">
          <div className="programacao-toolbar-filters">
            <Field label="Cliente">
              <select
                className="field-control"
                value={clienteId}
                onChange={(event) => handleClientChange(event.target.value)}
              >
                <option value="">Todos os clientes</option>
                {dashboard.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.codigo} - {client.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Obra">
              <select
                className="field-control"
                value={obraId}
                onChange={(event) => setObraId(event.target.value)}
                disabled={!clienteId}
              >
                <option value="">Todas as obras</option>
                {filteredObras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.codigo} - {obra.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="programacao-toolbar-actions">
            <button type="button" className="button-secondary" onClick={() => jumpToToday("HOJE")}>
              Hoje
            </button>
            <button
              type="button"
              className={view === "SEMANA" ? "button-primary" : "button-secondary"}
              onClick={() => setView("SEMANA")}
            >
              Semana
            </button>
            <button
              type="button"
              className={view === "MES" ? "button-primary" : "button-secondary"}
              onClick={() => setView("MES")}
            >
              Mes
            </button>
          </div>
        </div>
      </section>

      <section className="programacao-kpi-grid fade-up fade-up-delay-1">
        {statusCards.map((item) => {
          const count = dashboard.summary.find((summary) => summary.status === item.status)?.count ?? 0;
          const active = statusFilter === item.status;

          return (
            <button
              key={item.status}
              type="button"
              className={`programacao-kpi-card ${item.accentClass} ${active ? "is-active" : ""}`}
              onClick={() => setStatusFilter(active ? "" : item.status)}
            >
              <span className="programacao-kpi-icon">{item.icon}</span>
              <span className="programacao-kpi-copy">
                <strong>{item.label}</strong>
                <span>{String(count).padStart(2, "0")}</span>
              </span>
            </button>
          );
        })}

        <article className="programacao-kpi-card is-total">
          <span className="programacao-kpi-copy">
            <strong>Total equipamentos</strong>
            <span>{String(totalEquipamentos).padStart(2, "0")}</span>
          </span>
        </article>
      </section>

      <section className="surface section-card fade-up fade-up-delay-2">
        <div
          className="programacao-grid-shell"
          style={{ ["--programacao-cols" as string]: String(days.length) }}
        >
          <div className="programacao-grid programacao-grid-head">
            <div className="programacao-equipment-head">Equipamentos</div>
            {days.map((day) => {
              const label = formatDayLabel(day);
              const isToday = day.slice(0, 10) === toDateInput(new Date());

              return (
                <div
                  key={day}
                  className={`programacao-day-head ${isToday ? "is-today" : ""}`}
                >
                  <strong>{label.weekday}</strong>
                  <span>{label.day}</span>
                </div>
              );
            })}
          </div>

          <div className="programacao-grid-body">
            {dashboard.rows.map((row) => (
              <div key={row.equipamento.id} className="programacao-grid-row">
                <div className={`programacao-equipment-card ${row.focusStatus === "OPERANDO" ? "is-row-operando" : ""}`}>
                  <div className="programacao-equipment-avatar">
                    {row.equipamento.tipoRecurso === "CAMINHAO" ? "CA" : row.equipamento.tipoRecurso === "MAQUINA" ? "MQ" : "EQ"}
                  </div>
                  <div className="programacao-equipment-copy">
                    <strong>{row.equipamento.descricao}</strong>
                    <span>{row.equipamento.placaOuTag}</span>
                    <span className="programacao-equipment-type">{row.equipamento.tipoRecurso}</span>
                  </div>
                  <div className={getRevisionClass(row.revision.status)}>
                    <strong>
                      {row.revision.status === "EM_DIA"
                        ? "OK"
                        : row.revision.status === "PROXIMA"
                          ? "AL"
                          : row.revision.status === "VENCIDA"
                            ? "VE"
                            : "--"}
                    </strong>
                    <span>{row.revision.label}</span>
                  </div>
                </div>

                {row.cells.map((cell) => {
                  const today = cell.date.slice(0, 10) === toDateInput(new Date());

                  return (
                    <button
                      key={`${row.equipamento.id}-${cell.date}`}
                      type="button"
                      className={`programacao-cell status-${cell.status.toLowerCase().replace("_", "-")} ${today ? "is-today" : ""}`}
                      onClick={() => openCellModal(row, cell)}
                      title={[
                        row.equipamento.descricao,
                        cell.status,
                        cell.obraNome ?? cell.local ?? "Sem obra",
                        cell.observacoes ?? ""
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    >
                      <strong>{cell.status.replace("_", " ")}</strong>
                      <span>{cell.obraNome ?? cell.local ?? "Sem alocacao"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="programacao-footer-grid">
        <article className="surface section-card">
          <h3 className="section-title">Legenda de status</h3>
          <div className="programacao-legend-grid">
            {statusCards.map((item) => (
              <div key={item.status} className="programacao-legend-item">
                <span className={`programacao-legend-dot ${item.accentClass}`} />
                <div>
                  <strong>{item.label}</strong>
                  <p className="section-copy">
                    {item.status === "OPERANDO"
                      ? "Equipamento em atividade na obra."
                      : item.status === "DISPONIVEL"
                        ? "Equipamento livre para alocacao."
                        : item.status === "SEM_FRENTE"
                          ? "Sem frente operacional definida."
                          : item.status === "MANUTENCAO"
                            ? "Bloqueado ou em manutencao."
                            : item.status === "FALTA"
                              ? "Sem operador ou indisponivel por falta."
                              : item.status === "FERIAS"
                                ? "Parada programada por ferias."
                                : "Impactado por clima."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface section-card">
          <h3 className="section-title">Alertas de revisao</h3>
          <div className="list-stack">
            <div className="list-item">
              <span className="badge badge-success">Revisao em dia</span>
              <span className="subtle">Sem risco imediato pelo controle atual.</span>
            </div>
            <div className="list-item">
              <span className="badge badge-warn">Revisao proxima</span>
              <span className="subtle">Acompanhamento preventivo recomendado.</span>
            </div>
            <div className="list-item">
              <span className="badge badge-danger">Revisao vencida</span>
              <span className="subtle">Prioridade alta para evitar impacto operacional.</span>
            </div>
          </div>
        </article>
      </section>

      {message ? (
        <p
          className={
            messageTone === "success"
              ? "message-inline message-inline-success"
              : messageTone === "danger"
                ? "message-inline message-inline-danger"
                : "message-inline"
          }
        >
          {message}
        </p>
      ) : null}

      {modal.open ? (
        <div className="dialog-backdrop" role="presentation" onClick={closeModal}>
          <section
            className="surface section-card dialog-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-header">
              <div>
                <h3 className="section-title">Atualizar celula da agenda</h3>
                <p className="section-copy">
                  {modal.equipamentoNome} · {new Date(`${modal.date}T00:00:00`).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCell} style={{ display: "grid", gap: 18 }}>
              <div className="form-grid-3">
                <Field label="Status">
                  <select
                    className="field-control"
                    value={modal.status}
                    onChange={(event) =>
                      setModal((current) => ({
                        ...current,
                        status: event.target.value as DashboardStatus
                      }))
                    }
                  >
                    {statusCards.map((item) => (
                      <option key={item.status} value={item.status}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Cliente">
                  <select
                    className="field-control"
                    value={modal.clienteId}
                    onChange={(event) =>
                      setModal((current) => ({
                        ...current,
                        clienteId: event.target.value,
                        obraId: ""
                      }))
                    }
                  >
                    <option value="">Selecione um cliente</option>
                    {dashboard.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.codigo} - {client.nome}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Obra">
                  <select
                    className="field-control"
                    value={modal.obraId}
                    onChange={(event) =>
                      setModal((current) => ({
                        ...current,
                        obraId: event.target.value
                      }))
                    }
                    disabled={!modal.clienteId}
                  >
                    <option value="">Selecione uma obra</option>
                    {modalObras.map((obra) => (
                      <option key={obra.id} value={obra.id}>
                        {obra.codigo} - {obra.nome}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Local complementar">
                <input
                  className="field-control"
                  value={modal.local}
                  onChange={(event) =>
                    setModal((current) => ({
                      ...current,
                      local: event.target.value
                    }))
                  }
                  placeholder="Opcional quando a obra nao estiver cadastrada"
                />
              </Field>

              <Field label="Observacoes">
                <textarea
                  className="field-control textarea-lg"
                  value={modal.observacoes}
                  onChange={(event) =>
                    setModal((current) => ({
                      ...current,
                      observacoes: event.target.value
                    }))
                  }
                />
              </Field>

              <div className="toolbar-actions">
                <button type="submit" className="button-primary" disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar celula"}
                </button>
                <button type="button" className="button-secondary" onClick={closeModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
