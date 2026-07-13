"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableMultiSelect } from "@/components/form/searchable-multi-select";
import { ExpandableChart } from "@/components/dashboard/expandable-chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatDateDisplay, formatDateInputValue } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatters";

type PeriodPreset = "current_month" | "previous_month" | "last_3_months" | "current_year" | "custom";
type CategoriaCusto = "MANUTENCAO" | "COMBUSTIVEL" | "OPERACIONAL" | "ADMINISTRATIVO" | "NAO_INFORMADO";
type TipoCompraFiltro = "TODOS" | "PRODUTO" | "SERVICO" | "MISTA";

type Option = {
  id: string;
  label: string;
  status?: string;
};

type RankingRow = {
  id?: string | null;
  nome: string;
  total: number;
  count: number;
  sharePercent: number;
};

type CentroCustoRow = RankingRow & {
  manutencao: number;
  combustivel: number;
  litrosDiesel: number;
};

type EquipamentoRow = {
  equipamentoId: string | null;
  nome: string;
  tipoControle: string | null;
  total: number;
  manutencao: number;
  combustivel: number;
  litrosDiesel: number;
  ordens: number;
  fornecedores: string[];
  horasReferencia: number;
  cargasReferencia: number;
  custoPorHora: number | null;
};

type DashboardPayload = {
  period: {
    preset: PeriodPreset;
    start: string;
    end: string;
    label: string;
  };
  filters: {
    fornecedorIds: string[];
    centroCustoIds: string[];
    equipamentoIds: string[];
    planoContaIds: string[];
    categoria: CategoriaCusto | "TODOS";
    tipoCompra: TipoCompraFiltro;
    fornecedores: Option[];
    centrosCusto: Option[];
    equipamentos: Array<Option & { tipoRecurso: string }>;
    planosConta: Array<Option & { categoria: string | null }>;
  };
  summary: {
    totalCusto: number;
    totalAnterior: number;
    variacaoPercentual: number;
    totalManutencao: number;
    totalCombustivel: number;
    custoMedioPorEquipamento: number;
    custoSemEquipamento: number;
    totalEquipamentosVinculados: number;
    totalOrdens: number;
    totalItens: number;
    equipamentoMaisCaro: { nome: string; total: number } | null;
    fornecedorPrincipal: { nome: string; total: number } | null;
    centroCustoPrincipal: { nome: string; total: number } | null;
  };
  charts: {
    categorias: Array<{
      categoria: CategoriaCusto;
      label: string;
      total: number;
      count: number;
      sharePercent: number;
    }>;
    equipamentos: EquipamentoRow[];
    centrosCusto: CentroCustoRow[];
    fornecedores: Array<RankingRow & { status: string }>;
    planosConta: RankingRow[];
    mensal: Array<{
      key: string;
      label: string;
      total: number;
      manutencao: number;
      combustivel: number;
      operacional: number;
      administrativo: number;
      count: number;
    }>;
    pareto: Array<{
      motivo: string;
      categoria: CategoriaCusto;
      categoriaLabel: string;
      total: number;
      count: number;
      sharePercent: number;
      cumulativePercent: number;
    }>;
  };
  details: Array<{
    numeroOrdem: string;
    dataEmissao: string;
    tipoCompra: string;
    fornecedorNome: string;
    centroCustoNome: string;
    equipamentoNome: string;
    planoContaNome: string;
    categoriaLabel: string;
    subcategoria: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    subtotal: number;
  }>;
};

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "current_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "last_3_months", label: "Ultimos 3 meses" },
  { value: "current_year", label: "Ano atual" },
  { value: "custom", label: "Personalizado" }
];

const categoryOptions: Array<{ value: CategoriaCusto | "TODOS"; label: string }> = [
  { value: "TODOS", label: "Todas as categorias" },
  { value: "MANUTENCAO", label: "Manutencao" },
  { value: "COMBUSTIVEL", label: "Combustivel" },
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "NAO_INFORMADO", label: "Nao informado" }
];

