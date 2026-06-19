"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableMultiSelect } from "@/components/form/searchable-multi-select";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrency } from "@/lib/utils/formatters";

type EquipmentType = "CAMINHAO" | "MAQUINA";

type EquipmentSummary = {
  id: string;
  label: string;
  placaOuTag: string;
  descricao: string;
  tipoRecurso: EquipmentType;
  totalValorPeriodo: number;
  totalItensPeriodo: number;
  totalMedicoesPeriodo: number;
  totalDiasPeriodo: number;
  mediaMensal: number;
  mediaPorDia: number;
  melhorMes: {
    monthNumber: number;
    label: string;
    totalValor: number;
    totalItens: number;
    totalMedicoes: number;
    diasComProducao: number;
  };
  monthly: Array<{
    monthNumber: number;
    label: string;
    totalValor: number;
    totalItens: number;
    totalMedicoes: number;
    diasComProducao: number;
    mediaMensal: number;
  }>;
};

type DashboardPayload = {
  period: {
    year: number;
    start: string;
    end: string;
    label: string;
  };
  filters: {
    equipmentIds: string[];
    availableYears: number[];
    selectedMonths: number[];
    availableMonths: Array<{
      monthNumber: number;
      label: string;
    }>;
    equipments: Array<{
      id: string;
      label: string;
      placaOuTag: string;
      descricao: string;
      tipoRecurso: EquipmentType;
    }>;
  };
  selectedEquipments: Array<{
    id: string;
    label: string;
    placaOuTag: string;
    descricao: string;
    tipoRecurso: EquipmentType;
  }>;
  summary: {
    totalValorPeriodo: number;
    totalItensPeriodo: number;
    totalMedicoesPeriodo: number;
    totalDiasPeriodo: number;
    totalEquipamentosSelecionados: number;
    mediaMensal: number;
    mediaPorDia: number;
    monthsConsidered: number;
    melhorMes: {
      monthNumber: number;
      label: string;
      totalValor: number;
      totalItens: number;
      totalMedicoes: number;
      diasComProducao: number;
    };
  };
  monthly: Array<{
    monthNumber: number;
    label: string;
    totalValor: number;
    totalItens: number;
    totalMedicoes: number;
    diasComProducao: number;
    mediaMensal: number;
  }>;
  equipmentSeries: EquipmentSummary[];
};

type ComparisonRow = {
  monthNumber: number;
  label: string;
  totalValor: number;
  mediaMensal: number;
  [key: string]: number | string;
};

const allMonthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);
const seriesPalette = ["#F97316", "#38BDF8", "#22C55E", "#F59E0B", "#8B5CF6", "#EF4444"];

function SingleEquipmentTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: DashboardPayload["monthly"][number] }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="fleet-tooltip">
      <strong>{item.label}</strong>
      <span>Valor: {formatCurrency(item.totalValor)}</span>
      <span>Medicoes: {item.totalMedicoes}</span>
      <span>Itens: {item.totalItens}</span>
      <span>Dias com producao: {item.diasComProducao}</span>
      <span>Media mensal: {formatCurrency(item.mediaMensal)}</span>
    </div>
  );
}

