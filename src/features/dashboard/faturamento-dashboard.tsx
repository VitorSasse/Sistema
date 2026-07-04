"use client";

import { useEffect, useMemo, useState } from "react";
import { ExpandableChart } from "@/components/dashboard/expandable-chart";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrency } from "@/lib/utils/formatters";

type PeriodPreset = "current_month" | "previous_month" | "last_3_months" | "custom";

type DashboardPayload = {
  period: {
    preset: PeriodPreset;
    start: string;
    end: string;
    label: string;
  };
  summary: {
    totalFaturado: number;
    totalAFaturar: number;
    totalGeral: number;
    totalMedicoes: number;
    totalMedicoesConcluidas: number;
    totalMedicoesAFaturar: number;
    totalClientes: number;
    ticketMedioPorCliente: number;
  };
  ranking: Array<{
    rank: number;
    clienteId: string;
    clienteCodigo: string;
    clienteNome: string;
    totalFaturado: number;
    totalAFaturar: number;
    totalGeral: number;
    totalMedicoes: number;
    sharePercent: number;
  }>;
};

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "current_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "last_3_months", label: "Ultimos 3 meses" },
  { value: "custom", label: "Personalizado" }
];

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function shortClientName(name: string) {
  return name.length > 18 ? `${name.slice(0, 18)}...` : name;
}

function CustomTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: DashboardPayload["ranking"][number] }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="billing-tooltip">
      <strong>{item.clienteNome}</strong>
      <span>{item.clienteCodigo}</span>
      <span>Faturado: {formatCurrency(item.totalFaturado)}</span>
      <span>A faturar: {formatCurrency(item.totalAFaturar)}</span>
      <span>Total: {formatCurrency(item.totalGeral)}</span>
      <span>Participacao: {formatPercent(item.sharePercent)}</span>
      <span>Medicoes: {item.totalMedicoes}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="billing-dashboard">
      <section className="billing-hero surface section-card">
        <div className="billing-header-copy">
          <div className="billing-skeleton billing-skeleton-line billing-skeleton-title" />
          <div className="billing-skeleton billing-skeleton-line billing-skeleton-copy" />
        </div>
        <div className="billing-header-controls">
          <div className="billing-skeleton billing-skeleton-pill" />
        </div>
      </section>

      <section className="billing-summary-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="billing-summary-card">
            <div className="billing-skeleton billing-skeleton-line billing-skeleton-kicker" />
            <div className="billing-skeleton billing-skeleton-line billing-skeleton-value" />
            <div className="billing-skeleton billing-skeleton-line billing-skeleton-copy" />
          </article>
        ))}
      </section>

      <section className="billing-grid">
        <article className="billing-chart-card">
          <div className="billing-skeleton billing-skeleton-chart" />
        </article>
        <article className="billing-ranking-card">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="billing-skeleton billing-skeleton-row" />
          ))}
        </article>
      </section>
    </div>
  );
}

