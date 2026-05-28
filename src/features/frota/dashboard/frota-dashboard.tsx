"use client";

import { useEffect, useMemo, useState } from "react";
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

type PeriodPreset = "current_month" | "previous_month" | "last_30_days" | "custom";

type DashboardPayload = {
  period: {
    preset: PeriodPreset;
    start: string;
    end: string;
    label: string;
  };
  filters: {
    equipamentoId: string | null;
    equipamentos: Array<{
      id: string;
      label: string;
    }>;
  };
  summary: {
    totalM3: number;
    totalCargas: number;
    caminhoesComProducao: number;
    diasComProducao: number;
    mediaM3PorCaminhao: number;
    mediaM3PorDia: number;
  };
  ranking: Array<{
    equipamentoId: string;
    descricao: string;
    placaOuTag: string;
    totalM3: number;
    totalCargas: number;
    diasComProducao: number;
    mediaM3PorDia: number;
    ultimoLancamento: string;
  }>;
};

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "current_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "last_30_days", label: "Ultimos 30 dias" },
  { value: "custom", label: "Personalizado" }
];

const chartPalette = ["#155b52", "#1d7266", "#25897b", "#34a18f", "#4fb9a0", "#7ed0b3"];

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
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
    <div className="fleet-tooltip">
      <strong>{item.placaOuTag}</strong>
      <span>{item.descricao}</span>
      <span>{formatNumber(item.totalM3, 1)} m3 no periodo</span>
      <span>{formatNumber(item.totalCargas, 0)} carga(s)</span>
      <span>{formatNumber(item.mediaM3PorDia, 1)} m3 por dia</span>
      <span>Ultimo lancamento: {formatDate(item.ultimoLancamento)}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="fleet-dashboard">
      <section className="fleet-toolbar surface section-card fleet-skeleton-block" />
      <section className="fleet-summary-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={index}
            className="surface section-card fleet-summary-card fleet-skeleton-block"
          />
        ))}
      </section>
      <section className="fleet-content-grid">
        <article className="surface section-card fleet-skeleton-block" />
        <article className="surface section-card fleet-skeleton-block" />
      </section>
    </main>
  );
}

