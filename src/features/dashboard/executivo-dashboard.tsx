"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { SearchableMultiSelect } from "@/components/form/searchable-multi-select";
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
import { formatCurrency } from "@/lib/utils/formatters";

type PeriodPreset = "current_month" | "previous_month" | "last_30_days" | "custom";
type ExecutiveScope = "fixos" | "complementares";

type DashboardPayload = {
  period: {
    preset: PeriodPreset;
    start: string;
    end: string;
    label: string;
    monthKey: string;
  };
  filters: {
    scope: ExecutiveScope;
    equipmentIds: string[];
    equipments: Array<{
      id: string;
      label: string;
      type: string;
    }>;
  };
  summary: {
    totalEquipamentos: number;
    totalHorasCalendario: number;
    totalHorasDisponiveis: number;
    totalHorasOperadas: number;
    utilizacaoMedia: number;
    disponibilidadeMecanicaMedia: number;
    horasOciosasControlaveis: number;
    horasTecnicas: number;
    horasAdministrativas: number;
    horasExternas: number;
    impactoFinanceiroEstimado: number;
    valorMedidoRelaciondo: number;
    frentesAtivas: number;
  };
  utilization: {
    summary: {
      excellent: number;
      good: number;
      idle: number;
    };
    ranking: Array<{
      equipamentoId: string;
      descricao: string;
      placaOuTag: string;
      tipoRecurso: string;
      operatedHours: number;
      availableHours: number;
      calendarHours: number;
      controllableIdleHours: number;
      utilizationPercent: number;
      band: "EXCELENTE" | "BOM" | "OCIOSO";
    }>;
  };
  mechanical: {
    summary: {
      excellent: number;
      warning: number;
      critical: number;
      preventiveHours: number;
      correctiveHours: number;
      externalHours: number;
    };
    ranking: Array<{
      equipamentoId: string;
      descricao: string;
      placaOuTag: string;
      tipoRecurso: string;
      calendarHours: number;
      availableHours: number;
      technicalHours: number;
      preventiveHours: number;
      correctiveHours: number;
      externalHours: number;
      mechanicalPercent: number;
      band: "EXCELENTE" | "ATENCAO" | "CRITICO";
    }>;
  };
  losses: {
    totalHours: number;
    buckets: Array<{
      key: string;
      label: string;
      group: "CONTROLAVEL" | "TECNICO" | "ADMINISTRATIVO" | "EXTERNO" | "PRODUTIVO";
      hours: number;
      percent: number;
    }>;
  };
  financial: {
    totalEstimatedLoss: number;
    ranking: Array<{
      equipamentoId: string;
      descricao: string;
      placaOuTag: string;
      tipoRecurso: string;
      controllableIdleHours: number;
      technicalHours: number;
      idleHours: number;
      equivalentLostDays: number;
      dailyReferenceValue: number;
      estimatedLoss: number;
    }>;
  };
  worksites: Array<{
    obraId: string;
    label: string;
    productiveHours: number;
    measuredValue: number;
    equipmentsCount: number;
  }>;
  failures: Array<{
    equipamentoId: string;
    descricao: string;
    placaOuTag: string;
    tipoRecurso: string;
    count: number;
    totalCost: number;
    lastExecution: string;
    types: string[];
  }>;
  heatmap: {
    days: Array<{
      date: string;
      label: string;
      weekLabel: string;
      weekend: boolean;
    }>;
    rows: Array<{
      equipamentoId: string;
      label: string;
      tipoRecurso: string;
      cells: Array<{
        date: string;
        label: string;
        status: string;
        tone: "produtivo" | "ocioso" | "manutencao" | "admin" | "externo" | "folga";
      }>;
    }>;
  };
  insights: string[];
};

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "current_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "last_30_days", label: "Ultimos 30 dias" },
  { value: "custom", label: "Personalizado" }
];