export function FaturamentoDashboard() {
  const [preset, setPreset] = useState<PeriodPreset>("current_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(nextPreset: PeriodPreset, start = customStart, end = customEnd) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ period: nextPreset });

      if (nextPreset === "custom") {
        if (start) params.set("start", start);
        if (end) params.set("end", end);
      }

      const response = await fetch(`/api/dashboard/faturamento?${params.toString()}`, {
        cache: "no-store"
      });

      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar o dashboard de faturamento.");
        setData(null);
        return;
      }

      setData(payload);
    } catch {
      setError("Nao foi possivel carregar o dashboard de faturamento.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard("current_month", "", "");
  }, []);

  const chartData = useMemo(
    () =>
      (data?.ranking ?? []).map((item) => ({
        ...item,
        label: shortClientName(item.clienteNome)
      })),
    [data]
  );

  const topFive = useMemo(() => (data?.ranking ?? []).slice(0, 5), [data]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="billing-dashboard">
      <section className="billing-hero surface section-card fade-up">
        <div className="billing-header-copy">
          <span className="billing-kicker">Dashboard de faturamento</span>
          <h1 className="page-title">Receita por cliente com foco mensal</h1>
          <p className="page-copy">
            Painel financeiro por competencia do ultimo lancamento da medicao,
            separando o que ja foi concluido do que ainda segue como valor a faturar.
          </p>
        </div>

        <div className="billing-header-controls">
          <label className="field billing-filter-field">
            <span className="field-label">Periodo</span>
            <select
              className="field-control"
              value={preset}
              onChange={(event) => {
                const nextPreset = event.target.value as PeriodPreset;
                setPreset(nextPreset);
                if (nextPreset !== "custom") {
                  void loadDashboard(nextPreset, customStart, customEnd);
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
            <div className="billing-custom-range">
              <label className="field billing-filter-field">
                <span className="field-label">Data inicial</span>
                <input
                  className="field-control"
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </label>
              <label className="field billing-filter-field">
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
                onClick={() => void loadDashboard("custom", customStart, customEnd)}
              >
                Aplicar periodo
              </button>
            </div>
          ) : null}

          <div className="billing-period-badge">
            <strong>Janela analisada</strong>
            <span>{data?.period.label ?? "Periodo atual"}</span>
          </div>
        </div>
      </section>

      {error ? (
        <section className="surface section-card">
          <p className="message-inline message-inline-danger">{error}</p>
        </section>
      ) : null}

      <section className="billing-summary-grid fade-up fade-up-delay-1">
        <article className="billing-summary-card">
          <span className="billing-summary-label">Faturado no periodo</span>
          <strong className="billing-summary-main">
            {formatCurrency(data?.summary.totalFaturado ?? 0)}
          </strong>
          <p className="billing-summary-meta">
            {data?.summary.totalMedicoesConcluidas ?? 0} medicao(oes) concluidas.
          </p>
        </article>
        <article className="billing-summary-card is-count">
          <span className="billing-summary-label">Medicoes do periodo</span>
          <strong className="billing-summary-main">{data?.summary.totalMedicoes ?? 0}</strong>
          <p className="billing-summary-meta">Inclui concluidas e valores ainda a faturar.</p>
        </article>
        <article className="billing-summary-card">
          <span className="billing-summary-label">Ticket medio por cliente</span>
          <strong className="billing-summary-main">
            {formatCurrency(data?.summary.ticketMedioPorCliente ?? 0)}
          </strong>
          <p className="billing-summary-meta">
            Baseado em {data?.summary.totalClientes ?? 0} cliente(s) com medicao no periodo.
          </p>
        </article>
      </section>

      <section className="billing-grid fade-up fade-up-delay-2">
        <article className="billing-chart-card surface section-card">
          {chartData.length === 0 ? (
            <div className="billing-empty-state">
              <strong>Nenhuma medicao encontrada</strong>
              <p>
                Nao ha medicoes vinculadas ao periodo selecionado. Ajuste a janela para ver o grafico.
              </p>
            </div>
          ) : (
            <div className="billing-chart-panel">
              <div className="billing-chart-summary">
                <article className="billing-chart-summary-card is-success">
                  <span>Faturado no periodo</span>
                  <strong>{formatCurrency(data?.summary.totalFaturado ?? 0)}</strong>
                  <small>{data?.summary.totalMedicoesConcluidas ?? 0} medicao(oes)</small>
                </article>
                <article className="billing-chart-summary-card is-warn">
                  <span>Valor a faturar</span>
                  <strong>{formatCurrency(data?.summary.totalAFaturar ?? 0)}</strong>
                  <small>{data?.summary.totalMedicoesAFaturar ?? 0} medicao(oes)</small>
                </article>
                <article className="billing-chart-summary-card is-total">
                  <span>Faturamento total</span>
                  <strong>{formatCurrency(data?.summary.totalGeral ?? 0)}</strong>
                  <small>Faturado somado ao valor ainda a faturar.</small>
                </article>
              </div>

              <div className="billing-chart-legend">
                <span className="billing-chart-legend-item">
                  <i className="billing-chart-dot is-faturado" />
                  Faturado
                </span>
                <span className="billing-chart-legend-item">
                  <i className="billing-chart-dot is-pendente" />
                  A faturar
                </span>
                <span className="billing-chart-legend-item">
                  <i className="billing-chart-dot is-share" />
                  Participacao
                </span>
              </div>

              <div className="billing-chart-shell">
                <ExpandableChart title="Faturamento por cliente" height={420}>
                  {({ height }) => (
                    <ResponsiveContainer width="100%" height={height}>
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 18, right: 24, left: 8, bottom: 32 }}
                      >
                        <defs>
                          <linearGradient id="billingBarFaturado" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--dashboard-chart-faturado-start)" />
                            <stop offset="100%" stopColor="var(--dashboard-chart-faturado-end)" />
                          </linearGradient>
                          <linearGradient id="billingBarPendente" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--dashboard-chart-pendente-start)" />
                            <stop offset="100%" stopColor="var(--dashboard-chart-pendente-end)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-24}
                          textAnchor="end"
                          height={72}
                          tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                        />
                        <YAxis
                          yAxisId="currency"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                          tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                          width={110}
                        />
                        <YAxis
                          yAxisId="share"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                          tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                          width={56}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "var(--dashboard-chart-cursor)" }}
                        />
                        <Bar
                          yAxisId="currency"
                          dataKey="totalFaturado"
                          name="totalFaturado"
                          stackId="billing"
                          radius={[0, 0, 0, 0]}
                          fill="url(#billingBarFaturado)"
                          maxBarSize={56}
                        />
                        <Bar
                          yAxisId="currency"
                          dataKey="totalAFaturar"
                          name="totalAFaturar"
                          stackId="billing"
                          radius={[12, 12, 0, 0]}
                          fill="url(#billingBarPendente)"
                          maxBarSize={56}
                        />
                        <Line
                          yAxisId="share"
                          type="monotone"
                          dataKey="sharePercent"
                          name="sharePercent"
                          stroke="var(--dashboard-chart-line-share)"
                          strokeWidth={3}
                          strokeDasharray="0"
                          dot={{ r: 4, strokeWidth: 0, fill: "var(--dashboard-chart-line-share)" }}
                          activeDot={{ r: 6, fill: "var(--dashboard-chart-line-share-active)" }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </ExpandableChart>
              </div>
            </div>
          )}
        </article>

        <aside className="billing-ranking-card surface section-card">
          <div className="billing-ranking-header">
            <div>
              <span className="billing-kicker">Top clientes</span>
              <h2 className="section-title">Maiores carteiras do periodo</h2>
            </div>
            <span className="badge badge-info">{data?.summary.totalClientes ?? 0} cliente(s)</span>
          </div>

          {topFive.length === 0 ? (
            <div className="billing-empty-state billing-empty-state-compact">
              <strong>Sem ranking no periodo</strong>
              <p>Nao ha clientes com medicao para exibir no momento.</p>
            </div>
          ) : (
            <div className="billing-ranking-list">
              {topFive.map((item) => (
                <article key={item.clienteId} className="billing-ranking-item">
                  <div className="billing-ranking-rank">#{String(item.rank).padStart(2, "0")}</div>
                  <div className="billing-ranking-copy">
                    <strong>{item.clienteNome}</strong>
                    <span>{item.clienteCodigo}</span>
                  </div>
                  <div className="billing-ranking-metrics">
                    <strong>{formatCurrency(item.totalGeral)}</strong>
                    <span>
                      {formatCurrency(item.totalFaturado)} faturado |{" "}
                      {formatCurrency(item.totalAFaturar)} a faturar
                    </span>
                    <span>{formatPercent(item.sharePercent)} do total</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
