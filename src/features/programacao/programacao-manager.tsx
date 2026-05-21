"use client";

import type { ReactNode } from "react";
import { TipoRecurso, TurnoAgendaProgramacao } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";

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

type DashboardCellEntry = {
  id: string;
  status: DashboardStatus;
  obraId: string | null;
  obraNome: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  obraCodigo: string | null;
  local: string | null;
  turno: TurnoAgendaProgramacao;
  observacoes: string | null;
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
  turno: TurnoAgendaProgramacao | null;
  observacoes: string | null;
  entries: DashboardCellEntry[];
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
  equipamentoTag: string;
  date: string;
  dateFim: string;
  turno: TurnoAgendaProgramacao;
  clienteId: string;
  obraId: string;
  status: DashboardStatus;
  observacoes: string;
  local: string;
  entries: DashboardCellEntry[];
};

type DragSelection = {
  rowId: string;
  equipamentoId: string;
  equipamentoNome: string;
  equipamentoTag: string;
  startDate: string;
  endDate: string;
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
  equipamentoTag: "",
  date: "",
  dateFim: "",
  turno: "INTEGRAL",
  clienteId: "",
  obraId: "",
  status: "OPERANDO",
  observacoes: "",
  local: "",
  entries: []
};

const turnoOptions: Array<{ value: TurnoAgendaProgramacao; label: string }> = [
  { value: "MANHA", label: "Manha" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOITE", label: "Noite" },
  { value: "INTEGRAL", label: "Integral" }
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function sortDateRange(first: string, second: string) {
  return first <= second ? { start: first, end: second } : { start: second, end: first };
}

function isWeekendDate(value: string) {
  const day = parseDateInput(value).getDay();
  return day === 0 || day === 6;
}

function enumerateDateRange(start: string, end: string) {
  const range = sortDateRange(start, end);
  const cursor = parseDateInput(range.start);
  const limit = parseDateInput(range.end);
  const result: string[] = [];

  while (cursor <= limit) {
    result.push(toDateInput(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function getSchedulableDates(start: string, end: string) {
  const dates = enumerateDateRange(start, end);
  if (dates.length <= 1) {
    return dates;
  }

  const businessDates = dates.filter((date) => !isWeekendDate(date));
  return businessDates.length > 0 ? businessDates : dates;
}

function countBusinessDays(start: string, end: string) {
  return enumerateDateRange(start, end).filter((date) => !isWeekendDate(date)).length;
}

function getTurnoLabel(value: TurnoAgendaProgramacao | null) {
  if (!value) return "Integral";
  return turnoOptions.find((item) => item.value === value)?.label ?? value;
}

function getSuggestedTurno(entries: DashboardCellEntry[]) {
  const used = new Set(entries.map((entry) => entry.turno));

  if (!used.has("MANHA")) return "MANHA";
  if (!used.has("TARDE")) return "TARDE";
  if (!used.has("NOITE")) return "NOITE";
  return "INTEGRAL";
}

function startOfWeek(base: Date) {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const sundayOffset = next.getDay();
  next.setDate(next.getDate() - sundayOffset);
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
  const date = parseDateInput(value);
  return {
    weekday: date
      .toLocaleDateString("pt-BR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase(),
    day: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  };
}

function formatRangeLabel(start: string, end: string) {
  return `${parseDateInput(start).toLocaleDateString("pt-BR")} - ${parseDateInput(end).toLocaleDateString("pt-BR")}`;
}

function formatDateOrRange(start: string, end: string) {
  if (start === end) {
    return parseDateInput(start).toLocaleDateString("pt-BR");
  }

  return `${parseDateInput(start).toLocaleDateString("pt-BR")} - ${parseDateInput(end).toLocaleDateString("pt-BR")}`;
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

function optionLabel(option: ClientItem | ObraItem) {
  return [option.codigo, option.nome].filter(Boolean).join(" - ");
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
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [skipNextCellClick, setSkipNextCellClick] = useState(false);
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

  useEffect(() => {
    function resetDrag() {
      setDragSelection((current) => {
        if (!current) {
          return null;
        }

        const range = sortDateRange(current.startDate, current.endDate);

        if (range.start !== range.end) {
          setModal({
            open: true,
            programacaoId: null,
            equipamentoId: current.equipamentoId,
            equipamentoNome: current.equipamentoNome,
            equipamentoTag: current.equipamentoTag,
            date: range.start,
            dateFim: range.end,
            turno: "INTEGRAL",
            clienteId: "",
            obraId: "",
            status: "OPERANDO",
            observacoes: "",
            local: "",
            entries: []
          });
          setSkipNextCellClick(true);
        }

        return null;
      });
    }

    window.addEventListener("mouseup", resetDrag);
    return () => window.removeEventListener("mouseup", resetDrag);
  }, []);

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
    const firstEntry = cell.entries[0] ?? null;

    setModal({
      open: true,
      programacaoId: firstEntry?.id ?? null,
      equipamentoId: row.equipamento.id,
      equipamentoNome: row.equipamento.descricao,
      equipamentoTag: row.equipamento.placaOuTag,
      date: cell.date,
      dateFim: cell.date,
      turno: firstEntry?.turno ?? getSuggestedTurno(cell.entries),
      clienteId: firstEntry?.clienteId ?? "",
      obraId: firstEntry?.obraId ?? "",
      status: firstEntry?.status ?? cell.status,
      observacoes: firstEntry?.observacoes ?? "",
      local: firstEntry?.local ?? "",
      entries: cell.entries
    });
  }

  function openRangeModal(row: DashboardRow, startDate: string, endDate: string) {
    const range = sortDateRange(startDate, endDate);

    setModal({
      open: true,
      programacaoId: null,
      equipamentoId: row.equipamento.id,
      equipamentoNome: row.equipamento.descricao,
      equipamentoTag: row.equipamento.placaOuTag,
      date: range.start,
      dateFim: range.end,
      turno: "INTEGRAL",
      clienteId: "",
      obraId: "",
      status: "OPERANDO",
      observacoes: "",
      local: "",
      entries: []
    });
  }

  function closeModal() {
    setModal(initialModal);
  }

  function handleCellMouseDown(row: DashboardRow, cell: DashboardCell) {
    setSkipNextCellClick(false);
    setDragSelection({
      rowId: row.equipamento.id,
      equipamentoId: row.equipamento.id,
      equipamentoNome: row.equipamento.descricao,
      equipamentoTag: row.equipamento.placaOuTag,
      startDate: cell.date,
      endDate: cell.date
    });
  }

  function handleCellMouseEnter(row: DashboardRow, cell: DashboardCell) {
    setDragSelection((current) => {
      if (!current || current.rowId !== row.equipamento.id) {
        return current;
      }

      return {
        ...current,
        endDate: cell.date
      };
    });
  }

  function isCellInsideDrag(rowId: string, date: string) {
    if (!dragSelection || dragSelection.rowId !== rowId) {
      return false;
    }

    const range = sortDateRange(dragSelection.startDate, dragSelection.endDate);
    return date >= range.start && date <= range.end;
  }

  function startNewModalEntry() {
    setModal((current) => ({
      ...current,
      programacaoId: null,
      turno: getSuggestedTurno(current.entries),
      clienteId: "",
      obraId: "",
      status: current.entries[0]?.status ?? "OPERANDO",
      observacoes: "",
      local: ""
    }));
  }

  function editModalEntry(entry: DashboardCellEntry) {
    setModal((current) => ({
      ...current,
      programacaoId: entry.id,
      turno: entry.turno,
      clienteId: entry.clienteId ?? "",
      obraId: entry.obraId ?? "",
      status: entry.status,
      observacoes: entry.observacoes ?? "",
      local: entry.local ?? ""
    }));
  }

  async function handleDeleteModalEntry(programacaoId: string) {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta alocacao da agenda?");

    if (!confirmed) {
      return;
    }

    setFeedback("");

    startTransition(async () => {
      const response = await fetch(`/api/programacao/${programacaoId}`, {
        method: "DELETE"
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setFeedback(data.message ?? "Nao foi possivel excluir a alocacao da agenda.", "danger");
        return;
      }

      closeModal();
      setFeedback("Alocacao removida com sucesso.", "success");
      await loadDashboard();
    });
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
          dataFim: modal.dateFim || modal.date,
          datas:
            !modal.programacaoId && modal.dateFim && modal.dateFim !== modal.date
              ? getSchedulableDates(modal.date, modal.dateFim)
              : undefined,
          turno: modal.turno,
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
      setFeedback(data.message ?? "Agenda atualizada com sucesso.", "success");
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
  const businessDayCount =
    modal.date && (modal.dateFim || modal.date)
      ? countBusinessDays(modal.date, modal.dateFim || modal.date)
      : 0;

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
              <SearchableSelect
                value={clienteId}
                onChange={handleClientChange}
                options={dashboard.clients.map((client) => ({
                  value: client.id,
                  label: optionLabel(client)
                }))}
                placeholder="Digite a primeira letra do cliente"
                emptyLabel="Nenhum cliente encontrado."
              />
            </Field>

            <Field label="Obra">
              <SearchableSelect
                value={obraId}
                onChange={setObraId}
                options={filteredObras.map((obra) => ({
                  value: obra.id,
                  label: optionLabel(obra)
                }))}
                disabled={!clienteId}
                placeholder="Digite a primeira letra da obra"
                emptyLabel="Nenhuma obra encontrada para esse cliente."
              />
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
              const isToday = day === toDateInput(new Date());
              const isWeekend = isWeekendDate(day);

              return (
                <div
                  key={day}
                  className={`programacao-day-head ${isToday ? "is-today" : ""} ${isWeekend ? "is-weekend" : ""}`}
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
                  const today = cell.date === toDateInput(new Date());
                  const weekend = isWeekendDate(cell.date);

                  return (
                    <button
                      key={`${row.equipamento.id}-${cell.date}`}
                      type="button"
                      className={`programacao-cell status-${cell.status.toLowerCase().replace("_", "-")} ${today ? "is-today" : ""} ${weekend ? "is-weekend" : ""} ${isCellInsideDrag(row.equipamento.id, cell.date) ? "is-drag-range" : ""}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleCellMouseDown(row, cell);
                      }}
                      onMouseEnter={() => handleCellMouseEnter(row, cell)}
                      onClick={() => {
                        if (skipNextCellClick) {
                          setSkipNextCellClick(false);
                          return;
                        }

                        openCellModal(row, cell);
                      }}
                      title={[
                        row.equipamento.descricao,
                        cell.status,
                        weekend && cell.entries.length === 0
                          ? "Folga"
                          : cell.entries.length > 1
                          ? cell.entries
                              .map((entry) => `${getTurnoLabel(entry.turno)}: ${entry.obraNome ?? entry.local ?? "Sem obra"}`)
                              .join(" | ")
                          : cell.obraNome ?? cell.local ?? "Sem obra",
                        cell.observacoes ?? ""
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    >
                      <strong>{cell.status.replace("_", " ")}</strong>
                      {weekend && cell.entries.length === 0 ? (
                        <span>Folga</span>
                      ) : cell.entries.length > 1 ? (
                        <span>
                          {cell.entries
                            .slice(0, 2)
                            .map((entry) => `${getTurnoLabel(entry.turno)}: ${entry.obraCodigo ?? entry.obraNome ?? entry.local ?? "Sem obra"}`)
                            .join(" · ")}
                        </span>
                      ) : (
                        <span>{cell.obraNome ?? cell.local ?? "Sem alocacao"}</span>
                      )}
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
                  {modal.equipamentoNome} · {modal.equipamentoTag} · {formatDateOrRange(modal.date, modal.dateFim || modal.date)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCell} style={{ display: "grid", gap: 18 }}>
              {modal.entries.length > 0 ? (
                <div className="surface-inset" style={{ display: "grid", gap: 10, padding: 14, borderRadius: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <strong style={{ fontSize: 13 }}>Alocacoes do dia</strong>
                    <button type="button" className="button-secondary" onClick={startNewModalEntry}>
                      Adicionar alocacao
                    </button>
                  </div>

                  <div className="list-stack">
                    {modal.entries.map((entry) => (
                      <div key={entry.id} className="list-item" style={{ alignItems: "flex-start" }}>
                        <div>
                          <strong>{getTurnoLabel(entry.turno)}</strong>
                          <span className="subtle">
                            {entry.obraCodigo ? `${entry.obraCodigo} - ` : ""}
                            {entry.obraNome ?? entry.local ?? "Sem alocacao"}
                          </span>
                        </div>
                        <div className="toolbar-actions" style={{ marginLeft: "auto" }}>
                          <button type="button" className="button-secondary" onClick={() => editModalEntry(entry)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button-danger"
                            onClick={() => handleDeleteModalEntry(entry.id)}
                            disabled={isPending}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="toolbar-actions">
                  <button type="button" className="button-secondary" onClick={startNewModalEntry}>
                    Adicionar alocacao
                  </button>
                </div>
              )}

              <div className="form-grid-3">
                <Field label="Periodo">
                  <div style={{ display: "grid", gap: 8 }}>
                    <input
                      className="field-control"
                      value={formatDateOrRange(modal.date, modal.dateFim || modal.date)}
                      readOnly
                    />
                    <span className="subtle">
                      Dias considerados no agendamento: {String(businessDayCount).padStart(2, "0")}
                    </span>
                  </div>
                </Field>

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

                <Field label="Turno">
                  <select
                    className="field-control"
                    value={modal.turno}
                    onChange={(event) =>
                      setModal((current) => ({
                        ...current,
                        turno: event.target.value as TurnoAgendaProgramacao
                      }))
                    }
                  >
                    {turnoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Cliente">
                  <SearchableSelect
                    value={modal.clienteId}
                    onChange={(value) =>
                      setModal((current) => ({
                        ...current,
                        clienteId: value,
                        obraId: ""
                      }))
                    }
                    options={dashboard.clients.map((client) => ({
                      value: client.id,
                      label: optionLabel(client)
                    }))}
                    placeholder="Digite a primeira letra do cliente"
                    emptyLabel="Nenhum cliente encontrado."
                  />
                </Field>

                <Field label="Obra">
                  <SearchableSelect
                    value={modal.obraId}
                    onChange={(value) =>
                      setModal((current) => ({
                        ...current,
                        obraId: value
                      }))
                    }
                    options={modalObras.map((obra) => ({
                      value: obra.id,
                      label: optionLabel(obra)
                    }))}
                    disabled={!modal.clienteId}
                    placeholder="Digite a primeira letra da obra"
                    emptyLabel="Nenhuma obra encontrada para esse cliente."
                  />
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
                  {isPending ? "Salvando..." : modal.programacaoId ? "Salvar alocacao" : "Criar alocacao"}
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