const categoryColors: Record<CategoriaCusto, string> = {
  MANUTENCAO: "#EF4444",
  COMBUSTIVEL: "#38BDF8",
  OPERACIONAL: "#F97316",
  ADMINISTRATIVO: "#8B5CF6",
  NAO_INFORMADO: "#94A3B8"
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,0%";
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function formatLiters(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} L`;
}

function toInputDate(date: Date) {
  return formatDateInputValue(date);
}

function escapeCsv(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function MoneyTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="cost-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={`${item.name}-${item.color}`}>
          {item.name}: {formatCurrency(Number(item.value ?? 0))}
        </span>
      ))}
    </div>
  );
}

function EquipmentCostTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: CentroCustoRow & { nomeCurto: string; totalRanking: number };
  }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !payload?.length || !row) return null;

  return (
    <div className="cost-tooltip cost-equipment-tooltip">
      <strong>{row.nome}</strong>
      <span>Total no ranking: {formatCurrency(row.totalRanking)}</span>
      <span>Combustivel: {formatCurrency(row.combustivel)}</span>
      <span>Manutencao: {formatCurrency(row.manutencao)}</span>
      <b>{formatLiters(row.litrosDiesel)} de diesel</b>
    </div>
  );
}

function CenterCostAxisTick({
  x = 0,
  y = 0,
  payload,
  rows
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value?: string };
  rows: Array<CentroCustoRow & { nomeCurto: string; totalRanking: number }>;
}) {
  const row = rows.find((item) => item.nome === payload?.value);
  if (!row) return null;

  return (
    <g transform={`translate(${Number(x)},${Number(y)})`}>
      <text textAnchor="middle">
        <tspan x="0" dy="18" fill="var(--screen-chart-tick)" fontSize="14" fontWeight="850">
          {row.nomeCurto}
        </tspan>
        <tspan x="0" dy="20" fill="#38bdf8" fontSize="13" fontWeight="900">
          {formatLiters(row.litrosDiesel)} diesel
        </tspan>
      </text>
    </g>
  );
}

function DashboardSkeleton() {
  return (
    <main className="cost-dashboard">
      <section className="cost-hero surface section-card cost-skeleton" />
      <section className="cost-kpi-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <article key={index} className="cost-kpi-card cost-skeleton" />
        ))}
      </section>
      <section className="cost-layout-grid">
        <article className="surface section-card cost-skeleton" />
        <article className="surface section-card cost-skeleton" />
      </section>
    </main>
  );
}

function KpiCard(props: {
  label: string;
  value: string;
  helper: string;
  tone?: "orange" | "blue" | "red" | "green" | "purple";
}) {
  return (
    <article className={`cost-kpi-card cost-kpi-${props.tone ?? "orange"}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.helper}</small>
    </article>
  );
}