const utilizationBandPalette: Record<
  DashboardPayload["utilization"]["ranking"][number]["band"],
  string
> = {
  EXCELENTE: "#155b52",
  BOM: "#2f6db3",
  OCIOSO: "#a36e00"
};
const mechanicalBandPalette: Record<
  DashboardPayload["mechanical"]["ranking"][number]["band"],
  string
> = {
  EXCELENTE: "#155b52",
  ATENCAO: "#a36e00",
  CRITICO: "#b14c32"
};
const lossPalette: Record<string, string> = {
  CONTROLAVEL: "#f0b544",
  TECNICO: "#ef4444",
  ADMINISTRATIVO: "#a78bfa",
  EXTERNO: "#38bdf8",
  PRODUTIVO: "#36d399"
};

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function formatHours(value: number) {
  return `${value.toFixed(1).replace(".", ",")} h`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function DashboardSkeleton() {
  return (
    <main className="executive-dashboard">
      <section className="executive-hero executive-skeleton-block" />
      <section className="executive-kpi-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="executive-card executive-skeleton-block" />
        ))}
      </section>
      {Array.from({ length: 4 }).map((_, index) => (
        <section key={index} className="executive-grid executive-grid-half">
          <article className="executive-panel executive-skeleton-block" />
          <article className="executive-panel executive-skeleton-block" />
        </section>
      ))}
    </main>
  );
}

function UtilizationTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{
    payload: DashboardPayload["utilization"]["ranking"][number];
  }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="executive-tooltip">
      <strong>{item.placaOuTag}</strong>
      <span>{item.descricao}</span>
      <span>Uso real: {formatPercent(item.utilizationPercent)}</span>
      <span>Horas operadas: {formatHours(item.operatedHours)}</span>
      <span>Horas disponiveis: {formatHours(item.availableHours)}</span>
      <span>Ociosidade controlavel: {formatHours(item.controllableIdleHours)}</span>
    </div>
  );
}

function LossTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{
    payload: DashboardPayload["losses"]["buckets"][number];
  }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="executive-tooltip">
      <strong>{item.label}</strong>
      <span>{formatHours(item.hours)}</span>
      <span>{formatPercent(item.percent)}</span>
      <span>{item.group}</span>
    </div>
  );
}

function FinancialTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{
    payload: DashboardPayload["financial"]["ranking"][number];
  }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="executive-tooltip">
      <strong>{item.placaOuTag}</strong>
      <span>{item.descricao}</span>
      <span>Horas improdutivas: {formatHours(item.idleHours)}</span>
      <span>
        Tecnica {formatHours(item.technicalHours)} | Controlavel {formatHours(item.controllableIdleHours)}
      </span>
      <span>Dias equivalentes: {item.equivalentLostDays.toFixed(2).replace(".", ",")}</span>
      <span>Valor/dia estimado: {formatCurrency(item.dailyReferenceValue)}</span>
      <span>Impacto: {formatCurrency(item.estimatedLoss)}</span>
    </div>
  );
}