export function FrotaDashboard() {
  const [preset, setPreset] = useState<PeriodPreset>("current_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [equipamentoId, setEquipamentoId] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(
    nextPreset: PeriodPreset,
    nextEquipamentoId = equipamentoId,
    start = customStart,
    end = customEnd
  ) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ period: nextPreset });

      if (nextPreset === "custom") {
        if (start) params.set("start", start);
        if (end) params.set("end", end);
      }

      if (nextEquipamentoId) {
        params.set("equipamentoId", nextEquipamentoId);
      }

      const response = await fetch(`/api/frota/dashboard?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar o dashboard da frota.");
        setData(null);
        return;
      }

      setData(payload);
      setEquipamentoId(payload.filters.equipamentoId ?? "");
    } catch {
      setError("Nao foi possivel carregar o dashboard da frota.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard("current_month", "", "", "");
  }, []);

  const chartData = useMemo(
    () =>
      (data?.ranking ?? []).map((item) => ({
        ...item,
        label: item.placaOuTag
      })),
    [data]
  );

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="fleet-dashboard">
      <section className="fleet-toolbar surface section-card fade-up">
        <div className="fleet-toolbar-copy">
          <span className="fleet-kicker">Frota</span>
          <h1 className="page-title">Producao dos caminhoes</h1>
        </div>

        <div className="fleet-filter-row">
          <label className="field fleet-filter-field">
            <span className="field-label">Periodo</span>
            <select
              className="field-control"
              value={preset}
              onChange={(event) => {
                const nextPreset = event.target.value as PeriodPreset;
                setPreset(nextPreset);
                if (nextPreset !== "custom") {
                  void loadDashboard(nextPreset, equipamentoId, customStart, customEnd);
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

          <label className="field fleet-filter-field">
            <span className="field-label">Caminhao</span>
            <select
              className="field-control"
              value={equipamentoId}
              onChange={(event) => {
                const nextEquipamentoId = event.target.value;
                setEquipamentoId(nextEquipamentoId);
                if (preset === "custom" && (!customStart || !customEnd)) {
                  return;
                }
                void loadDashboard(preset, nextEquipamentoId, customStart, customEnd);
              }}
            >
              <option value="">Todos os caminhoes</option>
              {(data?.filters.equipamentos ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {preset === "custom" ? (
            <div className="fleet-custom-range">
              <label className="field fleet-filter-field">
                <span className="field-label">Data inicial</span>
                <input
                  className="field-control"
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </label>
              <label className="field fleet-filter-field">
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
                onClick={() => void loadDashboard("custom", equipamentoId, customStart, customEnd)}
              >
                Aplicar
              </button>
            </div>
          ) : null}

          <div className="fleet-period-badge">
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

      <section className="fleet-summary-grid fade-up fade-up-delay-1">
        <article className="fleet-summary-card fleet-summary-card-strong">
          <span className="fleet-card-label">Producao total</span>
          <strong className="fleet-card-value">{formatNumber(data?.summary.totalM3 ?? 0, 1)} m3</strong>
          <p className="fleet-card-copy">{formatNumber(data?.summary.totalCargas ?? 0)} carga(s)</p>
        </article>

        <article className="fleet-summary-card fleet-summary-card-info">
          <span className="fleet-card-label">Media por caminhao</span>
          <strong className="fleet-card-value">
            {formatNumber(data?.summary.mediaM3PorCaminhao ?? 0, 1)} m3
          </strong>
          <p className="fleet-card-copy">
            {data?.summary.caminhoesComProducao ?? 0} caminhao(oes) com producao
          </p>
        </article>

        <article className="fleet-summary-card fleet-summary-card-warn">
          <span className="fleet-card-label">Media por dia</span>
          <strong className="fleet-card-value">
            {formatNumber(data?.summary.mediaM3PorDia ?? 0, 1)} m3
          </strong>
          <p className="fleet-card-copy">{data?.summary.diasComProducao ?? 0} dia(s) com lancamento</p>
        </article>

        <article className="fleet-summary-card fleet-summary-card-danger">
          <span className="fleet-card-label">Caminhoes com producao</span>
          <strong className="fleet-card-value">{data?.summary.caminhoesComProducao ?? 0}</strong>
          <p className="fleet-card-copy">{formatNumber(data?.summary.totalCargas ?? 0)} cargas no periodo</p>
        </article>
      </section>

      <section className="fleet-content-grid fade-up fade-up-delay-2">
        <article className="surface section-card fleet-chart-card">
          {chartData.length === 0 ? (
            <div className="fleet-empty-state">
              <strong>Sem producao no periodo</strong>
              <p>Ajuste o periodo ou o caminhao para carregar o painel.</p>
            </div>
          ) : (
            <>
              <div className="fleet-chart-header">
                <div>
                  <span className="fleet-kicker">m3 por caminhao</span>
                  <h2 className="section-title">Ranking de producao</h2>
                </div>
                <span className="badge badge-info">{chartData.length} item(ns)</span>
              </div>

              <div className="fleet-chart-shell">
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 18, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid stroke="rgba(109, 92, 66, 0.12)" horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6f6455", fontSize: 12 }}
                      tickFormatter={(value) => `${formatNumber(value, 0)} m3`}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      width={92}
                      tick={{ fill: "#4c4338", fontSize: 12, fontWeight: 700 }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(21, 91, 82, 0.06)" }}
                    />
                    <Bar dataKey="totalM3" radius={[0, 14, 14, 0]} barSize={22}>
                      {chartData.map((item, index) => (
                        <Cell
                          key={item.equipamentoId}
                          fill={chartPalette[index % chartPalette.length] ?? "#155b52"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </article>

        <aside className="surface section-card fleet-ranking-card">
          <div className="fleet-chart-header">
            <div>
              <span className="fleet-kicker">Leitura rapida</span>
              <h2 className="section-title">Top caminhoes</h2>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="fleet-empty-state fleet-empty-state-compact">
              <strong>Nenhum caminhao no ranking</strong>
              <p>Sem lancamento produtivo para exibir.</p>
            </div>
          ) : (
            <div className="fleet-ranking-list">
              {chartData.slice(0, 6).map((item, index) => (
                <article key={item.equipamentoId} className="fleet-ranking-item">
                  <div className="fleet-ranking-rank">#{String(index + 1).padStart(2, "0")}</div>
                  <div className="fleet-ranking-copy">
                    <strong>{item.placaOuTag}</strong>
                    <span>{item.descricao}</span>
                  </div>
                  <div className="fleet-ranking-metrics">
                    <strong>{formatNumber(item.totalM3, 1)} m3</strong>
                    <div className="fleet-ranking-chips">
                      <span className="fleet-ranking-chip">{formatNumber(item.totalCargas, 0)} cargas</span>
                      <span className="fleet-ranking-chip">{formatNumber(item.mediaM3PorDia, 1)} m3/dia</span>
                      <span className="fleet-ranking-chip">{item.diasComProducao} dia(s)</span>
                    </div>
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
