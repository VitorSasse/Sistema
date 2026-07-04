"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableMultiSelect } from "@/components/form/searchable-multi-select";
import { ExpandableChart } from "@/components/dashboard/expandable-chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type MonthStatus = "OK" | "SEM_DADOS" | "SEM_LEITURA_ANTERIOR" | "INCONSISTENTE" | "SEM_TIPO_CONTROLE";
type ControlType = "KM" | "HORIMETRO";
type SortDirection = "asc" | "desc";

type EquipmentOption = {
  id: string;
  label: string;
  status: string;
  tipo: ControlType;
};

type MonthDefinition = {
  key: string;
  label: string;
  month: number;
};

type ReadingDetail = {
  data: string;
  leitura: number;
  origem: string;
  ficha: string | null;
  cliente: string | null;
  obra: string | null;
};

type MonthCell = {
  key: string;
  label: string;
  value: number;
  status: MonthStatus;
  initialReading: number | null;
  finalReading: number | null;
  firstReadingDate: string | null;
  lastReadingDate: string | null;
  readingsCount: number;
  clientes: string[];
  obras: string[];
  readings: ReadingDetail[];
};

type MonthlyRow = {
  equipamentoId: string;
  equipamento: string;
  tipoControle: ControlType;
  tipoLabel: string;
  tipoRecurso: string;
  unidade: "km" | "h";
  total: number;
  inconsistencias: number;
  semLeituraAnterior: number;
  months: MonthCell[];
};

type DashboardPayload = {
  period: {
    year: number;
    startMonth: number;
    endMonth: number;
    start: string;
    end: string;
    label: string;
  };
  filters: {
    equipamentoIds: string[];
    equipamentos: EquipmentOption[];
  };
  months: MonthDefinition[];
  summary: {
    totalKm: number;
    totalHoras: number;
    totalHorasMaquinas: number;
    totalEquipamentos: number;
    inconsistencias: number;
    semLeituraAnterior: number;
    equipamentoMaiorVariacao: {
      equipamento: string;
      tipoControle: ControlType;
      unidade: "km" | "h";
      total: number;
    } | null;
    maquinaMaiorHoras: {
      equipamento: string;
      total: number;
    } | null;
  };
  rows: MonthlyRow[];
  chart: {
    monthlyTotals: Array<{
      key: string;
      label: string;
      km: number;
      horas: number;
    }>;
  };
};

const monthOptions = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Marco" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" }
];

function formatNumber(value: number, unidade: "km" | "h") {
  const precision = unidade === "km" ? 1 : 2;
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: precision
  });
}

function formatValue(value: number, unidade: "km" | "h") {
  return `${formatNumber(value, unidade)} ${unidade}`;
}

