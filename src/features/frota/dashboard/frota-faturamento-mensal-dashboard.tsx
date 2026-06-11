"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";
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

type DashboardPayload = {
  period: {
    year: number;
    start: string;
    end: string;
    label: string;
  };
  filters: {
    equipmentId: string;
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
      tipoRecurso: "CAMINHAO" | "MAQUINA";
    }>;
  };
  selectedEquipment: {
    id: string;
    label: string;
    placaOuTag: string;
    descricao: string;
    tipoRecurso: "CAMINHAO" | "MAQUINA";
  } | null;
  summary: {
    totalValorPeriodo: number;
    totalItensPeriodo: number;
    totalMedicoesPeriodo: number;
    totalDiasPeriodo: number;
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
      mediaMensal: number;
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
};

const allMonthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);

function CustomTooltip({
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

function DashboardSkeleton() {
  return (
    <main className="fleet-dashboard">
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
  const [equipmentId, setEquipmentId] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(nextYear: number, nextMonths: number[], nextEquipmentId: string) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        year: String(nextYear),
        months: nextMonths.join(",")
      });

      if (nextEquipmentId) {
        params.set("equipmentId", nextEquipmentId);
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
      setEquipmentId(payload.filters.equipmentId ?? "");
    } catch {
      setError("Nao foi possivel carregar o faturamento mensal da frota.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard(new Date().getFullYear(), allMonthNumbers, "");
  }, []);

  const monthlyRows = useMemo(() => data?.monthly ?? [], [data]);
  const hasEquipmentData = Boolean(data?.selectedEquipment);
  const hasMeasuredValue = (data?.summary.totalValorPeriodo ?? 0) > 0;

  function toggleMonth(monthNumber: number) {
    const nextMonths = selectedMonths.includes(monthNumber)
      ? selectedMonths.filter((item) => item !== monthNumber)
      : [...selectedMonths, monthNumber].sort((a, b) => a - b);

    if (nextMonths.length === 0) {
      return;
    }

    setSelectedMonths(nextMonths);
    void loadDashboard(year, nextMonths, equipmentId);
  }

  function selectAllMonths() {
    setSelectedMonths(allMonthNumbers);
    void loadDashboard(year, allMonthNumbers, equipmentId);
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
            Selecione um equipamento para acompanhar a curva mensal de faturamento e a media
            mensal do periodo filtrado.
          </p>
        </div>

        <div className="fleet-monthly-filter-grid">
          <label className="field fleet-filter-field">
            <span className="field-label">Equipamento</span>
            <SearchableSelect
              value={equipmentId}
              options={(data?.filters.equipments ?? []).map((item) => ({
                value: item.id,
                label: item.label
              }))}
              placeholder="Buscar equipamento"
              onChange={(value) => {
                setEquipmentId(value);
                if (!value) {
                  return;
                }

                void loadDashboard(year, selectedMonths, value);
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
                void loadDashboard(nextYear, selectedMonths, equipmentId);
              }}
            >
              {(data?.filters.availableYears ?? [year]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="fleet-period-badge">
            <strong>Equipamento ativo</strong>
            <span>{data?.selectedEquipment?.placaOuTag ?? "Nenhum equipamento"}</span>
          </div>
        </div>

        <div className="billing-month-filter fleet-monthly-month-filter">
          <div className="billing-month-filter-copy">
            <strong>Meses do grafico</strong>
            <span>
              A media mensal considera apenas os meses selecionados para o equipamento escolhido.
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
          <strong>Nenhum equipamento com medicao encontrado</strong>
          <p>Nao existe historico mensal disponivel para os filtros atuais.</p>
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
                {data?.summary.totalItensPeriodo ?? 0} item(ns) vinculados ao equipamento.
              </p>
            </article>
            <article className="fleet-summary-card fleet-summary-card-info">
              <span className="fleet-card-label">Media mensal</span>
              <strong className="fleet-card-value">
                {formatCurrency(data?.summary.mediaMensal ?? 0)}
              </strong>
              <p className="fleet-card-copy">
                Media em {data?.summary.monthsConsidered ?? 0} mes(es) selecionados.
              </p>
            </article>
            <article className="fleet-summary-card fleet-summary-card-warn">
              <span className="fleet-card-label">Media por dia com producao</span>
              <strong className="fleet-card-value">
                {formatCurrency(data?.summary.mediaPorDia ?? 0)}
              </strong>
              <p className="fleet-card-copy">
                {data?.summary.totalDiasPeriodo ?? 0} dia(s) com valor registrado.
              </p>
            </article>
            <article className="fleet-summary-card fleet-summary-card-danger">
              <span className="fleet-card-label">Melhor mes</span>
              <strong className="fleet-card-value">
                {data?.summary.melhorMes.label ?? "-"}
              </strong>
              <p className="fleet-card-copy">
                {formatCurrency(data?.summary.melhorMes.totalValor ?? 0)} em{" "}
                {data?.summary.melhorMes.totalMedicoes ?? 0} medicao(oes).
              </p>
            </article>
          </section>

          <section className="fleet-monthly-chart-grid fade-up fade-up-delay-2">
            <article className="fleet-chart-card surface section-card">
              {!hasMeasuredValue ? (
                <div className="fleet-empty-state">
                  <strong>Sem faturamento no recorte</strong>
                  <p>O equipamento selecionado nao possui valor medido nos meses filtrados.</p>
                </div>
              ) : (
                <div className="fleet-monthly-chart-panel">
                  <div className="fleet-chart-header">
                    <div className="fleet-monthly-chart-copy">
                      <span className="fleet-kicker">
                        {data?.selectedEquipment?.tipoRecurso === "CAMINHAO"
                          ? "Caminhao"
                          : "Maquina"}
                      </span>
                      <h2 className="section-title">
                        {data?.selectedEquipment?.placaOuTag} - {data?.selectedEquipment?.descricao}
                      </h2>
                    </div>
                    <span className="badge badge-info">
                      {data?.summary.totalMedicoesPeriodo ?? 0} medicao(oes)
                    </span>
                  </div>

                  <div className="fleet-monthly-legend">
                    <span className="fleet-monthly-legend-item">
                      <i className="fleet-monthly-dot is-total" />
                      Faturamento do mes
                    </span>
                    <span className="fleet-monthly-legend-item">
                      <i className="fleet-monthly-dot is-average" />
                      Media mensal
                    </span>
                  </div>

                  <div className="fleet-chart-shell fleet-monthly-chart-shell">
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
                          content={<CustomTooltip />}
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
                          stroke="#1D4ED8"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, fill: "#1D4ED8" }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </article>

            <aside className="fleet-ranking-card surface section-card fleet-monthly-side-panel">
              <div className="fleet-ranking-header">
                <div>
                  <span className="fleet-kicker">Leitura mensal</span>
                  <h2 className="section-title">Resumo do equipamento</h2>
                </div>
                <span className="badge badge-info">{monthlyRows.length} mes(es)</span>
              </div>

              <div className="fleet-monthly-info-grid">
                <article className="fleet-section-card">
                  <span className="fleet-card-label">Tipo de recurso</span>
                  <strong className="fleet-section-value">
                    {data?.selectedEquipment?.tipoRecurso === "CAMINHAO" ? "Caminhao" : "Maquina"}
                  </strong>
                  <small>{data?.selectedEquipment?.descricao ?? "-"}</small>
                </article>
                <article className="fleet-section-card">
                  <span className="fleet-card-label">Dias com producao</span>
                  <strong className="fleet-section-value">{data?.summary.totalDiasPeriodo ?? 0}</strong>
                  <small>Base para a media diaria do equipamento.</small>
                </article>
              </div>

              {!hasMeasuredValue ? (
                <div className="fleet-empty-state fleet-empty-state-compact">
                  <strong>Sem meses para ranquear</strong>
                  <p>Selecione outro equipamento ou amplie o recorte.</p>
                </div>
              ) : (
                <div className="fleet-ranking-list">
                  {[...monthlyRows]
                    .filter((item) => item.totalValor > 0 || item.totalMedicoes > 0)
                    .sort((a, b) => b.totalValor - a.totalValor)
                    .map((item, index) => (
                      <article key={item.monthNumber} className="fleet-ranking-item">
                        <div className="fleet-ranking-rank">
                          #{String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="fleet-ranking-copy">
                          <strong>{item.label}</strong>
                          <span>{item.totalMedicoes} medicao(oes) no mes</span>
                        </div>
                        <div className="fleet-ranking-metrics">
                          <strong>{formatCurrency(item.totalValor)}</strong>
                          <div className="fleet-ranking-chips">
                            <span className="fleet-ranking-chip">{item.totalItens} item(ns)</span>
                            <span className="fleet-ranking-chip">{item.diasComProducao} dia(s)</span>
                            <span className="fleet-ranking-chip">
                              {item.totalValor >= (data?.summary.mediaMensal ?? 0)
                                ? "Acima da media"
                                : "Abaixo da media"}
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
