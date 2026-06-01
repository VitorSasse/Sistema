"use client";

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

type EquipmentRankingItem = {
  equipamentoId: string;
  descricao: string;
  placaOuTag: string;
  totalValor: number;
  totalItens: number;
  diasComProducao: number;
  mediaValorPorDia: number;
  ultimoLancamento: string;
};

type EquipmentSectionSummary = {
  totalValor: number;
  totalItens: number;
  equipamentosComProducao: number;
  diasComProducao: number;
  mediaValorPorEquipamento: number;
  mediaValorPorDia: number;
};

type DashboardPayload = {
  period: {
    preset: PeriodPreset;
    start: string;
    end: string;
    label: string;
  };
  filters: {
    caminhaoIds: string[];
    maquinaIds: string[];
    caminhoes: Array<{ id: string; label: string }>;
    maquinas: Array<{ id: string; label: string }>;
  };
  summary: {
    totalValorGeral: number;
    totalItens: number;
    equipamentosComProducao: number;
    diasComProducao: number;
  };
  caminhoes: {
    summary: EquipmentSectionSummary;
    ranking: EquipmentRankingItem[];
  };
  maquinas: {
    summary: EquipmentSectionSummary;
    ranking: EquipmentRankingItem[];
  };
};

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "current_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "last_30_days", label: "Ultimos 30 dias" },
  { value: "custom", label: "Personalizado" }
];

const chartPalette = ["#155b52", "#1d7266", "#25897b", "#34a18f", "#4fb9a0", "#7ed0b3"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function CustomTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: EquipmentRankingItem }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="fleet-tooltip">
      <strong>{item.placaOuTag}</strong>
      <span>{item.descricao}</span>
      <span>{formatCurrency(item.totalValor)}</span>
      <span>{item.totalItens} item(ns)</span>
      <span>{formatCurrency(item.mediaValorPorDia)}/dia</span>
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
      {Array.from({ length: 2 }).map((_, index) => (
        <section key={index} className="fleet-section-grid">
          <article className="surface section-card fleet-skeleton-block" />
          <article className="surface section-card fleet-skeleton-block" />
        </section>
      ))}
    </main>
  );
}