function formatReading(value: number | null, unidade: "km" | "h") {
  if (value === null || value === undefined) return "-";
  return formatValue(value, unidade);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function statusLabel(status: MonthStatus) {
  const labels: Record<MonthStatus, string> = {
    OK: "Calculado",
    SEM_DADOS: "Sem dados",
    SEM_LEITURA_ANTERIOR: "Sem leitura anterior",
    INCONSISTENTE: "Possivel inconsistencia",
    SEM_TIPO_CONTROLE: "Sem tipo de controle"
  };
  return labels[status];
}

function statusClass(status: MonthStatus) {
  if (status === "INCONSISTENTE") return "is-inconsistent";
  if (status === "SEM_LEITURA_ANTERIOR" || status === "SEM_TIPO_CONTROLE") return "is-warning";
  if (status === "SEM_DADOS") return "is-empty";
  return "is-ok";
}

function typeClass(tipo: ControlType) {
  return tipo === "KM" ? "is-km" : "is-hour";
}

function buildYearOptions(currentYear: number) {
  return Array.from({ length: 6 }, (_, index) => currentYear - 3 + index);
}

function KpiCard(props: { label: string; value: string; helper: string; tone: "km" | "hour" | "neutral" }) {
  return (
    <article className={`monthly-km-kpi monthly-km-kpi-${props.tone}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.helper}</small>
    </article>
  );
}

function FleetEvolutionTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="km-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.dataKey === "km" ? "KM" : "Horas"}:{" "}
          {item.dataKey === "km" ? formatValue(Number(item.value ?? 0), "km") : formatValue(Number(item.value ?? 0), "h")}
        </span>
      ))}
    </div>
  );
}

export function KmHorimetroDashboard() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [equipamentoIds, setEquipamentoIds] = useState<string[]>([]);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedRow, setSelectedRow] = useState<MonthlyRow | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const yearOptions = useMemo(() => buildYearOptions(currentYear), [currentYear]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        year: String(year),
        startMonth: String(startMonth),
        endMonth: String(endMonth)
      });

      if (equipamentoIds.length) {
        params.set("equipamentoIds", equipamentoIds.join(","));
      }

      const response = await fetch(`/api/dashboard/km-horimetro?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar a dashboard mensal.");
        setData(null);
        return;
      }

      setData(payload);
    } catch {
      setError("Nao foi possivel carregar a dashboard mensal.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDashboard();
    }, 220);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, startMonth, endMonth, equipamentoIds.join(",")]);

  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])];
    return list.sort((a, b) => {
      const result = a.total - b.total;
      return sortDirection === "asc" ? result : -result;
    });
  }, [data, sortDirection]);

  const selectedMonthDetails = useMemo(() => {
    if (!selectedRow) return [];
    if (!selectedMonth) return selectedRow.months;
    return selectedRow.months.filter((month) => month.key === selectedMonth);
  }, [selectedMonth, selectedRow]);

  function openDetails(row: MonthlyRow, monthKey?: string) {
    setSelectedRow(row);
    setSelectedMonth(monthKey ?? null);
  }

  function clearFilters() {
    setYear(currentYear);
    setStartMonth(1);
    setEndMonth(currentMonth);
    setEquipamentoIds([]);
  }

  return (
    <main className="km-dashboard monthly-km-dashboard">
      <section className="monthly-km-hero surface section-card fade-up">
        <div>
          <span className="km-kicker">KM e horimetro mensal</span>
          <h1 className="page-title">Evolucao mensal por equipamento</h1>
          <p className="page-copy">
            Consulta simples das leituras ja registradas, separando caminhoes por KM e maquinas por horimetro.
          </p>
        </div>
        <span className="monthly-km-period">
          <strong>{data?.period.label ?? "Carregando periodo"}</strong>
          <small>{loading ? "Atualizando..." : `${data?.summary.totalEquipamentos ?? 0} equipamento(s)`}</small>
        </span>
      </section>

      <section className="monthly-km-filter-card surface section-card fade-up fade-up-delay-1">
        <label className="field">
          <span className="field-label">Ano</span>
          <select className="field-control" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Mes inicial</span>
          <select className="field-control" value={startMonth} onChange={(event) => setStartMonth(Number(event.target.value))}>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Mes final</span>
          <select className="field-control" value={endMonth} onChange={(event) => setEndMonth(Number(event.target.value))}>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field monthly-km-equipment-filter">
          <span className="field-label">Equipamento</span>
          <SearchableMultiSelect
            values={equipamentoIds}
            options={(data?.filters.equipamentos ?? []).map((item) => ({ value: item.id, label: item.label }))}
            placeholder="Todos os equipamentos"
            emptyLabel="Nenhum equipamento encontrado."
            onChange={setEquipamentoIds}
          />
        </label>
        <button type="button" className="button-secondary monthly-km-clear-button" onClick={clearFilters}>
          Limpar
        </button>
      </section>

      {error ? (
        <section className="surface section-card">
          <p className="message-inline message-inline-danger">{error}</p>
        </section>
      ) : null}

      <section className="monthly-km-kpi-grid fade-up fade-up-delay-2">
        <KpiCard
          label="KM Total"
          value={formatValue(data?.summary.totalKm ?? 0, "km")}
          helper="Soma dos equipamentos controlados por KM."
          tone="km"
        />
        <KpiCard
          label="Horas Totais"
          value={formatValue(data?.summary.totalHoras ?? 0, "h")}
          helper="Soma dos equipamentos controlados por horimetro."
          tone="hour"
        />
        <KpiCard
          label="Maquina Mais Horas"
          value={data?.summary.maquinaMaiorHoras?.equipamento ?? "-"}
          helper={
            data?.summary.maquinaMaiorHoras
              ? formatValue(data.summary.maquinaMaiorHoras.total, "h")
              : "Sem horas de maquina no periodo."
          }
          tone="hour"
        />
        <KpiCard
          label="Maior Variacao"
          value={data?.summary.equipamentoMaiorVariacao?.equipamento ?? "-"}
          helper={
            data?.summary.equipamentoMaiorVariacao
              ? formatValue(data.summary.equipamentoMaiorVariacao.total, data.summary.equipamentoMaiorVariacao.unidade)
              : "Sem dados no periodo."
          }
          tone={data?.summary.equipamentoMaiorVariacao?.unidade === "km" ? "km" : "hour"}
        />
      </section>

      <section className="monthly-km-table-card surface section-card fade-up fade-up-delay-3">
        <div className="monthly-km-section-header">
          <div>
            <span className="km-kicker">Tabela mensal principal</span>
            <h2 className="section-title">Quanto cada equipamento percorreu ou trabalhou por mes</h2>
          </div>
          <button
            type="button"
            className="monthly-km-sort-button"
            onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
          >
            Total {sortDirection === "desc" ? "maior primeiro" : "menor primeiro"}
          </button>
        </div>

        <div className="monthly-km-table-scroll">
          <table className="monthly-km-table">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Tipo</th>
                {(data?.months ?? []).map((month) => (
                  <th key={month.key}>{month.label}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.equipamentoId} className={row.total <= 0 ? "is-zero-row" : ""}>
                    <td>
                      <button type="button" className="monthly-km-equipment-button" onClick={() => openDetails(row)}>
                        <strong>{row.equipamento}</strong>
                        <small>{row.tipoRecurso}</small>
                      </button>
                    </td>
                    <td>
                      <span className={`monthly-km-type ${typeClass(row.tipoControle)}`}>{row.tipoLabel}</span>
                    </td>
                    {(data?.months ?? []).map((month) => {
                      const cell = row.months.find((item) => item.key === month.key);
                      if (!cell) {
                        return (
                          <td key={month.key} className="monthly-km-cell is-empty">
                            0
                          </td>
                        );
                      }

                      return (
                        <td key={cell.key} className={`monthly-km-cell ${statusClass(cell.status)}`}>
                          <button type="button" onClick={() => openDetails(row, cell.key)}>
                            <strong>{formatValue(cell.value, row.unidade)}</strong>
                            {cell.status !== "OK" && cell.status !== "SEM_DADOS" ? <small>{statusLabel(cell.status)}</small> : null}
                          </button>
                        </td>
                      );
                    })}
                    <td className={`monthly-km-total ${typeClass(row.tipoControle)}`}>
                      <strong>{formatValue(row.total, row.unidade)}</strong>
                      {row.inconsistencias > 0 ? <small>{row.inconsistencias} inconsistencia(s)</small> : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={(data?.months.length ?? 0) + 3} className="monthly-km-empty-state">
                    {loading ? "Carregando dados..." : "Sem dados no periodo."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="monthly-km-legend">
          <span><i className="is-km" /> KM</span>
          <span><i className="is-hour" /> Horimetro</span>
          <span><i className="is-empty" /> Zero ou sem dados</span>
          <span><i className="is-inconsistent" /> Possivel inconsistencia</span>
        </div>
      </section>

      <section className="monthly-km-chart-card surface section-card fade-up fade-up-delay-4">
        <div className="monthly-km-section-header">
          <div>
            <span className="km-kicker">Grafico simples</span>
            <h2 className="section-title">Evolucao mensal da frota</h2>
          </div>
          <span className="monthly-km-chart-note">Totais gerais por mes, sem converter unidades.</span>
        </div>
        {(data?.chart.monthlyTotals.length ?? 0) > 0 ? (
          <ExpandableChart title="Evolucao mensal da frota" height={300}>
            {({ height }) => (
              <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data?.chart.monthlyTotals ?? []} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <YAxis yAxisId="km" orientation="left" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <YAxis yAxisId="horas" orientation="right" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <Tooltip content={<FleetEvolutionTooltip />} />
                  <Bar yAxisId="km" dataKey="km" name="KM" radius={[10, 10, 0, 0]} maxBarSize={32}>
                    {(data?.chart.monthlyTotals ?? []).map((item) => (
                      <Cell key={`km-${item.key}`} fill={item.km > 0 ? "#38bdf8" : "#64748b"} />
                    ))}
                  </Bar>
                  <Bar yAxisId="horas" dataKey="horas" name="Horas" radius={[10, 10, 0, 0]} maxBarSize={32}>
                    {(data?.chart.monthlyTotals ?? []).map((item) => (
                      <Cell key={`h-${item.key}`} fill={item.horas > 0 ? "#22c55e" : "#64748b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ExpandableChart>
        ) : (
          <p className="section-copy">Sem dados no periodo.</p>
        )}
      </section>

      {selectedRow ? (
        <div className="monthly-km-drawer-backdrop" role="presentation" onClick={() => setSelectedRow(null)}>
          <aside
            className="monthly-km-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhe mensal do equipamento"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="monthly-km-drawer-close" onClick={() => setSelectedRow(null)}>
              Fechar
            </button>
            <span className={`monthly-km-type ${typeClass(selectedRow.tipoControle)}`}>{selectedRow.tipoLabel}</span>
            <h2>{selectedRow.equipamento}</h2>
            <p>
              Total no periodo: <strong>{formatValue(selectedRow.total, selectedRow.unidade)}</strong>
            </p>

            <div className="monthly-km-detail-list">
              {selectedMonthDetails.map((month) => (
                <article key={month.key} className={`monthly-km-detail-card ${statusClass(month.status)}`}>
                  <header>
                    <div>
                      <span>{month.label}</span>
                      <strong>{formatValue(month.value, selectedRow.unidade)}</strong>
                    </div>
                    <b>{statusLabel(month.status)}</b>
                  </header>
                  <dl>
                    <div>
                      <dt>Leitura inicial</dt>
                      <dd>{formatReading(month.initialReading, selectedRow.unidade)}</dd>
                    </div>
                    <div>
                      <dt>Leitura final</dt>
                      <dd>{formatReading(month.finalReading, selectedRow.unidade)}</dd>
                    </div>
                    <div>
                      <dt>Primeira leitura do mes</dt>
                      <dd>{formatDate(month.firstReadingDate)}</dd>
                    </div>
                    <div>
                      <dt>Ultima leitura do mes</dt>
                      <dd>{formatDate(month.lastReadingDate)}</dd>
                    </div>
                  </dl>

                  {month.clientes.length || month.obras.length ? (
                    <div className="monthly-km-chip-grid">
                      {month.clientes.map((cliente) => (
                        <span key={cliente}>Cliente: {cliente}</span>
                      ))}
                      {month.obras.map((obra) => (
                        <span key={obra}>Obra: {obra}</span>
                      ))}
                    </div>
                  ) : null}

                  {month.readings.length ? (
                    <div className="monthly-km-reading-list">
                      {month.readings.map((reading) => (
                        <div key={reading.data}>
                          <span>{formatDate(reading.data)}</span>
                          <strong>{formatReading(reading.leitura, selectedRow.unidade)}</strong>
                          <small>{reading.ficha ? `Ficha ${reading.ficha}` : reading.origem}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <small>Nenhuma leitura registrada dentro deste mes.</small>
                  )}
                </article>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