export function ExecutivoDashboard(props: { scope?: ExecutiveScope }) {
  const { scope = "fixos" } = props;
  const [preset, setPreset] = useState<PeriodPreset>("current_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(
    nextPreset: PeriodPreset,
    start = customStart,
    end = customEnd,
    nextEquipmentIds = equipmentIds
  ) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ period: nextPreset, scope });

      if (nextPreset === "custom") {
        if (start) params.set("start", start);
        if (end) params.set("end", end);
      }

      if (nextEquipmentIds.length > 0) {
        params.set("equipmentIds", nextEquipmentIds.join(","));
      }

      const response = await fetch(`/api/dashboard/executivo?${params.toString()}`, {
        cache: "no-store"
      });

      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar o dashboard executivo.");
        setData(null);
        return;
      }

      setData(payload);
      setEquipmentIds(payload.filters.equipmentIds ?? []);
    } catch {
      setError("Nao foi possivel carregar o dashboard executivo.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard("current_month", "", "", []);
  }, [scope]);

  const utilizationTop = useMemo(() => data?.utilization.ranking ?? [], [data]);
  const mechanicalTop = useMemo(() => data?.mechanical.ranking ?? [], [data]);
  const lossTop = useMemo(() => data?.losses.buckets ?? [], [data]);
  const financialTop = useMemo(() => data?.financial.ranking ?? [], [data]);
  const scopeTitle =
    scope === "complementares"
      ? "Inteligencia operacional dos complementares"
      : "Inteligencia operacional da frota";
  const scopeCopy =
    scope === "complementares"
      ? "Leitura executiva isolada dos equipamentos complementares para acompanhar utilizacao, perdas e impacto no periodo."
      : "Camada analitica independente para enxergar utilizacao real, disponibilidade mecanica, perdas operacionais, impacto financeiro e consumo de recursos no periodo.";
  const scopeKicker =
    scope === "complementares" ? "Dashboard complementar" : "Dashboard executivo";
  const utilizationChartHeight = Math.max(360, utilizationTop.length * 42);
  const mechanicalChartHeight = Math.max(360, mechanicalTop.length * 42);
  const lossChartHeight = Math.max(320, lossTop.length * 42);
  const financialChartHeight = Math.max(320, financialTop.length * 42);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="executive-dashboard">
      <section className="executive-hero fade-up">
        <div className="executive-hero-copy">
          <span className="executive-kicker">{scopeKicker}</span>
          <h1 className="executive-title">{scopeTitle}</h1>
          <p className="executive-copy">{scopeCopy}</p>
        </div>

        <div className="executive-hero-controls">
          <label className="field executive-filter-field">
            <span className="field-label">Periodo</span>
            <select
              className="field-control"
              value={preset}
              onChange={(event) => {
                const nextPreset = event.target.value as PeriodPreset;
                setPreset(nextPreset);
                if (nextPreset !== "custom") {
                  void loadDashboard(nextPreset, customStart, customEnd, equipmentIds);
                }
              }}
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {preset === "custom" ? (
            <div className="executive-custom-range">
              <label className="field executive-filter-field">
                <span className="field-label">Data inicial</span>
                <input
                  className="field-control"
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </label>
              <label className="field executive-filter-field">
                <span className="field-label">Data final</span>
                <input
                  className="field-control"
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="button-primary"
                onClick={() => void loadDashboard("custom", customStart, customEnd, equipmentIds)}
              >
                Aplicar
              </button>
            </div>
          ) : null}

          <label className="field executive-filter-field">
            <span className="field-label">Equipamentos exibidos</span>
            <SearchableMultiSelect
              values={equipmentIds}
              options={(data?.filters.equipments ?? []).map((item) => ({
                value: item.id,
                label: `${item.label} [${item.type}]`
              }))}
              placeholder="Buscar equipamentos"
              onChange={(values) => {
                setEquipmentIds(values);
                if (preset === "custom" && (!customStart || !customEnd)) {
                  return;
                }
                void loadDashboard(preset, customStart, customEnd, values);
              }}
            />
          </label>

          <div className="executive-period-chip">
            <strong>Janela</strong>
            <span>{data?.period.label ?? "Periodo atual"}</span>
          </div>
        </div>
      </section>

      {error ? (
        <section className="surface section-card">
          <p className="message-inline message-inline-danger">{error}</p>
        </section>
      ) : null}

      <section className="executive-kpi-grid fade-up fade-up-delay-1">
        <article className="executive-card">
          <span className="executive-card-label">Utilizacao media</span>
          <strong className="executive-card-value">
            {formatPercent(data?.summary.utilizacaoMedia ?? 0)}
          </strong>
          <p className="executive-card-copy">
            {formatHours(data?.summary.totalHorasOperadas ?? 0)} operadas sobre{" "}
            {formatHours(data?.summary.totalHorasDisponiveis ?? 0)} disponiveis.
          </p>
        </article>
        <article className="executive-card">
          <span className="executive-card-label">Disponibilidade mecanica</span>
          <strong className="executive-card-value">
            {formatPercent(data?.summary.disponibilidadeMecanicaMedia ?? 0)}
          </strong>
          <p className="executive-card-copy">
            {formatHours(data?.summary.horasTecnicas ?? 0)} perdidas por manutencao.
          </p>
        </article>
        <article className="executive-card">
          <span className="executive-card-label">Ociosidade controlavel</span>
          <strong className="executive-card-value">
            {formatHours(data?.summary.horasOciosasControlaveis ?? 0)}
          </strong>
          <p className="executive-card-copy">Disponivel, sem frente ou aguardando operador.</p>
        </article>
        <article className="executive-card">
          <span className="executive-card-label">Impacto estimado</span>
          <strong className="executive-card-value">
            {formatCurrency(data?.summary.impactoFinanceiroEstimado ?? 0)}
          </strong>
          <p className="executive-card-copy">Baseado no valor/hora estimado por equipamento.</p>
        </article>
        <article className="executive-card">
          <span className="executive-card-label">Frentes ativas</span>
          <strong className="executive-card-value">{data?.summary.frentesAtivas ?? 0}</strong>
          <p className="executive-card-copy">Obras com horas equivalentes no periodo.</p>
        </article>
        <article className="executive-card">
          <span className="executive-card-label">Valor medido relacionado</span>
          <strong className="executive-card-value">
            {formatCurrency(data?.summary.valorMedidoRelaciondo ?? 0)}
          </strong>
          <p className="executive-card-copy">Receita medida associada aos equipamentos.</p>
        </article>
      </section>

      <section className="executive-insights fade-up fade-up-delay-2">
        {data?.insights.map((item, index) => (
          <article key={`${index}-${item}`} className="executive-insight-card">
            <span className="executive-insight-index">0{index + 1}</span>
            <p>{item}</p>
          </article>
        ))}
      </section>

      <section className="executive-grid executive-grid-half fade-up fade-up-delay-2">
        <article className="executive-panel">
          <div className="executive-panel-header">
            <div>
              <span className="executive-section-kicker">KPI</span>
              <h2>Utilizacao real da frota</h2>
            </div>
            <div className="executive-panel-bands">
              <span className="badge badge-success">{data?.utilization.summary.excellent ?? 0} excelente</span>
              <span className="badge badge-info">{data?.utilization.summary.good ?? 0} bom</span>
              <span className="badge badge-warn">{data?.utilization.summary.idle ?? 0} ocioso</span>
            </div>
          </div>
          <div className="executive-chart-shell" style={{ height: `${utilizationChartHeight}px` }}>
            <ResponsiveContainer width="100%" height={utilizationChartHeight}>
              <BarChart
                data={utilizationTop}
                layout="vertical"
                margin={{ top: 12, right: 16, left: 4, bottom: 12 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "#91a3b4", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="placaOuTag"
                  width={86}
                  tick={{ fill: "#f5efe5", fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<UtilizationTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="utilizationPercent" radius={[0, 12, 12, 0]} barSize={18}>
                  {utilizationTop.map((item) => (
                    <Cell
                      key={item.equipamentoId}
                      fill={utilizationBandPalette[item.band] ?? "#155b52"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="executive-panel">
          <div className="executive-panel-header">
            <div>
              <span className="executive-section-kicker">KPI</span>
              <h2>Disponibilidade mecanica</h2>
            </div>
            <div className="executive-panel-bands">
              <span className="badge badge-success">{data?.mechanical.summary.excellent ?? 0} excelente</span>
              <span className="badge badge-warn">{data?.mechanical.summary.warning ?? 0} atencao</span>
              <span className="badge badge-danger">{data?.mechanical.summary.critical ?? 0} critico</span>
            </div>
          </div>
          <div className="executive-chart-shell" style={{ height: `${mechanicalChartHeight}px` }}>
            <ResponsiveContainer width="100%" height={mechanicalChartHeight}>
              <BarChart
                data={mechanicalTop}
                layout="vertical"
                margin={{ top: 12, right: 16, left: 4, bottom: 12 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "#91a3b4", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="placaOuTag"
                  width={86}
                  tick={{ fill: "#f5efe5", fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as DashboardPayload["mechanical"]["ranking"][number];
                    return (
                      <div className="executive-tooltip">
                        <strong>{item.placaOuTag}</strong>
                        <span>{item.descricao}</span>
                        <span>Disponibilidade: {formatPercent(item.mechanicalPercent)}</span>
                        <span>Preventiva: {formatHours(item.preventiveHours)}</span>
                        <span>Corretiva: {formatHours(item.correctiveHours)}</span>
                        <span>Oficina externa: {formatHours(item.externalHours)}</span>
                      </div>
                    );
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="mechanicalPercent" radius={[0, 12, 12, 0]} barSize={18}>
                  {mechanicalTop.map((item) => (
                    <Cell
                      key={item.equipamentoId}
                      fill={mechanicalBandPalette[item.band] ?? "#155b52"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="executive-inline-stats">
            <span>Preventiva: {formatHours(data?.mechanical.summary.preventiveHours ?? 0)}</span>
            <span>Corretiva: {formatHours(data?.mechanical.summary.correctiveHours ?? 0)}</span>
            <span>Externa: {formatHours(data?.mechanical.summary.externalHours ?? 0)}</span>
          </div>
        </article>
      </section>

      <section className="executive-grid executive-grid-half fade-up fade-up-delay-3">
        <article className="executive-panel">
          <div className="executive-panel-header">
            <div>
              <span className="executive-section-kicker">Perdas</span>
              <h2>Pareto operacional</h2>
            </div>
            <strong className="executive-panel-highlight">{formatHours(data?.losses.totalHours ?? 0)}</strong>
          </div>
          <div className="executive-chart-shell" style={{ height: `${lossChartHeight}px` }}>
            <ResponsiveContainer width="100%" height={lossChartHeight}>
              <BarChart
                data={lossTop}
                layout="vertical"
                margin={{ top: 12, right: 16, left: 4, bottom: 12 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#91a3b4", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={150}
                  tick={{ fill: "#f5efe5", fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<LossTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="hours" radius={[0, 12, 12, 0]} barSize={18}>
                  {lossTop.map((item) => (
                    <Cell
                      key={item.key}
                      fill={lossPalette[item.group] ?? "#f0b544"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="executive-panel">
          <div className="executive-panel-header">
            <div>
              <span className="executive-section-kicker">Financeiro</span>
              <h2>Impacto da indisponibilidade</h2>
            </div>
            <strong className="executive-panel-highlight">
              {formatCurrency(data?.financial.totalEstimatedLoss ?? 0)}
            </strong>
          </div>
          <div className="executive-chart-shell" style={{ height: `${financialChartHeight}px` }}>
            <ResponsiveContainer width="100%" height={financialChartHeight}>
              <BarChart
                data={financialTop}
                layout="vertical"
                margin={{ top: 12, right: 16, left: 4, bottom: 12 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                  tick={{ fill: "#91a3b4", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="placaOuTag"
                  width={86}
                  tick={{ fill: "#f5efe5", fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<FinancialTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="estimatedLoss" radius={[0, 12, 12, 0]} barSize={18} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="executive-grid executive-grid-half fade-up fade-up-delay-3">
        <article className="executive-panel">
          <div className="executive-panel-header">
            <div>
              <span className="executive-section-kicker">Consumo</span>
              <h2>Obras com maior hora equivalente</h2>
            </div>
          </div>
          {(data?.worksites?.length ?? 0) > 0 ? (
            <div className="executive-list">
              {(data?.worksites ?? []).map((item) => (
                <article key={item.obraId} className="executive-list-item">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.equipmentsCount} equipamento(s)</span>
                  </div>
                  <div className="executive-list-metrics">
                    <strong>{formatHours(item.productiveHours)} equivalentes</strong>
                    <span>{formatCurrency(item.measuredValue)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="executive-empty-state">
              <strong>Sem consumo no periodo</strong>
              <p>Nao houve horas equivalentes por obra para os equipamentos filtrados.</p>
            </div>
          )}
        </article>

        <article className="executive-panel">
          <div className="executive-panel-header">
            <div>
              <span className="executive-section-kicker">Falhas</span>
              <h2>Recorrencia mecanica</h2>
            </div>
          </div>
          {(data?.failures?.length ?? 0) === 0 ? (
            <div className="executive-empty-state">
              <strong>Sem falhas no periodo</strong>
              <p>Nao houve manutencao executada para os equipamentos filtrados.</p>
            </div>
          ) : null}
          <div className="executive-list" hidden={(data?.failures?.length ?? 0) === 0}>
            {(data?.failures ?? []).map((item) => (
              <article key={item.equipamentoId} className="executive-list-item">
                <div>
                  <strong>{item.placaOuTag}</strong>
                  <span>{item.types.join(" • ") || item.descricao}</span>
                </div>
                <div className="executive-list-metrics">
                  <strong>{item.count} falha(s)</strong>
                  <span>{formatCurrency(item.totalCost)} • {formatDate(item.lastExecution)}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="executive-panel fade-up fade-up-delay-4">
        <div className="executive-panel-header">
          <div>
            <span className="executive-section-kicker">Heatmap</span>
            <h2>Leitura instantanea da operacao</h2>
          </div>
        </div>

        {(data?.heatmap.rows?.length ?? 0) === 0 ? (
          <div className="executive-empty-state">
            <strong>Sem leitura operacional</strong>
            <p>O heatmap aparece quando existem programacoes ou medicoes para os equipamentos filtrados.</p>
          </div>
        ) : null}
        <div
          className="executive-heatmap"
          hidden={(data?.heatmap.rows?.length ?? 0) === 0}
          style={
            {
              ["--executive-heatmap-cols" as string]: data?.heatmap.days.length ?? 0
            } as CSSProperties
          }
        >
          <div className="executive-heatmap-head">
            <div className="executive-heatmap-corner">Equipamento</div>
            {data?.heatmap.days.map((day) => (
              <div key={day.date} className={`executive-heatmap-day ${day.weekend ? "is-weekend" : ""}`}>
                <span>{day.weekLabel}</span>
                <strong>{day.label}</strong>
              </div>
            ))}
          </div>

          {(data?.heatmap.rows ?? []).map((row) => (
            <div key={row.equipamentoId} className="executive-heatmap-row">
              <div className="executive-heatmap-label">
                <strong>{row.label}</strong>
                <span>{row.tipoRecurso}</span>
              </div>
              {row.cells.map((cell) => (
                <div
                  key={`${row.equipamentoId}-${cell.date}`}
                  className={`executive-heatmap-cell is-${cell.tone}`}
                  title={`${row.label} • ${cell.label} • ${cell.status}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="executive-heatmap-legend">
          <span><i className="executive-legend-dot is-produtivo" /> Produzindo</span>
          <span><i className="executive-legend-dot is-ocioso" /> Ocioso</span>
          <span><i className="executive-legend-dot is-manutencao" /> Manutencao</span>
          <span><i className="executive-legend-dot is-admin" /> Administrativo</span>
          <span><i className="executive-legend-dot is-externo" /> Externo</span>
          <span><i className="executive-legend-dot is-folga" /> Folga</span>
        </div>
      </section>
    </main>
  );
}