function ComparisonTooltip({
  active,
  payload,
  equipmentMap
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    value?: number;
    payload: ComparisonRow;
  }>;
  equipmentMap: Map<string, EquipmentSummary>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload;

  if (!row) {
    return null;
  }

  const equipmentValues = payload
    .filter((item) => typeof item.dataKey === "string" && item.dataKey.startsWith("equipment_"))
    .map((item) => {
      const equipmentId = String(item.dataKey).replace("equipment_", "");
      const equipment = equipmentMap.get(equipmentId);

      return {
        color: item.color ?? "#F97316",
        value: Number(item.value ?? 0),
        equipment
      };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="fleet-tooltip">
      <strong>{row.label}</strong>
      <span>Total do grupo: {formatCurrency(Number(row.totalValor ?? 0))}</span>
      <span>Media consolidada: {formatCurrency(Number(row.mediaMensal ?? 0))}</span>
      <div className="fleet-monthly-tooltip-list">
        {equipmentValues.map((item) => (
          <div key={item.equipment?.id ?? item.color} className="fleet-monthly-tooltip-row">
            <i
              className="fleet-monthly-dot"
              style={{ background: item.color, boxShadow: `0 0 0 3px ${item.color}22` }}
            />
            <span>
              {(item.equipment?.placaOuTag ?? "Equipamento") + ": " + formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="fleet-dashboard fleet-monthly-dashboard">
      <section className="fleet-toolbar surface section-card fleet-skeleton-block" />
      <section className="fleet-monthly-summary-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={index}
            className="surface section-card fleet-summary-card fleet-skeleton-block"
          />
        ))}
      </section>
      <section className="fleet-monthly-chart-grid">
        <article className="surface section-card fleet-skeleton-block" />
        <article className="surface section-card fleet-skeleton-block" />
      </section>
    </main>
  );
}

export function FrotaFaturamentoMensalDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<number[]>(allMonthNumbers);
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(
    nextYear: number,
    nextMonths: number[],
    nextEquipmentIds?: string[] | null
  ) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        year: String(nextYear),
        months: nextMonths.join(",")
      });

      if (nextEquipmentIds !== null && nextEquipmentIds !== undefined) {
        params.set("equipmentIds", nextEquipmentIds.join(","));
      }

      const response = await fetch(`/api/frota/dashboard/mensal?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar o faturamento mensal da frota.");
        setData(null);
        return;
      }

      setData(payload);
      setYear(payload.period.year);
      setSelectedMonths(payload.filters.selectedMonths);
      setEquipmentIds(payload.filters.equipmentIds ?? []);
    } catch {
      setError("Nao foi possivel carregar o faturamento mensal da frota.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard(new Date().getFullYear(), allMonthNumbers, null);
  }, []);

  const monthlyRows = useMemo(() => data?.monthly ?? [], [data]);
  const equipmentSeries = useMemo(() => data?.equipmentSeries ?? [], [data]);
  const selectedEquipments = useMemo(() => data?.selectedEquipments ?? [], [data]);
  const hasEquipmentData = selectedEquipments.length > 0;
  const hasAvailableEquipments = (data?.filters.equipments.length ?? 0) > 0;
  const hasMeasuredValue = (data?.summary.totalValorPeriodo ?? 0) > 0;
  const isComparingMultiple = selectedEquipments.length > 1;
  const primaryEquipment = selectedEquipments[0] ?? null;

  const equipmentMap = useMemo(
    () => new Map(equipmentSeries.map((item) => [item.id, item])),
    [equipmentSeries]
  );

  const equipmentColorMap = useMemo(() => {
    return new Map(
      equipmentSeries.map((item, index) => [item.id, seriesPalette[index % seriesPalette.length] ?? "#F97316"])
    );
  }, [equipmentSeries]);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    return monthlyRows.map((month) => {
      const row: ComparisonRow = {
        monthNumber: month.monthNumber,
        label: month.label,
        totalValor: month.totalValor,
        mediaMensal: month.mediaMensal
      };

      equipmentSeries.forEach((series) => {
        const monthlyItem = series.monthly.find((item) => item.monthNumber === month.monthNumber);
        row[`equipment_${series.id}`] = monthlyItem?.totalValor ?? 0;
      });

      return row;
    });
  }, [equipmentSeries, monthlyRows]);

  const rankedSeries = useMemo(
    () => [...equipmentSeries].sort((a, b) => b.totalValorPeriodo - a.totalValorPeriodo),
    [equipmentSeries]
  );

  function toggleMonth(monthNumber: number) {
    const nextMonths = selectedMonths.includes(monthNumber)
      ? selectedMonths.filter((item) => item !== monthNumber)
      : [...selectedMonths, monthNumber].sort((a, b) => a - b);

    if (nextMonths.length === 0) {
      return;
    }

    setSelectedMonths(nextMonths);
    void loadDashboard(year, nextMonths, equipmentIds);
  }

  function selectAllMonths() {
    setSelectedMonths(allMonthNumbers);
    void loadDashboard(year, allMonthNumbers, equipmentIds);
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="fleet-dashboard fleet-monthly-dashboard">
      <section className="fleet-toolbar surface section-card fade-up fleet-monthly-hero">
        <div className="fleet-toolbar-copy">
          <span className="fleet-kicker">Frota mensal</span>
          <h1 className="page-title">Faturamento mensal por equipamento</h1>
          <p className="page-copy">
            Compare um ou mais equipamentos no mesmo ano para enxergar faturamento mensal,
            media consolidada e quem puxou mais valor no recorte.
          </p>
        </div>

        <div className="fleet-monthly-filter-grid">
          <label className="field fleet-filter-field fleet-monthly-filter-wide">
            <span className="field-label">Equipamentos</span>
            <SearchableMultiSelect
              values={equipmentIds}
              options={(data?.filters.equipments ?? []).map((item) => ({
                value: item.id,
                label: item.label
              }))}
              placeholder="Buscar equipamento"
              onChange={(values) => {
                setEquipmentIds(values);
                void loadDashboard(year, selectedMonths, values);
              }}
            />
          </label>

          <label className="field fleet-filter-field">
            <span className="field-label">Ano</span>
            <select
              className="field-control"
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                void loadDashboard(nextYear, selectedMonths, equipmentIds);
              }}
            >
              {(data?.filters.availableYears ?? [year]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="fleet-period-badge fleet-monthly-badge">
            <strong>Janela ativa</strong>
            <span>
              {data?.summary.totalEquipamentosSelecionados ?? 0} equipamento(s) em{" "}
              {data?.period.label ?? String(year)}
            </span>
          </div>
        </div>

        <div className="billing-month-filter fleet-monthly-month-filter">
          <div className="billing-month-filter-copy">
            <strong>Meses do grafico</strong>
            <span>
              A comparacao considera apenas os meses selecionados no recorte atual.
            </span>
          </div>
          <div className="billing-month-filter-actions">
            <button
              type="button"
              className="button-ghost"
              disabled={selectedMonths.length === allMonthNumbers.length}
              onClick={selectAllMonths}
            >
              Todos os meses
            </button>
          </div>
          <div className="billing-month-chip-grid">
            {(data?.filters.availableMonths ?? []).map((month) => {
              const active = selectedMonths.includes(month.monthNumber);

              return (
                <button
                  key={month.monthNumber}
                  type="button"
                  className={active ? "billing-month-chip is-active" : "billing-month-chip"}
                  onClick={() => toggleMonth(month.monthNumber)}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {error ? (
        <section className="surface section-card">
          <p className="message-inline message-inline-danger">{error}</p>
        </section>
      ) : null}

      {!hasEquipmentData ? (
        <section className="surface section-card fleet-empty-state fade-up">
          <strong>
            {hasAvailableEquipments
              ? "Selecione ao menos um equipamento"
              : "Nenhum equipamento com medicao encontrado"}
          </strong>
          <p>
            {hasAvailableEquipments
              ? "A comparacao mensal fica vazia enquanto nenhum equipamento estiver marcado."
              : "Nao existe historico mensal disponivel para os filtros atuais."}
          </p>
        </section>
      ) : (
        <>
          <section className="fleet-monthly-summary-grid fade-up fade-up-delay-1">
            <article className="fleet-summary-card fleet-summary-card-strong">
              <span className="fleet-card-label">Faturamento no recorte</span>
              <strong className="fleet-card-value">
                {formatCurrency(data?.summary.totalValorPeriodo ?? 0)}
              </strong>
              <p className="fleet-card-copy">
                {data?.summary.totalItensPeriodo ?? 0} item(ns) e{" "}
                {data?.summary.totalMedicoesPeriodo ?? 0} medicao(oes) relacionadas.
              </p>
            </article>
            <article className="fleet-summary-card fleet-summary-card-info">
              <span className="fleet-card-label">Media mensal consolidada</span>
              <strong className="fleet-card-value">
                {formatCurrency(data?.summary.mediaMensal ?? 0)}
              </strong>
              <p className="fleet-card-copy">
                Base em {data?.summary.monthsConsidered ?? 0} mes(es) do recorte.
              </p>
            </article>
            <article className="fleet-summary-card fleet-summary-card-warn">
              <span className="fleet-card-label">Equipamentos comparados</span>
              <strong className="fleet-card-value">
                {data?.summary.totalEquipamentosSelecionados ?? 0}
              </strong>
              <p className="fleet-card-copy">
                {data?.summary.totalDiasPeriodo ?? 0} registro(s) diarios de producao considerados.
              </p>
            </article>
            <article className="fleet-summary-card fleet-summary-card-danger">
              <span className="fleet-card-label">Melhor mes do grupo</span>
              <strong className="fleet-card-value">
                {data?.summary.melhorMes.label ?? "-"}
              </strong>
              <p className="fleet-card-copy">
                {formatCurrency(data?.summary.melhorMes.totalValor ?? 0)} no pico do recorte.
              </p>
            </article>
          </section>

          <section className="fleet-monthly-chart-grid fade-up fade-up-delay-2">
            <article className="fleet-chart-card surface section-card">
              {!hasMeasuredValue ? (
                <div className="fleet-empty-state">
                  <strong>Sem faturamento no recorte</strong>
                  <p>Os equipamentos selecionados nao possuem valor medido nos meses filtrados.</p>
                </div>
              ) : (
                <div className="fleet-monthly-chart-panel">
                  <div className="fleet-chart-header">
                    <div className="fleet-monthly-chart-copy">
                      <span className="fleet-kicker">
                        {isComparingMultiple
                          ? "Comparativo"
                          : primaryEquipment?.tipoRecurso === "CAMINHAO"
                            ? "Caminhao"
                            : "Maquina"}
                      </span>
                      <h2 className="section-title">
                        {isComparingMultiple
                          ? "Comparativo mensal entre equipamentos"
                          : `${primaryEquipment?.placaOuTag ?? "-"} - ${primaryEquipment?.descricao ?? "-"}`}
                      </h2>
                      <p className="fleet-card-copy">
                        {isComparingMultiple
                          ? "Cada linha representa um equipamento selecionado no mesmo recorte mensal."
                          : "Leitura mensal do faturamento do equipamento com referencia da media do periodo."}
                      </p>
                    </div>
                    <span className="badge badge-info">
                      {data?.summary.totalEquipamentosSelecionados ?? 0} equipamento(s)
                    </span>
                  </div>

                  <div className="fleet-monthly-legend">
                    {isComparingMultiple ? (
                      <>
                        {equipmentSeries.map((item) => (
                          <span key={item.id} className="fleet-monthly-legend-item">
                            <i
                              className="fleet-monthly-dot"
                              style={{
                                background: equipmentColorMap.get(item.id) ?? "#F97316",
                                boxShadow: `0 0 0 3px ${(equipmentColorMap.get(item.id) ?? "#F97316")}22`
                              }}
                            />
                            {item.placaOuTag}
                          </span>
                        ))}
                        <span className="fleet-monthly-legend-item">
                          <i className="fleet-monthly-dot is-average" />
                          Media consolidada
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="fleet-monthly-legend-item">
                          <i className="fleet-monthly-dot is-total" />
                          Faturamento do mes
                        </span>
                        <span className="fleet-monthly-legend-item">
                          <i className="fleet-monthly-dot is-average" />
                          Media mensal
                        </span>
                      </>
                    )}
                  </div>

                  <div className="fleet-chart-shell fleet-monthly-chart-shell">
                    {isComparingMultiple ? (
                      <ResponsiveContainer width="100%" height={420}>
                        <LineChart
                          data={comparisonRows}
                          margin={{ top: 18, right: 24, left: 8, bottom: 12 }}
                        >
                          <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                            tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                            width={120}
                          />
                          <Tooltip
                            content={<ComparisonTooltip equipmentMap={equipmentMap} />}
                            cursor={{ stroke: "rgba(56, 189, 248, 0.35)", strokeWidth: 1 }}
                          />
                          {equipmentSeries.map((item) => (
                            <Line
                              key={item.id}
                              type="monotone"
                              dataKey={`equipment_${item.id}`}
                              name={item.placaOuTag}
                              stroke={equipmentColorMap.get(item.id) ?? "#F97316"}
                              strokeWidth={3}
                              dot={{
                                r: 3,
                                fill: equipmentColorMap.get(item.id) ?? "#F97316"
                              }}
                              activeDot={{
                                r: 6,
                                fill: equipmentColorMap.get(item.id) ?? "#F97316"
                              }}
                            />
                          ))}
                          <Line
                            type="monotone"
                            dataKey="mediaMensal"
                            stroke="#94A3B8"
                            strokeWidth={2}
                            strokeDasharray="6 6"
                            dot={false}
                            activeDot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={420}>
                        <ComposedChart
                          data={monthlyRows}
                          margin={{ top: 18, right: 24, left: 8, bottom: 12 }}
                        >
                          <defs>
                            <linearGradient id="fleetMonthlyBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FB923C" />
                              <stop offset="100%" stopColor="#F97316" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                            tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                            width={120}
                          />
                          <Tooltip
                            content={<SingleEquipmentTooltip />}
                            cursor={{ fill: "rgba(249, 115, 22, 0.08)" }}
                          />
                          <Bar
                            dataKey="totalValor"
                            radius={[14, 14, 0, 0]}
                            fill="url(#fleetMonthlyBar)"
                            maxBarSize={48}
                          />
                          <Line
                            type="monotone"
                            dataKey="mediaMensal"
                            stroke="#2563EB"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: "#2563EB" }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}
            </article>

            <aside className="fleet-ranking-card surface section-card fleet-monthly-side-panel">
              <div className="fleet-ranking-header">
                <div>
                  <span className="fleet-kicker">Leitura mensal</span>
                  <h2 className="section-title">
                    {isComparingMultiple ? "Resumo comparativo" : "Resumo do equipamento"}
                  </h2>
                </div>
                <span className="badge badge-info">
                  {data?.summary.totalEquipamentosSelecionados ?? 0} selecionado(s)
                </span>
              </div>

              <div className="fleet-monthly-info-grid">
                <article className="fleet-section-card">
                  <span className="fleet-card-label">Medições vinculadas</span>
                  <strong className="fleet-section-value">
                    {data?.summary.totalMedicoesPeriodo ?? 0}
                  </strong>
                  <small>Total unico de medicoes ligadas ao recorte selecionado.</small>
                </article>
                <article className="fleet-section-card">
                  <span className="fleet-card-label">Media por dia</span>
                  <strong className="fleet-section-value">
                    {formatCurrency(data?.summary.mediaPorDia ?? 0)}
                  </strong>
                  <small>Leitura consolidada sobre os dias com producao no recorte.</small>
                </article>
              </div>

              {!hasMeasuredValue ? (
                <div className="fleet-empty-state fleet-empty-state-compact">
                  <strong>Sem meses para ranquear</strong>
                  <p>Selecione outro equipamento ou amplie o recorte.</p>
                </div>
              ) : (
                <div className="fleet-monthly-compare-list">
                  {rankedSeries.map((item) => (
                    <article key={item.id} className="fleet-monthly-compare-item">
                      <div className="fleet-monthly-compare-head">
                        <div>
                          <strong>
                            {item.placaOuTag} - {item.descricao}
                          </strong>
                          <span>
                            {item.tipoRecurso === "CAMINHAO" ? "Caminhao" : "Maquina"} •{" "}
                            {item.totalMedicoesPeriodo} medicao(oes)
                          </span>
                        </div>
                        <i
                          className="fleet-monthly-dot"
                          style={{
                            background: equipmentColorMap.get(item.id) ?? "#F97316",
                            boxShadow: `0 0 0 3px ${(equipmentColorMap.get(item.id) ?? "#F97316")}22`
                          }}
                        />
                      </div>
                      <div className="fleet-monthly-compare-metrics">
                        <strong>{formatCurrency(item.totalValorPeriodo)}</strong>
                        <div className="fleet-ranking-chips">
                          <span className="fleet-ranking-chip">
                            Media {formatCurrency(item.mediaMensal)}
                          </span>
                          <span className="fleet-ranking-chip">
                            {item.totalDiasPeriodo} dia(s)
                          </span>
                          <span className="fleet-ranking-chip">
                            Pico em {item.melhorMes.label}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
