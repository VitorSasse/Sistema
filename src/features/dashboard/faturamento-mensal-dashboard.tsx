"use client";

import { useEffect, useMemo, useState } from "react";
import { ExpandableChart } from "@/components/dashboard/expandable-chart";
import {
  Bar,
  BarChart,
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
    availableYears: number[];
    selectedMonths: number[];
    availableMonths: Array<{
      monthNumber: number;
      label: string;
    }>;
  };
  summary: {
    totalFaturadoAno: number;
    totalAFaturarAno: number;
    totalGeralAno: number;
    mediaMensal: number;
    totalMedicoes: number;
    totalMedicoesConcluidas: number;
    totalMedicoesAFaturar: number;
    monthsConsidered: number;
    melhorMes: {
      label: string;
      totalFaturado: number;
      totalAFaturar: number;
      totalGeral: number;
      totalMedicoes: number;
    };
  };
  monthly: Array<{
    monthNumber: number;
    label: string;
    totalFaturado: number;
    totalAFaturar: number;
    totalGeral: number;
    totalMedicoes: number;
    totalMedicoesConcluidas: number;
    totalMedicoesAFaturar: number;
    mediaMensal: number;
  }>;
  clientComparison: {
    clients: Array<{
      id: string;
      nome: string;
      nomeFantasia: string | null;
      codigo: string;
      totalPeriodo: number;
    }>;
    works: Array<{
      id: string;
      nome: string;
      codigo: string;
      clienteId: string;
      clienteNome: string;
      clienteNomeFantasia: string | null;
      totalPeriodo: number;
    }>;
    monthly: Array<{
      monthNumber: number;
      label: string;
      values: Record<string, number>;
      workValues: Record<string, number>;
    }>;
  };
};

const allMonthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);
const clientChartPalette = [
  "#f97316",
  "#38bdf8",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f59e0b",
  "#60a5fa",
  "#fb7185",
  "#84cc16",
  "#c084fc"
];

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
    <div className="billing-tooltip">
      <strong>{item.label}</strong>
      <span>Faturado: {formatCurrency(item.totalFaturado)}</span>
      <span>A faturar: {formatCurrency(item.totalAFaturar)}</span>
      <span>Total: {formatCurrency(item.totalGeral)}</span>
      <span>Concluidas: {item.totalMedicoesConcluidas}</span>
      <span>A faturar: {item.totalMedicoesAFaturar}</span>
      <span>Media de referencia: {formatCurrency(item.mediaMensal)}</span>
    </div>
  );
}

function ClientComparisonTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number;
    payload?: Record<string, string | number>;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="billing-tooltip billing-client-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <span key={entry.name} className="billing-client-tooltip-row">
          <i style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <b>{formatCurrency(Number(entry.value ?? 0))}</b>
        </span>
      ))}
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

