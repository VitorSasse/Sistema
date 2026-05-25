"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
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
    totalMedicoes: number;
    totalClientes: number;
    ticketMedioPorCliente: number;
    clienteTop: {
      nome: string;
      codigo: string;
      totalFaturado: number;
    } | null;
  };
  ranking: Array<{
    rank: number;
    clienteId: string;
    clienteCodigo: string;
    clienteNome: string;
    totalFaturado: number;
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

const chartPalette = [
  "#155b52",
  "#1a7468",
  "#258c7e",
  "#35a58f",
  "#50bba0",
  "#78cdb3",
  "#9fdcc9",
  "#c1ebe0"
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
      <span>Faturamento: {formatCurrency(item.totalFaturado)}</span>
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
        {Array.from({ length: 4 }).map((_, index) => (
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
            Painel financeiro para acompanhar o faturamento das medicoes faturadas,
            entender quem mais gera receita e comparar o desempenho do periodo selecionado.
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
          <span className="billing-summary-label">Faturamento total</span>
          <strong>{formatCurrency(data?.summary.totalFaturado ?? 0)}</strong>
          <p>Receita consolidada das medicoes faturadas no periodo.</p>
        </article>
        <article className="billing-summary-card">
          <span className="billing-summary-label">Cliente que mais faturou</span>
          <strong>{data?.summary.clienteTop?.nome ?? "Sem faturamento"}</strong>
          <p>
            {data?.summary.clienteTop
              ? `${data.summary.clienteTop.codigo} • ${formatCurrency(data.summary.clienteTop.totalFaturado)}`
              : "Ainda nao ha medicoes faturadas para a janela selecionada."}
          </p>
        </article>
        <article className="billing-summary-card">
          <span className="billing-summary-label">Medicoes faturadas</span>
          <strong>{data?.summary.totalMedicoes ?? 0}</strong>
          <p>Quantidade de medicoes contabilizadas no faturamento do periodo.</p>
        </article>
        <article className="billing-summary-card">
          <span className="billing-summary-label">Ticket medio por cliente</span>
          <strong>{formatCurrency(data?.summary.ticketMedioPorCliente ?? 0)}</strong>
          <p>
            Baseado em {data?.summary.totalClientes ?? 0} cliente(s) com medicao faturada.
          </p>
        </article>
      </section>

      <section className="billing-grid fade-up fade-up-delay-2">
        <article className="billing-chart-card surface section-card">
          <div className="billing-chart-header">
            <div>
              <span className="billing-kicker">Faturamento por cliente</span>
              <h2 className="section-title">Ranking financeiro do periodo</h2>
              <p className="section-copy">
                Clientes ordenados do maior faturamento para o menor, com participacao no total.
              </p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="billing-empty-state">
              <strong>Nenhum faturamento encontrado</strong>
              <p>
                Nao ha medicoes faturadas no periodo selecionado. Ajuste a janela para ver o
                grafico.
              </p>
            </div>
          ) : (
            <div className="billing-chart-shell">
              <ResponsiveContainer width="100%" height={420}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 18, right: 24, left: 8, bottom: 32 }}
                >
                  <defs>
                    <linearGradient id="billingBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1b7c6f" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#155b52" stopOpacity={0.72} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(109, 92, 66, 0.12)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-24}
                    textAnchor="end"
                    height={72}
                    tick={{ fill: "#6f6455", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="currency"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                    tick={{ fill: "#6f6455", fontSize: 12 }}
                    width={110}
                  />
                  <YAxis
                    yAxisId="share"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "#6f6455", fontSize: 12 }}
                    width={56}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(21, 91, 82, 0.06)" }} />
                  <Legend
                    wrapperStyle={{ paddingTop: 12 }}
                    formatter={(value) =>
                      value === "totalFaturado" ? "Faturamento" : "Participacao"
                    }
                  />
                  <Bar
                    yAxisId="currency"
                    dataKey="totalFaturado"
                    name="totalFaturado"
                    radius={[12, 12, 0, 0]}
                    fill="url(#billingBarGradient)"
                    maxBarSize={56}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.clienteId}
                        fill={chartPalette[index % chartPalette.length]}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="share"
                    type="monotone"
                    dataKey="sharePercent"
                    name="sharePercent"
                    stroke="#d4932d"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: "#d4932d" }}
                    activeDot={{ r: 6, fill: "#f0b544" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <aside className="billing-ranking-card surface section-card">
          <div className="billing-ranking-header">
            <div>
              <span className="billing-kicker">Top clientes</span>
              <h2 className="section-title">Maiores faturamentos</h2>
            </div>
            <span className="badge badge-info">
              {data?.summary.totalClientes ?? 0} cliente(s)
            </span>
          </div>

          {topFive.length === 0 ? (
            <div className="billing-empty-state billing-empty-state-compact">
              <strong>Sem ranking no periodo</strong>
              <p>Nao ha clientes faturados para exibir no momento.</p>
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
                    <strong>{formatCurrency(item.totalFaturado)}</strong>
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