function SectionPanel({
  title,
  kicker,
  valueLabel,
  filterPlaceholder,
  filterValues,
  filterOptions,
  onFilterChange,
  summary,
  ranking
}: {
  title: string;
  kicker: string;
  valueLabel: string;
  filterPlaceholder: string;
  filterValues: string[];
  filterOptions: Array<{ id: string; label: string }>;
  onFilterChange: (values: string[]) => void;
  summary: EquipmentSectionSummary;
  ranking: EquipmentRankingItem[];
}) {
  const chartData = useMemo(
    () =>
      ranking.map((item) => ({
        ...item,
        label: item.placaOuTag
      })),
    [ranking]
  );

  const chartHeight = Math.max(360, chartData.length * 44);

  return (
    <section className="fleet-section surface section-card fade-up">
      <div className="fleet-section-header">
        <div>
          <span className="fleet-kicker">{kicker}</span>
          <h2 className="section-title">{title}</h2>
        </div>
        <label className="field fleet-filter-field fleet-section-filter">
          <span className="field-label">{valueLabel}</span>
          <SearchableMultiSelect
            values={filterValues}
            options={filterOptions.map((item) => ({
              value: item.id,
              label: item.label
            }))}
            placeholder={filterPlaceholder}
            onChange={onFilterChange}
          />
        </label>
      </div>

      <div className="fleet-section-summary">
        <article className="fleet-section-card">
          <span className="fleet-card-label">Valor medido</span>
          <strong className="fleet-section-value">{formatCurrency(summary.totalValor)}</strong>
          <small>{summary.totalItens} item(ns) nas medicoes do periodo</small>
        </article>
        <article className="fleet-section-card">
          <span className="fleet-card-label">Media por equipamento</span>
          <strong className="fleet-section-value">
            {formatCurrency(summary.mediaValorPorEquipamento)}
          </strong>
          <small>{summary.equipamentosComProducao} equipamento(s)</small>
        </article>
        <article className="fleet-section-card">
          <span className="fleet-card-label">Media por dia</span>
          <strong className="fleet-section-value">{formatCurrency(summary.mediaValorPorDia)}</strong>
          <small>{summary.diasComProducao} dia(s)</small>
        </article>
      </div>

      <div className="fleet-section-grid">
        <article className="fleet-chart-card">
          {chartData.length === 0 ? (
            <div className="fleet-empty-state">
              <strong>Sem valor medido</strong>
              <p>Sem itens de medicao no filtro atual.</p>
            </div>
          ) : (
            <>
              <div className="fleet-chart-header">
                <span className="badge badge-info">{chartData.length} equipamento(s)</span>
              </div>

              <div className="fleet-chart-shell" style={{ height: `${chartHeight}px` }}>
                <ResponsiveContainer width="100%" height={chartHeight}>
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
                      tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      width={96}
                      tick={{ fill: "#4c4338", fontSize: 12, fontWeight: 700 }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(21, 91, 82, 0.06)" }}
                    />
                    <Bar dataKey="totalValor" radius={[0, 14, 14, 0]} barSize={22}>
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

        <aside className="fleet-ranking-card">
          {chartData.length === 0 ? (
            <div className="fleet-empty-state fleet-empty-state-compact">
              <strong>Sem ranking</strong>
              <p>Sem itens medidos para listar.</p>
            </div>
          ) : (
            <div className="fleet-ranking-list">
              {chartData.map((item, index) => (
                <article key={item.equipamentoId} className="fleet-ranking-item">
                  <div className="fleet-ranking-rank">#{String(index + 1).padStart(2, "0")}</div>
                  <div className="fleet-ranking-copy">
                    <strong>{item.placaOuTag}</strong>
                    <span>{item.descricao}</span>
                  </div>
                  <div className="fleet-ranking-metrics">
                    <strong>{formatCurrency(item.totalValor)}</strong>
                    <div className="fleet-ranking-chips">
                      <span className="fleet-ranking-chip">{item.totalItens} item(ns)</span>
                      <span className="fleet-ranking-chip">
                        {formatCurrency(item.mediaValorPorDia)}/dia
                      </span>
                      <span className="fleet-ranking-chip">{item.diasComProducao} dia(s)</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export function FrotaDashboard() {
  const [preset, setPreset] = useState<PeriodPreset>("current_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [caminhaoIds, setCaminhaoIds] = useState<string[]>([]);
  const [maquinaIds, setMaquinaIds] = useState<string[]>([]);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(
    nextPreset: PeriodPreset,
    nextCaminhaoIds = caminhaoIds,
    nextMaquinaIds = maquinaIds,
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

      if (nextCaminhaoIds.length > 0) {
        params.set("caminhaoIds", nextCaminhaoIds.join(","));
      }

      if (nextMaquinaIds.length > 0) {
        params.set("maquinaIds", nextMaquinaIds.join(","));
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
      setCaminhaoIds(payload.filters.caminhaoIds ?? []);
      setMaquinaIds(payload.filters.maquinaIds ?? []);
    } catch {
      setError("Nao foi possivel carregar o dashboard da frota.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard("current_month", [], [], "", "");
  }, []);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="fleet-dashboard">
      <section className="fleet-toolbar surface section-card fade-up">
        <div className="fleet-toolbar-copy">
          <span className="fleet-kicker">Frota</span>
          <h1 className="page-title">Valor medido por equipamento</h1>
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
                  void loadDashboard(nextPreset, caminhaoIds, maquinaIds, customStart, customEnd);
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
                onClick={() => void loadDashboard("custom", caminhaoIds, maquinaIds, customStart, customEnd)}
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
          <span className="fleet-card-label">Valor total medido</span>
          <strong className="fleet-card-value">{formatCurrency(data?.summary.totalValorGeral ?? 0)}</strong>
          <p className="fleet-card-copy">
            {data?.summary.totalItens ?? 0} item(ns) nas medicoes do periodo
          </p>
        </article>
        <article className="fleet-summary-card fleet-summary-card-info">
          <span className="fleet-card-label">Equipamentos com valor</span>
          <strong className="fleet-card-value">{data?.summary.equipamentosComProducao ?? 0}</strong>
          <p className="fleet-card-copy">Caminhoes e maquinas com medicao</p>
        </article>
        <article className="fleet-summary-card fleet-summary-card-warn">
          <span className="fleet-card-label">Dias com medicao</span>
          <strong className="fleet-card-value">{data?.summary.diasComProducao ?? 0}</strong>
          <p className="fleet-card-copy">Dias com valor registrado nas medicoes</p>
        </article>
      </section>

      <SectionPanel
        title="Caminhoes"
        kicker="Resumo por valor"
        valueLabel="Caminhoes exibidos"
        filterPlaceholder="Buscar caminhoes"
        filterValues={caminhaoIds}
        filterOptions={data?.filters.caminhoes ?? []}
        onFilterChange={(values) => {
          setCaminhaoIds(values);
          if (preset === "custom" && (!customStart || !customEnd)) {
            return;
          }
          void loadDashboard(preset, values, maquinaIds, customStart, customEnd);
        }}
        summary={
          data?.caminhoes.summary ?? {
            totalValor: 0,
            totalItens: 0,
            equipamentosComProducao: 0,
            diasComProducao: 0,
            mediaValorPorEquipamento: 0,
            mediaValorPorDia: 0
          }
        }
        ranking={data?.caminhoes.ranking ?? []}
      />

      <SectionPanel
        title="Maquinas"
        kicker="Resumo por valor"
        valueLabel="Maquinas exibidas"
        filterPlaceholder="Buscar maquinas"
        filterValues={maquinaIds}
        filterOptions={data?.filters.maquinas ?? []}
        onFilterChange={(values) => {
          setMaquinaIds(values);
          if (preset === "custom" && (!customStart || !customEnd)) {
            return;
          }
          void loadDashboard(preset, caminhaoIds, values, customStart, customEnd);
        }}
        summary={
          data?.maquinas.summary ?? {
            totalValor: 0,
            totalItens: 0,
            equipamentosComProducao: 0,
            diasComProducao: 0,
            mediaValorPorEquipamento: 0,
            mediaValorPorDia: 0
          }
        }
        ranking={data?.maquinas.ranking ?? []}
      />
    </main>
  );
}