export function FaturamentoMensalDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<number[]>(allMonthNumbers);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [workSearch, setWorkSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [workDropdownOpen, setWorkDropdownOpen] = useState(false);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(nextYear: number, nextMonths: number[]) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/faturamento/mensal?year=${nextYear}&months=${nextMonths.join(",")}`,
        {
          cache: "no-store"
        }
      );

      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar o faturamento mensal.");
        setData(null);
        return;
      }

      setData(payload);
      setYear(payload.period.year);
      setSelectedMonths(payload.filters.selectedMonths);
    } catch {
      setError("Nao foi possivel carregar o faturamento mensal.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard(new Date().getFullYear(), allMonthNumbers);
  }, []);

  const monthlyRows = useMemo(() => data?.monthly ?? [], [data]);
  const hasMonthlyBilling = (data?.summary.totalGeralAno ?? 0) > 0;
  const comparisonClients = useMemo(() => data?.clientComparison.clients ?? [], [data]);
  const comparisonWorks = useMemo(() => data?.clientComparison.works ?? [], [data]);
  const clientColorMap = useMemo(
    () =>
      new Map(
        comparisonClients.map((client, index) => [
          client.id,
          clientChartPalette[index % clientChartPalette.length]
        ])
      ),
    [comparisonClients]
  );
  const selectedClientSet = useMemo(() => new Set(selectedClientIds), [selectedClientIds]);
  const selectedWorkSet = useMemo(() => new Set(selectedWorkIds), [selectedWorkIds]);
  const filteredClientOptions = useMemo(() => {
    const search = clientSearch.trim().toLocaleLowerCase("pt-BR");
    const source = comparisonClients.filter((client) => !selectedClientSet.has(client.id));

    if (!search) {
      return source.slice(0, 18);
    }

    return source.filter((client) =>
      [client.nome, client.nomeFantasia ?? "", client.codigo]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search)
    ).slice(0, 18);
  }, [clientSearch, comparisonClients, selectedClientSet]);
  const selectedClients = useMemo(
    () => comparisonClients.filter((client) => selectedClientIds.includes(client.id)),
    [comparisonClients, selectedClientIds]
  );
  const availableWorkOptions = useMemo(
    () => comparisonWorks.filter((work) => selectedClientSet.has(work.clienteId)),
    [comparisonWorks, selectedClientSet]
  );
  const filteredWorkOptions = useMemo(() => {
    const search = workSearch.trim().toLocaleLowerCase("pt-BR");
    const source = availableWorkOptions.filter((work) => !selectedWorkSet.has(work.id));

    if (!search) {
      return source.slice(0, 18);
    }

    return source.filter((work) =>
      [
        work.nome,
        work.codigo,
        work.clienteNome,
        work.clienteNomeFantasia ?? ""
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search)
    ).slice(0, 18);
  }, [availableWorkOptions, selectedWorkSet, workSearch]);
  const selectedWorks = useMemo(
    () => availableWorkOptions.filter((work) => selectedWorkIds.includes(work.id)),
    [availableWorkOptions, selectedWorkIds]
  );
  const clientComparisonRows = useMemo(() => {
    const monthly = data?.clientComparison.monthly ?? [];
    const hasWorkFilter = selectedWorks.length > 0;

    return monthly.map((month) => {
      const row: Record<string, string | number> = {
        monthNumber: month.monthNumber,
        label: month.label
      };

      selectedClients.forEach((client, index) => {
        row[`client_${index}`] = hasWorkFilter
          ? selectedWorks
              .filter((work) => work.clienteId === client.id)
              .reduce((total, work) => total + (month.workValues[work.id] ?? 0), 0)
          : month.values[client.id] ?? 0;
      });

      return row;
    });
  }, [data, selectedClients, selectedWorks]);
  const clientComparisonMinWidth = Math.max(
    860,
    selectedClients.length * Math.max(clientComparisonRows.length, 1) * 58 + 180
  );

  useEffect(() => {
    const validClientIds = new Set(comparisonClients.map((client) => client.id));

    setSelectedClientIds((current) => current.filter((clientId) => validClientIds.has(clientId)));
  }, [comparisonClients]);

  useEffect(() => {
    const validWorkIds = new Set(availableWorkOptions.map((work) => work.id));

    setSelectedWorkIds((current) => current.filter((workId) => validWorkIds.has(workId)));
  }, [availableWorkOptions]);

  function toggleMonth(monthNumber: number) {
    const nextMonths = selectedMonths.includes(monthNumber)
      ? selectedMonths.filter((item) => item !== monthNumber)
      : [...selectedMonths, monthNumber].sort((a, b) => a - b);

    if (nextMonths.length === 0) {
      return;
    }

    setSelectedMonths(nextMonths);
    void loadDashboard(year, nextMonths);
  }

  function selectAllMonths() {
    setSelectedMonths(allMonthNumbers);
    void loadDashboard(year, allMonthNumbers);
  }

  function toggleClient(clientId: string) {
    const nextClientIds = selectedClientIds.includes(clientId)
      ? selectedClientIds.filter((item) => item !== clientId)
      : [...selectedClientIds, clientId];
    const nextClientSet = new Set(nextClientIds);

    setSelectedClientIds(nextClientIds);
    setSelectedWorkIds((currentWorks) =>
      currentWorks.filter((workId) => {
        const work = comparisonWorks.find((item) => item.id === workId);

        return work ? nextClientSet.has(work.clienteId) : false;
      })
    );
    setClientSearch("");
    setClientDropdownOpen(false);
  }

  function removeSelectedClient(clientId: string) {
    setSelectedClientIds((current) => current.filter((item) => item !== clientId));
    setSelectedWorkIds((current) =>
      current.filter((workId) => comparisonWorks.find((work) => work.id === workId)?.clienteId !== clientId)
    );
  }

  function clearSelectedClients() {
    setSelectedClientIds([]);
    setSelectedWorkIds([]);
    setWorkSearch("");
  }

  function toggleWork(workId: string) {
    setSelectedWorkIds((current) =>
      current.includes(workId)
        ? current.filter((item) => item !== workId)
        : [...current, workId]
    );
    setWorkSearch("");
    setWorkDropdownOpen(false);
  }

  function removeSelectedWork(workId: string) {
    setSelectedWorkIds((current) => current.filter((item) => item !== workId));
  }

  function clearSelectedWorks() {
    setSelectedWorkIds([]);
    setWorkSearch("");
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="billing-dashboard">
      <section className="billing-hero surface section-card fade-up">
        <div className="billing-header-copy">
          <span className="billing-kicker">Faturamento mensal</span>
          <h1 className="page-title">Historico mensal de faturamento</h1>
          <p className="page-copy">
            Evolucao mensal do faturado e do valor ainda a faturar, usando a mesma competencia
            liquida da dashboard financeira principal.
          </p>
        </div>

        <div className="billing-header-controls">
          <label className="field billing-filter-field">
            <span className="field-label">Ano</span>
            <select
              className="field-control"
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                void loadDashboard(nextYear, selectedMonths);
              }}
            >
              {(data?.filters.availableYears ?? [year]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="billing-period-badge">
            <strong>Janela analisada</strong>
            <span>{data?.period.label ?? String(year)}</span>
          </div>
        </div>

        <div className="billing-month-filter">
          <div className="billing-month-filter-copy">
            <strong>Meses do grafico</strong>
            <span>
              A media mensal considera apenas os meses selecionados abaixo.
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

      <section className="billing-summary-grid fade-up fade-up-delay-1">
        <article className="billing-summary-card">
          <span className="billing-summary-label">Faturado no ano</span>
          <strong className="billing-summary-main">
            {formatCurrency(data?.summary.totalFaturadoAno ?? 0)}
          </strong>
          <p className="billing-summary-meta">
            {data?.summary.totalMedicoesConcluidas ?? 0} medicao(oes) concluidas no ano.
          </p>
        </article>
        <article className="billing-summary-card">
          <span className="billing-summary-label">A faturar no ano</span>
          <strong className="billing-summary-main">
            {formatCurrency(data?.summary.totalAFaturarAno ?? 0)}
          </strong>
          <p className="billing-summary-meta">
            {data?.summary.totalMedicoesAFaturar ?? 0} medicao(oes) ainda nao concluidas.
          </p>
        </article>
        <article className="billing-summary-card">
          <span className="billing-summary-label">Media mensal</span>
          <strong className="billing-summary-main">
            {formatCurrency(data?.summary.mediaMensal ?? 0)}
          </strong>
          <p className="billing-summary-meta">
            Media sobre {data?.summary.monthsConsidered ?? 0} mes(es) considerados.
          </p>
        </article>
        <article className="billing-summary-card">
          <span className="billing-summary-label">Melhor mes</span>
          <strong className="billing-summary-main">
            {data?.summary.melhorMes.label ?? "-"}
          </strong>
          <p className="billing-summary-meta">
            {formatCurrency(data?.summary.melhorMes.totalGeral ?? 0)} em{" "}
            {data?.summary.melhorMes.totalMedicoes ?? 0} medicao(oes).
          </p>
        </article>
        <article className="billing-summary-card is-count">
          <span className="billing-summary-label">Faturamento total</span>
          <strong className="billing-summary-main">
            {formatCurrency(data?.summary.totalGeralAno ?? 0)}
          </strong>
          <p className="billing-summary-meta">Faturado somado ao valor ainda a faturar no ano.</p>
        </article>
      </section>

      <section className="billing-grid fade-up fade-up-delay-2">
        <article className="billing-chart-card surface section-card">
          {!hasMonthlyBilling ? (
            <div className="billing-empty-state">
              <strong>Nenhum valor encontrado</strong>
              <p>Nao ha medicoes faturadas ou pendentes para o ano selecionado.</p>
            </div>
          ) : (
            <div className="billing-chart-panel">
              <div className="billing-chart-summary">
                <article className="billing-chart-summary-card is-success">
                  <span>Faturado no ano</span>
                  <strong>{formatCurrency(data?.summary.totalFaturadoAno ?? 0)}</strong>
                  <small>{data?.summary.totalMedicoesConcluidas ?? 0} medicao(oes) concluidas.</small>
                </article>
                <article className="billing-chart-summary-card is-warn">
                  <span>A faturar no ano</span>
                  <strong>{formatCurrency(data?.summary.totalAFaturarAno ?? 0)}</strong>
                  <small>{data?.summary.totalMedicoesAFaturar ?? 0} medicao(oes) pendentes.</small>
                </article>
                <article className="billing-chart-summary-card is-neutral">
                  <span>Media mensal</span>
                  <strong>{formatCurrency(data?.summary.mediaMensal ?? 0)}</strong>
                  <small>Referencia para comparar a curva mensal.</small>
                </article>
                <article className="billing-chart-summary-card is-total">
                  <span>Melhor mes</span>
                  <strong>{data?.summary.melhorMes.label ?? "-"}</strong>
                  <small>{formatCurrency(data?.summary.melhorMes.totalGeral ?? 0)}</small>
                </article>
              </div>

              <div className="billing-chart-legend">
                <span className="billing-chart-legend-item">
                  <i className="billing-chart-dot is-faturado" />
                  Faturado no mes
                </span>
                <span className="billing-chart-legend-item">
                  <i className="billing-chart-dot is-pendente" />
                  A faturar no mes
                </span>
                <span className="billing-chart-legend-item">
                  <i className="billing-chart-dot is-share" />
                  Media mensal
                </span>
              </div>

              <div className="billing-chart-shell">
                <ExpandableChart title="Faturamento mensal" height={420}>
                  {({ height, width }) => (
                    <ResponsiveContainer width={width} height={height}>
                      <ComposedChart data={monthlyRows} margin={{ top: 18, right: 24, left: 8, bottom: 12 }}>
                        <defs>
                          <linearGradient id="billingMonthlyBar" x1="0" y1="0" x2="0" y2="1">
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
                          tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                          tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                          width={110}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--dashboard-chart-cursor)" }} />
                        <Bar
                          dataKey="totalFaturado"
                          stackId="monthly"
                          radius={[0, 0, 0, 0]}
                          fill="url(#billingMonthlyBar)"
                          maxBarSize={48}
                        />
                        <Bar
                          dataKey="totalAFaturar"
                          stackId="monthly"
                          radius={[12, 12, 0, 0]}
                          fill="url(#billingBarPendente)"
                          maxBarSize={48}
                        />
                        <Line
                          type="monotone"
                          dataKey="mediaMensal"
                          stroke="var(--dashboard-chart-line-share)"
                          strokeWidth={3}
                          dot={false}
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
              <span className="billing-kicker">Mes a mes</span>
              <h2 className="section-title">Resumo do ano</h2>
            </div>
            <span className="badge badge-info">{monthlyRows.length} mes(es)</span>
          </div>

          {!hasMonthlyBilling ? (
            <div className="billing-empty-state billing-empty-state-compact">
              <strong>Sem meses com valor</strong>
              <p>Nao ha valores faturados ou pendentes para listar.</p>
            </div>
          ) : (
            <div className="billing-ranking-list">
              {monthlyRows
                .filter((item) => item.totalFaturado > 0 || item.totalMedicoes > 0)
                .sort((a, b) => b.totalGeral - a.totalGeral)
                .map((item, index) => (
                  <article key={item.monthNumber} className="billing-ranking-item">
                    <div className="billing-ranking-rank">#{String(index + 1).padStart(2, "0")}</div>
                    <div className="billing-ranking-copy">
                      <strong>{item.label}</strong>
                      <span>{item.totalMedicoes} medicao(oes) no total</span>
                    </div>
                    <div className="billing-ranking-metrics">
                      <strong>{formatCurrency(item.totalGeral)}</strong>
                      <span>
                        {item.totalFaturado > 0
                          ? `${formatCurrency(item.totalFaturado)} faturado`
                          : "Sem faturado"}
                      </span>
                      <span>
                        {item.totalAFaturar > 0
                          ? `${formatCurrency(item.totalAFaturar)} a faturar`
                          : "Sem pendencia"}
                      </span>
                      <span>
                        {item.totalGeral >= (data?.summary.mediaMensal ?? 0)
                          ? "Acima da media"
                          : "Abaixo da media"}
                      </span>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </aside>
      </section>

      <section className="billing-client-comparison-card surface section-card fade-up fade-up-delay-3">
        <div className="billing-client-comparison-header">
          <div>
            <span className="billing-kicker">Clientes</span>
            <h2 className="section-title">Comparativo de faturamento por cliente</h2>
            <p className="section-copy">
              Compare o faturamento dos clientes nos meses selecionados.
            </p>
          </div>
          <span className="billing-client-count">
            {selectedClients.length} cliente(s) selecionado(s)
          </span>
        </div>

        <div className="billing-comparison-filters">
          <div className="billing-comparison-filter-group">
            <div className="billing-client-selector">
              <div
                className="field billing-client-search billing-multi-search"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setClientDropdownOpen(false);
                  }
                }}
              >
                <label className="field-label" htmlFor="client-comparison-search">
                  Clientes para comparar
                </label>
                <input
                  id="client-comparison-search"
                  className="field-control"
                  value={clientSearch}
                  placeholder="Digite nome, fantasia ou codigo"
                  autoComplete="off"
                  onFocus={() => setClientDropdownOpen(true)}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setClientDropdownOpen(true);
                  }}
                />
                {clientDropdownOpen ? (
                  <div className="billing-client-dropdown">
                    {filteredClientOptions.length === 0 ? (
                      <p className="billing-dropdown-empty">Nenhum cliente encontrado.</p>
                    ) : (
                      filteredClientOptions.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className="billing-client-option"
                          onClick={() => toggleClient(client.id)}
                        >
                          <i style={{ background: clientColorMap.get(client.id) }} />
                          <span>{client.nomeFantasia || client.nome}</span>
                          <small>
                            {client.codigo} - {formatCurrency(client.totalPeriodo)}
                          </small>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="button-ghost"
                disabled={selectedClients.length === 0}
                onClick={clearSelectedClients}
              >
                Limpar selecao
              </button>
            </div>

            {selectedClients.length > 0 ? (
              <div className="billing-selected-clients">
                {selectedClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="billing-selected-client-chip"
                    onClick={() => removeSelectedClient(client.id)}
                    title="Remover cliente"
                  >
                    <i style={{ background: clientColorMap.get(client.id) }} />
                    <span>{client.nomeFantasia || client.nome}</span>
                    <strong>×</strong>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="billing-comparison-filter-group">
            <div className="billing-client-selector">
              <div
                className="field billing-client-search billing-multi-search"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setWorkDropdownOpen(false);
                  }
                }}
              >
                <label className="field-label" htmlFor="work-comparison-search">
                  Obras (opcional)
                </label>
                <input
                  id="work-comparison-search"
                  className="field-control"
                  value={workSearch}
                  placeholder={
                    selectedClients.length === 0
                      ? "Selecione clientes primeiro"
                      : "Digite obra, codigo ou cliente"
                  }
                  autoComplete="off"
                  disabled={selectedClients.length === 0}
                  onFocus={() => {
                    if (selectedClients.length > 0) {
                      setWorkDropdownOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    setWorkSearch(event.target.value);
                    setWorkDropdownOpen(selectedClients.length > 0);
                  }}
                />
                {workDropdownOpen ? (
                  <div className="billing-client-dropdown">
                    {filteredWorkOptions.length === 0 ? (
                      <p className="billing-dropdown-empty">Nenhuma obra encontrada para os clientes selecionados.</p>
                    ) : (
                      filteredWorkOptions.map((work) => (
                        <button
                          key={work.id}
                          type="button"
                          className="billing-client-option"
                          onClick={() => toggleWork(work.id)}
                        >
                          <i style={{ background: clientColorMap.get(work.clienteId) }} />
                          <span>{work.nome}</span>
                          <small>
                            {work.codigo} - {work.clienteNomeFantasia || work.clienteNome}
                          </small>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="button-ghost"
                disabled={selectedWorks.length === 0}
                onClick={clearSelectedWorks}
              >
                Limpar obras
              </button>
            </div>

            {selectedWorks.length > 0 ? (
              <div className="billing-selected-clients">
                {selectedWorks.map((work) => (
                  <button
                    key={work.id}
                    type="button"
                    className="billing-selected-client-chip"
                    onClick={() => removeSelectedWork(work.id)}
                    title="Remover obra"
                  >
                    <i style={{ background: clientColorMap.get(work.clienteId) }} />
                    <span>{work.nome}</span>
                    <strong>×</strong>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {selectedClients.length === 0 ? (
          <div className="billing-empty-state billing-client-empty">
            <strong>Selecione pelo menos um cliente para iniciar a comparação.</strong>
            <p>Use a busca acima para escolher os clientes que deseja comparar mês a mês.</p>
          </div>
        ) : (
          <div className="billing-chart-panel billing-client-chart-panel">
            <div className="billing-chart-legend billing-client-legend">
              {selectedClients.map((client) => (
                <span key={client.id} className="billing-chart-legend-item">
                  <i
                    className="billing-chart-dot"
                    style={{ background: clientColorMap.get(client.id) }}
                  />
                  {client.nomeFantasia || client.nome}
                </span>
              ))}
            </div>

            <div className="billing-client-chart-shell">
              <ExpandableChart title="Comparativo de faturamento por cliente" height={430}>
                {({ height, width, expanded }) => {
                  const resolvedWidth =
                    typeof width === "number" ? width : clientComparisonMinWidth;
                  const chartWidth = expanded
                    ? Math.max(clientComparisonMinWidth, resolvedWidth)
                    : clientComparisonMinWidth;
                  const chartHeight = Math.max(280, height);

                  return (
                    <div className="billing-client-chart-scroll">
                      <div
                        className="billing-client-chart-inner"
                        style={{ width: chartWidth, height: chartHeight }}
                      >
                        <BarChart
                          width={chartWidth}
                          height={chartHeight}
                          data={clientComparisonRows}
                          margin={{ top: 18, right: 28, left: 8, bottom: 36 }}
                          barCategoryGap={18}
                        >
                          <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                            tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }}
                            width={110}
                          />
                          <Tooltip
                            content={<ClientComparisonTooltip />}
                            cursor={{ fill: "var(--dashboard-chart-cursor)" }}
                          />
                          {selectedClients.map((client, index) => (
                            <Bar
                              key={client.id}
                              dataKey={`client_${index}`}
                              name={client.nomeFantasia || client.nome}
                              fill={clientColorMap.get(client.id) ?? clientChartPalette[index % clientChartPalette.length]}
                              radius={[9, 9, 0, 0]}
                              maxBarSize={38}
                            />
                          ))}
                        </BarChart>
                      </div>
                    </div>
                  );
                }}
              </ExpandableChart>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