export function CustosDashboard() {
  const [period, setPeriod] = useState<PeriodPreset>("current_month");
  const [customStart, setCustomStart] = useState(() => toInputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));
  const [fornecedorIds, setFornecedorIds] = useState<string[]>([]);
  const [centroCustoIds, setCentroCustoIds] = useState<string[]>([]);
  const [planoContaIds, setPlanoContaIds] = useState<string[]>([]);
  const [categoria, setCategoria] = useState<CategoriaCusto | "TODOS">("TODOS");
  const [tipoCompra, setTipoCompra] = useState<TipoCompraFiltro>("TODOS");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(
    nextPeriod = period,
    overrides?: Partial<{
      fornecedorIds: string[];
      centroCustoIds: string[];
      planoContaIds: string[];
      categoria: CategoriaCusto | "TODOS";
      tipoCompra: TipoCompraFiltro;
      customStart: string;
      customEnd: string;
    }>
  ) {
    setLoading(true);
    setError("");

    try {
      const activeFornecedorIds = overrides?.fornecedorIds ?? fornecedorIds;
      const activeCentroCustoIds = overrides?.centroCustoIds ?? centroCustoIds;
      const activePlanoContaIds = overrides?.planoContaIds ?? planoContaIds;
      const activeCategoria = overrides?.categoria ?? categoria;
      const activeTipoCompra = overrides?.tipoCompra ?? tipoCompra;
      const activeCustomStart = overrides?.customStart ?? customStart;
      const activeCustomEnd = overrides?.customEnd ?? customEnd;
      const params = new URLSearchParams({ period: nextPeriod });

      if (nextPeriod === "custom") {
        params.set("start", activeCustomStart);
        params.set("end", activeCustomEnd);
      }

      if (activeFornecedorIds.length) params.set("fornecedorIds", activeFornecedorIds.join(","));
      if (activeCentroCustoIds.length) params.set("centroCustoIds", activeCentroCustoIds.join(","));
      if (activePlanoContaIds.length) params.set("planoContaIds", activePlanoContaIds.join(","));
      if (activeCategoria !== "TODOS") params.set("categoria", activeCategoria);
      if (activeTipoCompra !== "TODOS") params.set("tipoCompra", activeTipoCompra);

      const response = await fetch(`/api/dashboard/custos?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar a dashboard de custos.");
        setData(null);
        return;
      }

      setData(payload);
    } catch {
      setError("Nao foi possivel carregar a dashboard de custos.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard("current_month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasData = (data?.summary.totalCusto ?? 0) > 0;
  const topFornecedores = useMemo(() => (data?.charts.fornecedores ?? []).slice(0, 8), [data]);
  const centrosCusto = useMemo(() => data?.charts.centrosCusto ?? [], [data]);
  const topCentros = useMemo(() => centrosCusto.slice(0, 8), [centrosCusto]);
  const topPareto = useMemo(() => (data?.charts.pareto ?? []).slice(0, 8), [data]);
  const manutencaoCombustivel = useMemo(
    () => [
      { label: "Manutencao", total: data?.summary.totalManutencao ?? 0, fill: categoryColors.MANUTENCAO },
      { label: "Combustivel", total: data?.summary.totalCombustivel ?? 0, fill: categoryColors.COMBUSTIVEL }
    ],
    [data]
  );

  function handleApply() {
    void loadDashboard(period);
  }

  function handleReset() {
    setPeriod("current_month");
    setFornecedorIds([]);
    setCentroCustoIds([]);
    setPlanoContaIds([]);
    setCategoria("TODOS");
    setTipoCompra("TODOS");
    void loadDashboard("current_month", {
      fornecedorIds: [],
      centroCustoIds: [],
      planoContaIds: [],
      categoria: "TODOS",
      tipoCompra: "TODOS"
    });
  }

  function exportDetails() {
    const rows = [
      [
        "Ordem",
        "Emissao",
        "Fornecedor",
        "Centro de custo",
        "Equipamento",
        "Plano de conta",
        "Categoria",
        "Subcategoria",
        "Item",
        "Quantidade",
        "Valor unitario",
        "Subtotal"
      ],
      ...(data?.details ?? []).map((item) => [
        item.numeroOrdem,
        formatDateDisplay(item.dataEmissao),
        item.fornecedorNome,
        item.centroCustoNome,
        item.equipamentoNome,
        item.planoContaNome,
        item.categoriaLabel,
        item.subcategoria,
        item.descricao,
        item.quantidade,
        item.valorUnitario,
        item.subtotal
      ])
    ];

    downloadCsv("dashboard-custos-detalhado.csv", rows);
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="cost-dashboard">
      <section className="cost-hero surface section-card fade-up">
        <div>
          <span className="cost-kicker">Custos da frota</span>
          <h1 className="page-title">Controle executivo de gastos operacionais</h1>
          <p className="page-copy">
            Analise ordens de compra por equipamento, centro de custo, fornecedor e categoria para
            entender onde o dinheiro esta sendo consumido no periodo.
          </p>
        </div>

        <div className="cost-hero-actions">
          <span className="cost-period-badge">
            <strong>{data?.period.label ?? "Periodo atual"}</strong>
            <small>{data ? `${data.summary.totalOrdens} ordem(ns) | ${data.summary.totalItens} item(ns)` : "Sem dados"}</small>
          </span>
          <button type="button" className="button-secondary" onClick={() => window.print()}>
            PDF / imprimir
          </button>
          <button type="button" className="button-primary" onClick={exportDetails} disabled={!data?.details.length}>
            Excel detalhado
          </button>
        </div>
      </section>

      <section className="cost-filter-card surface section-card fade-up fade-up-delay-1">
        <div className="cost-filter-grid">
          <label className="field">
            <span className="field-label">Periodo</span>
            <select
              className="field-control"
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodPreset)}
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {period === "custom" ? (
            <>
              <label className="field">
                <span className="field-label">Data inicial</span>
                <input className="field-control" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">Data final</span>
                <input className="field-control" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </label>
            </>
          ) : null}
          <label className="field">
            <span className="field-label">Categoria</span>
            <select
              className="field-control"
              value={categoria}
              onChange={(event) => setCategoria(event.target.value as CategoriaCusto | "TODOS")}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Tipo da compra</span>
            <select
              className="field-control"
              value={tipoCompra}
              onChange={(event) => setTipoCompra(event.target.value as TipoCompraFiltro)}
            >
              <option value="TODOS">Produtos e servicos</option>
              <option value="PRODUTO">Produto</option>
              <option value="SERVICO">Servico</option>
              <option value="MISTA">Mista</option>
            </select>
          </label>
        </div>

        <div className="cost-filter-grid cost-filter-grid-wide">
          <label className="field">
            <span className="field-label">Fornecedor</span>
            <SearchableMultiSelect
              values={fornecedorIds}
              options={(data?.filters.fornecedores ?? []).map((item) => ({ value: item.id, label: item.label }))}
              placeholder="Buscar fornecedores"
              onChange={setFornecedorIds}
            />
          </label>
          <label className="field">
            <span className="field-label">Centro de custo</span>
            <SearchableMultiSelect
              values={centroCustoIds}
              options={(data?.filters.centrosCusto ?? []).map((item) => ({ value: item.id, label: item.label }))}
              placeholder="Buscar centros de custo"
              onChange={setCentroCustoIds}
            />
          </label>
          <label className="field">
            <span className="field-label">Plano de conta</span>
            <SearchableMultiSelect
              values={planoContaIds}
              options={(data?.filters.planosConta ?? []).map((item) => ({ value: item.id, label: item.label }))}
              placeholder="Buscar planos"
              onChange={setPlanoContaIds}
            />
          </label>
        </div>

        <div className="toolbar-actions">
          <button type="button" className="button-primary" onClick={handleApply} disabled={loading}>
            {loading ? "Carregando..." : "Aplicar filtros"}
          </button>
          <button type="button" className="button-secondary" onClick={handleReset}>
            Limpar filtros
          </button>
        </div>
      </section>

      {error ? (
        <section className="surface section-card">
          <p className="message-inline message-inline-danger">{error}</p>
        </section>
      ) : null}

      <section className="cost-kpi-grid fade-up fade-up-delay-2">
        <KpiCard label="Custo total" value={formatCurrency(data?.summary.totalCusto ?? 0)} helper={`Periodo anterior: ${formatCurrency(data?.summary.totalAnterior ?? 0)} | ${formatPercent(data?.summary.variacaoPercentual ?? 0)}`} tone="orange" />
        <KpiCard label="Manutencao" value={formatCurrency(data?.summary.totalManutencao ?? 0)} helper="Pecas, servicos e revisoes." tone="red" />
        <KpiCard label="Combustivel" value={formatCurrency(data?.summary.totalCombustivel ?? 0)} helper="Diesel, Arla e abastecimentos." tone="blue" />
        <KpiCard label="Media por equipamento" value={formatCurrency(data?.summary.custoMedioPorEquipamento ?? 0)} helper={`${data?.summary.totalEquipamentosVinculados ?? 0} equipamento(s) vinculado(s).`} tone="green" />
        <KpiCard label="Equipamento mais caro" value={data?.summary.equipamentoMaisCaro?.nome ?? "-"} helper={formatCurrency(data?.summary.equipamentoMaisCaro?.total ?? 0)} tone="purple" />
        <KpiCard label="Maior fornecedor" value={data?.summary.fornecedorPrincipal?.nome ?? "-"} helper={formatCurrency(data?.summary.fornecedorPrincipal?.total ?? 0)} tone="blue" />
        <KpiCard label="Centro principal" value={data?.summary.centroCustoPrincipal?.nome ?? "-"} helper={formatCurrency(data?.summary.centroCustoPrincipal?.total ?? 0)} tone="green" />
        <KpiCard label="Itens analisados" value={String(data?.summary.totalItens ?? 0)} helper={`${data?.summary.totalOrdens ?? 0} ordem(ns) de compra`} tone="orange" />
      </section>

      {!hasData ? (
        <section className="surface section-card cost-empty-state">
          <strong>Sem dados para o periodo selecionado</strong>
          <p>Nao ha ordens de compra validas para os filtros aplicados. Ajuste a janela ou limpe os filtros.</p>
        </section>
      ) : (
        <>
          <section className="cost-layout-grid fade-up fade-up-delay-3">
            <article className="surface section-card cost-chart-card">
              <div className="cost-card-header">
                <div>
                  <span className="cost-kicker">Categorias</span>
                  <h2 className="section-title">Custo por categoria</h2>
                </div>
              </div>
              <ExpandableChart title="Custo por categoria" height={320}>
                {({ height, width }) => (
                  <ResponsiveContainer width={width} height={height}>
                    <PieChart>
                      <Pie data={data?.charts.categorias ?? []} dataKey="total" nameKey="label" innerRadius={72} outerRadius={120} paddingAngle={3}>
                        {(data?.charts.categorias ?? []).map((item) => (
                          <Cell key={item.categoria} fill={categoryColors[item.categoria]} />
                        ))}
                      </Pie>
                      <Tooltip content={<MoneyTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ExpandableChart>
              <div className="cost-category-list">
                {(data?.charts.categorias ?? []).map((item) => (
                  <span key={item.categoria}>
                    <i style={{ background: categoryColors[item.categoria] }} />
                    {item.label}: {formatCurrency(item.total)} ({formatPercent(item.sharePercent)})
                  </span>
                ))}
              </div>
            </article>

            <article className="surface section-card cost-chart-card">
              <div className="cost-card-header">
                <div>
                  <span className="cost-kicker">Evolucao</span>
                  <h2 className="section-title">Custos por mes</h2>
                </div>
              </div>
              <ExpandableChart title="Custos por mes" height={340}>
                {({ height, width }) => (
                  <ResponsiveContainer width={width} height={height}>
                    <LineChart data={data?.charts.mensal ?? []} margin={{ top: 16, right: 20, left: 8, bottom: 10 }}>
                      <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value).replace(",00", "")} tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} width={110} />
                      <Tooltip content={<MoneyTooltip />} />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#F97316" strokeWidth={3} dot={{ r: 4, fill: "#F97316" }} />
                      <Line type="monotone" dataKey="manutencao" name="Manutencao" stroke={categoryColors.MANUTENCAO} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="combustivel" name="Combustivel" stroke={categoryColors.COMBUSTIVEL} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ExpandableChart>
            </article>
          </section>

          <section className="cost-wide-grid fade-up fade-up-delay-3">
            <EquipmentCostChartPanel rows={centrosCusto} />

            <article className="surface section-card cost-chart-card">
              <div className="cost-card-header">
                <div>
                  <span className="cost-kicker">Comparativo</span>
                  <h2 className="section-title">Manutencao x combustivel</h2>
                </div>
              </div>
              <ExpandableChart title="Manutencao x combustivel" height={220}>
                {({ height, width }) => (
                  <ResponsiveContainer width={width} height={height}>
                    <BarChart data={manutencaoCombustivel} margin={{ top: 16, right: 18, left: 8, bottom: 8 }}>
                      <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                      <YAxis tickFormatter={(value) => formatCurrency(value).replace(",00", "")} tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                      <Tooltip content={<MoneyTooltip />} />
                      <Bar dataKey="total" name="Total" radius={[12, 12, 0, 0]}>
                        {manutencaoCombustivel.map((item) => (
                          <Cell key={item.label} fill={item.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ExpandableChart>
            </article>
          </section>

          <section className="cost-list-grid fade-up fade-up-delay-3">
            <RankingPanel title="Fornecedores com maior despesa" kicker="Fornecedores" rows={topFornecedores} />
            <CenterCostPanel rows={topCentros} />
            <ParetoPanel rows={topPareto} />
          </section>
        </>
      )}
    </main>
  );
}

function EquipmentCostChartPanel({ rows }: { rows: CentroCustoRow[] }) {
  const [hiddenCenterIds, setHiddenCenterIds] = useState<string[]>([]);
  const getRowId = (item: CentroCustoRow) => item.id ?? item.nome;
  const availableIds = useMemo(() => new Set(rows.map((item) => item.id ?? item.nome)), [rows]);
  const effectiveHiddenIds = useMemo(
    () => hiddenCenterIds.filter((id) => availableIds.has(id)),
    [availableIds, hiddenCenterIds]
  );
  const chartRows = rows
    .filter((item) => !effectiveHiddenIds.includes(getRowId(item)))
    .filter((item) => item.combustivel > 0 || item.manutencao > 0 || item.litrosDiesel > 0)
    .map((item) => ({
      ...item,
      totalRanking: item.combustivel + item.manutencao,
      nomeCurto: item.nome.length > 16 ? `${item.nome.slice(0, 16)}...` : item.nome
    }))
    .sort((a, b) => b.totalRanking - a.totalRanking);
  const chartMinWidth = Math.max(820, chartRows.length * 128);
  const visibleTotal = chartRows.reduce((total, item) => total + item.totalRanking, 0);
  const visibleLitrosDiesel = chartRows.reduce((total, item) => total + item.litrosDiesel, 0);

  function toggleCenter(centroId: string) {
    setHiddenCenterIds((current) =>
      current.includes(centroId)
        ? current.filter((id) => id !== centroId)
        : [...current, centroId]
    );
  }

  return (
    <article className="surface section-card cost-chart-card">
      <div className="cost-card-header">
        <div>
          <span className="cost-kicker">Centros de custo</span>
          <h2 className="section-title">Ranking de custo por centro de custo</h2>
        </div>
        <div className="cost-equipment-visible-metrics">
          <span className="cost-equipment-visible-cost">
            <small>Custo exibido</small>
            <strong className="cost-equipment-visible-total">{formatCurrency(visibleTotal)}</strong>
          </span>
          <span className="cost-diesel-volume">
            <small>Diesel no periodo</small>
            <strong>{formatLiters(visibleLitrosDiesel)}</strong>
          </span>
        </div>
      </div>

      {rows.length > 0 ? (
        <details className="cost-equipment-visibility">
          <summary>
            Centros de custo exibidos: {chartRows.length} de {rows.length}
          </summary>
          <div className="cost-equipment-visibility-list">
            {rows.map((item) => (
              <label key={getRowId(item)}>
                <input
                  type="checkbox"
                  checked={!effectiveHiddenIds.includes(getRowId(item))}
                  onChange={() => toggleCenter(getRowId(item))}
                />
                <span>{item.nome}</span>
                <small>{formatLiters(item.litrosDiesel)} diesel</small>
              </label>
            ))}
            {effectiveHiddenIds.length > 0 ? (
              <button type="button" onClick={() => setHiddenCenterIds([])}>
                Exibir todos
              </button>
            ) : null}
          </div>
        </details>
      ) : null}

      {chartRows.length === 0 ? (
        <div className="cost-empty-state cost-empty-state-compact">
          <strong>Sem custos por centro de custo no periodo</strong>
          <p>Os filtros aplicados ou a selecao de exibicao nao possuem centros com combustivel ou manutencao.</p>
        </div>
      ) : (
        <div className="cost-center-chart cost-center-chart-vertical">
          <div className="cost-center-chart-legend">
            <span><i style={{ background: categoryColors.COMBUSTIVEL }} /> Combustivel</span>
            <span><i style={{ background: categoryColors.MANUTENCAO }} /> Manutencao</span>
          </div>
          <ExpandableChart title="Ranking de custo por centro de custo" height={380}>
            {({ height, width }) => (
              <div className="cost-chart-scroll">
                <div
                  className="cost-chart-scroll-inner"
                  style={{
                    minWidth: chartMinWidth,
                    width: typeof width === "number" ? Math.max(width, chartMinWidth) : width,
                    height
                  }}
                >
                  <ResponsiveContainer width={typeof width === "number" ? Math.max(width, chartMinWidth) : width} height={height}>
                    <BarChart data={chartRows} margin={{ top: 36, right: 24, left: 12, bottom: 76 }} barCategoryGap={14}>
                      <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                      <XAxis
                        dataKey="nome"
                        interval={0}
                        height={68}
                        tick={(props) => <CenterCostAxisTick {...props} rows={chartRows} />}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
                        tick={{ fill: "var(--screen-chart-tick)", fontSize: 14, fontWeight: 800 }}
                        tickLine={false}
                        axisLine={false}
                        width={112}
                      />
                      <Tooltip content={<EquipmentCostTooltip />} />
                      <Bar dataKey="combustivel" name="Combustivel" stackId="centro" fill={categoryColors.COMBUSTIVEL} radius={[0, 0, 0, 0]} maxBarSize={34} />
                      <Bar dataKey="manutencao" name="Manutencao" stackId="centro" fill={categoryColors.MANUTENCAO} radius={[10, 10, 0, 0]} maxBarSize={34}>
                        <LabelList
                          dataKey="totalRanking"
                          position="top"
                          formatter={(value) => formatCurrency(Number(value))}
                          fill="var(--screen-chart-tick)"
                          fontSize={13}
                          fontWeight={850}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </ExpandableChart>
        </div>
      )}
    </article>
  );
}

function CenterCostPanel({ rows }: { rows: CentroCustoRow[] }) {
  return (
    <article className="surface section-card cost-ranking-panel cost-center-panel">
      <span className="cost-kicker">Centro de custo</span>
      <h2 className="section-title">Centros de custo mais pesados</h2>

      <div className="cost-ranking-list">
        {rows.length === 0 ? (
          <p className="section-copy">Sem dados para o periodo selecionado.</p>
        ) : (
          rows.map((item, index) => (
            <div key={`${item.nome}-${index}`} className="cost-ranking-row">
              <span>#{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.nome}</strong>
                <small>{item.count} item(ns) | {formatPercent(item.sharePercent)}</small>
              </div>
              <b>{formatCurrency(item.total)}</b>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function RankingPanel({ title, kicker, rows }: { title: string; kicker: string; rows: RankingRow[] }) {
  return (
    <article className="surface section-card cost-ranking-panel">
      <span className="cost-kicker">{kicker}</span>
      <h2 className="section-title">{title}</h2>
      <div className="cost-ranking-list">
        {rows.length === 0 ? (
          <p className="section-copy">Sem dados para o periodo selecionado.</p>
        ) : (
          rows.map((item, index) => (
            <div key={`${item.nome}-${index}`} className="cost-ranking-row">
              <span>#{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.nome}</strong>
                <small>{item.count} item(ns) | {formatPercent(item.sharePercent)}</small>
              </div>
              <b>{formatCurrency(item.total)}</b>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function ParetoPanel({
  rows
}: {
  rows: DashboardPayload["charts"]["pareto"];
}) {
  return (
    <article className="surface section-card cost-ranking-panel">
      <span className="cost-kicker">Pareto</span>
      <h2 className="section-title">Motivos que concentram custo</h2>
      <div className="cost-ranking-list">
        {rows.length === 0 ? (
          <p className="section-copy">Sem despesas classificadas no periodo.</p>
        ) : (
          rows.map((item, index) => (
            <div key={`${item.motivo}-${index}`} className="cost-ranking-row">
              <span>#{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.motivo}</strong>
                <small>{item.categoriaLabel} | acumulado {formatPercent(item.cumulativePercent)}</small>
              </div>
              <b>{formatCurrency(item.total)}</b>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
