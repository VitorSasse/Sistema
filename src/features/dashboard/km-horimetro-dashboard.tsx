"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { SearchableMultiSelect } from "@/components/form/searchable-multi-select";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type PeriodPreset = "today" | "current_week" | "current_month" | "previous_month" | "current_year" | "custom";
type TipoControleFiltro = "TODOS" | "KM" | "HORIMETRO";

type Option = {
  id: string;
  label: string;
  status?: string;
  clienteId?: string;
  tipo?: string;
};

type RankingEquipment = {
  equipamentoId: string | null;
  nome: string;
  tipoControle: string;
  tipoRecurso: string;
  totalKm: number;
  totalHoras: number;
  diasTrabalhados: number;
  obras: number;
  lancamentos: number;
};

type WorksiteRow = {
  obraId: string | null;
  nome: string;
  clienteNome: string;
  totalKm: number;
  totalHoras: number;
  equipamentos: number;
  diasMovimento: number;
  lancamentos: number;
};

type DashboardPayload = {
  period: {
    preset: PeriodPreset;
    start: string;
    end: string;
    label: string;
  };
  filters: {
    equipamentoIds: string[];
    obraIds: string[];
    clienteIds: string[];
    colaboradorIds: string[];
    tipoControle: TipoControleFiltro;
    tipoRecursos: string[];
    equipamentos: Option[];
    obras: Option[];
    clientes: Option[];
    colaboradores: Option[];
  };
  summary: {
    totalKm: number;
    totalHoras: number;
    totalLancamentos: number;
    totalEquipamentos: number;
    totalObras: number;
    totalClientes: number;
    mediaKmDia: number;
    mediaHorasDia: number;
    equipamentoMaiorKm: { nome: string; valor: number } | null;
    equipamentoMaiorHoras: { nome: string; valor: number } | null;
    obraMaisAtiva: { nome: string; totalKm: number; totalHoras: number } | null;
    clientePrincipal: { nome: string; totalKm: number; totalHoras: number } | null;
    inconsistencias: number;
    leiturasSemBase: number;
    calculosPorApontamento: number;
  };
  charts: {
    kmByEquipment: RankingEquipment[];
    hoursByEquipment: RankingEquipment[];
    worksiteUsage: WorksiteRow[];
    daily: Array<{ key: string; label: string; km: number; horas: number; lancamentos: number }>;
    monthly: Array<{ key: string; label: string; km: number; horas: number; lancamentos: number }>;
    clients: Array<{
      clienteId: string | null;
      nome: string;
      totalKm: number;
      totalHoras: number;
      obras: number;
      equipamentos: number;
      sharePercent: number;
    }>;
  };
  tables: {
    equipamentos: RankingEquipment[];
    obras: WorksiteRow[];
  };
  heatmap: {
    days: Array<{ key: string; label: string; weekday: string }>;
    rows: Array<{
      equipamentoId: string | null;
      label: string;
      tipoControle: string;
      totalKm: number;
      totalHoras: number;
      cells: Array<{
        key: string;
        value: number;
        km: number;
        horas: number;
        obra: string;
        intensity: number;
      }>;
    }>;
  };
  insights: Array<{ tone: "info" | "warning" | "danger"; title: string; message: string }>;
  inconsistencies: Array<{
    lancamentoId: string;
    data: string;
    equipamento: string;
    ficha: string;
    tipoControle: string;
    leituraAnterior: number;
    leituraInformada: number;
  }>;
  details: Array<{
    data: string;
    ficha: string;
    equipamento: string;
    tipoControle: string;
    tipoRecurso: string;
    obra: string;
    cliente: string;
    colaborador: string;
    servico: string;
    km: number;
    horas: number;
    leituraInicial: number | null;
    leituraFinal: number | null;
    metodo: string;
    observacao: string | null;
  }>;
};

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "current_week", label: "Esta semana" },
  { value: "current_month", label: "Mes atual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "current_year", label: "Ano atual" },
  { value: "custom", label: "Personalizado" }
];

const tipoRecursoOptions = [
  { value: "CAMINHAO", label: "Caminhao" },
  { value: "MAQUINA", label: "Maquina" },
  { value: "CARRETA", label: "Carreta" },
  { value: "EQUIPAMENTO_APOIO", label: "Apoio" },
  { value: "OUTRO", label: "Outro" }
];

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatKm(value: number) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1
  })} km`;
}

function formatHoras(value: number) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1
  })} h`;
}

function formatPercent(value: number) {
  return `${Number(value ?? 0).toFixed(1).replace(".", ",")}%`;
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

function MetricTooltip({
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
    <div className="km-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={`${item.name}-${item.color}`}>
          {item.name}: {String(item.name).toLowerCase().includes("km")
            ? formatKm(Number(item.value ?? 0))
            : formatHoras(Number(item.value ?? 0))}
        </span>
      ))}
    </div>
  );
}

function KpiCard(props: { label: string; value: string; helper: string; tone?: "orange" | "blue" | "green" | "red" }) {
  return (
    <article className={`km-kpi-card km-kpi-${props.tone ?? "orange"}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.helper}</small>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <main className="km-dashboard">
      <section className="km-hero surface section-card km-skeleton" />
      <section className="km-kpi-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <article key={index} className="km-kpi-card km-skeleton" />
        ))}
      </section>
      <section className="km-chart-grid">
        <article className="surface section-card km-skeleton" />
        <article className="surface section-card km-skeleton" />
      </section>
    </main>
  );
}

export function KmHorimetroDashboard() {
  const [period, setPeriod] = useState<PeriodPreset>("current_month");
  const [customStart, setCustomStart] = useState(() => toInputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));
  const [equipamentoIds, setEquipamentoIds] = useState<string[]>([]);
  const [obraIds, setObraIds] = useState<string[]>([]);
  const [clienteIds, setClienteIds] = useState<string[]>([]);
  const [colaboradorIds, setColaboradorIds] = useState<string[]>([]);
  const [tipoControle, setTipoControle] = useState<TipoControleFiltro>("TODOS");
  const [tipoRecursos, setTipoRecursos] = useState<string[]>([]);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(
    nextPeriod = period,
    overrides?: Partial<{
      equipamentoIds: string[];
      obraIds: string[];
      clienteIds: string[];
      colaboradorIds: string[];
      tipoControle: TipoControleFiltro;
      tipoRecursos: string[];
      customStart: string;
      customEnd: string;
    }>
  ) {
    setLoading(true);
    setError("");

    try {
      const activeEquipamentoIds = overrides?.equipamentoIds ?? equipamentoIds;
      const activeObraIds = overrides?.obraIds ?? obraIds;
      const activeClienteIds = overrides?.clienteIds ?? clienteIds;
      const activeColaboradorIds = overrides?.colaboradorIds ?? colaboradorIds;
      const activeTipoControle = overrides?.tipoControle ?? tipoControle;
      const activeTipoRecursos = overrides?.tipoRecursos ?? tipoRecursos;
      const activeCustomStart = overrides?.customStart ?? customStart;
      const activeCustomEnd = overrides?.customEnd ?? customEnd;
      const params = new URLSearchParams({ period: nextPeriod });

      if (nextPeriod === "custom") {
        params.set("start", activeCustomStart);
        params.set("end", activeCustomEnd);
      }

      if (activeEquipamentoIds.length) params.set("equipamentoIds", activeEquipamentoIds.join(","));
      if (activeObraIds.length) params.set("obraIds", activeObraIds.join(","));
      if (activeClienteIds.length) params.set("clienteIds", activeClienteIds.join(","));
      if (activeColaboradorIds.length) params.set("colaboradorIds", activeColaboradorIds.join(","));
      if (activeTipoControle !== "TODOS") params.set("tipoControle", activeTipoControle);
      if (activeTipoRecursos.length) params.set("tipoRecursos", activeTipoRecursos.join(","));

      const response = await fetch(`/api/dashboard/km-horimetro?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar a dashboard de KM e horimetro.");
        setData(null);
        return;
      }

      setData(payload);
    } catch {
      setError("Nao foi possivel carregar a dashboard de KM e horimetro.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard("current_month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredObras = useMemo(() => {
    const all = data?.filters.obras ?? [];
    if (!clienteIds.length) return all;
    return all.filter((obra) => obra.clienteId && clienteIds.includes(obra.clienteId));
  }, [clienteIds, data]);

  const kmChart = useMemo(() => (data?.charts.kmByEquipment ?? []).slice(0, 10), [data]);
  const hoursChart = useMemo(() => (data?.charts.hoursByEquipment ?? []).slice(0, 10), [data]);
  const worksiteChart = useMemo(() => (data?.charts.worksiteUsage ?? []).slice(0, 10), [data]);
  const clientChart = useMemo(() => (data?.charts.clients ?? []).slice(0, 8), [data]);
  const hasData = (data?.summary.totalLancamentos ?? 0) > 0;

  function handleApply() {
    void loadDashboard(period);
  }

  function handleReset() {
    setPeriod("current_month");
    setEquipamentoIds([]);
    setObraIds([]);
    setClienteIds([]);
    setColaboradorIds([]);
    setTipoControle("TODOS");
    setTipoRecursos([]);
    void loadDashboard("current_month", {
      equipamentoIds: [],
      obraIds: [],
      clienteIds: [],
      colaboradorIds: [],
      tipoControle: "TODOS",
      tipoRecursos: []
    });
  }

  function exportDetails() {
    const rows = [
      [
        "Data",
        "Ficha",
        "Equipamento",
        "Tipo controle",
        "Tipo recurso",
        "Obra",
        "Cliente",
        "Colaborador",
        "Servico",
        "KM",
        "Horas",
        "Leitura inicial",
        "Leitura final",
        "Metodo",
        "Observacao"
      ],
      ...(data?.details ?? []).map((item) => [
        new Date(item.data).toLocaleDateString("pt-BR"),
        item.ficha,
        item.equipamento,
        item.tipoControle,
        item.tipoRecurso,
        item.obra,
        item.cliente,
        item.colaborador,
        item.servico,
        item.km,
        item.horas,
        item.leituraInicial,
        item.leituraFinal,
        item.metodo,
        item.observacao
      ])
    ];

    downloadCsv("dashboard-km-horimetro-detalhado.csv", rows);
  }

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="km-dashboard">
      <section className="km-hero surface section-card fade-up">
        <div>
          <span className="km-kicker">Operacao por obra</span>
          <h1 className="page-title">KM e horimetro por obra</h1>
          <p className="page-copy">
            Controle quanto cada caminhao rodou e quantas horas cada maquina trabalhou em cada obra,
            usando as leituras dos lancamentos diarios.
          </p>
        </div>
        <div className="km-hero-actions">
          <span className="km-period-badge">
            <strong>{data?.period.label ?? "Periodo atual"}</strong>
            <small>{data?.summary.totalLancamentos ?? 0} lancamento(s)</small>
          </span>
          <button type="button" className="button-secondary" onClick={() => window.print()}>
            PDF / imprimir
          </button>
          <button type="button" className="button-primary" onClick={exportDetails} disabled={!data?.details.length}>
            Excel detalhado
          </button>
        </div>
      </section>

      <section className="km-filter-card surface section-card fade-up fade-up-delay-1">
        <div className="km-filter-grid">
          <label className="field">
            <span className="field-label">Periodo</span>
            <select className="field-control" value={period} onChange={(event) => setPeriod(event.target.value as PeriodPreset)}>
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
            <span className="field-label">Tipo de controle</span>
            <select className="field-control" value={tipoControle} onChange={(event) => setTipoControle(event.target.value as TipoControleFiltro)}>
              <option value="TODOS">KM e Horimetro</option>
              <option value="KM">Somente KM</option>
              <option value="HORIMETRO">Somente horimetro</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Tipo de equipamento</span>
            <SearchableMultiSelect
              values={tipoRecursos}
              options={tipoRecursoOptions}
              placeholder="Buscar tipo"
              onChange={setTipoRecursos}
            />
          </label>
        </div>

        <div className="km-filter-grid km-filter-grid-wide">
          <label className="field">
            <span className="field-label">Equipamento</span>
            <SearchableMultiSelect
              values={equipamentoIds}
              options={(data?.filters.equipamentos ?? []).map((item) => ({ value: item.id, label: item.label }))}
              placeholder="Buscar equipamentos"
              onChange={setEquipamentoIds}
            />
          </label>
          <label className="field">
            <span className="field-label">Cliente</span>
            <SearchableMultiSelect
              values={clienteIds}
              options={(data?.filters.clientes ?? []).map((item) => ({ value: item.id, label: item.label }))}
              placeholder="Buscar clientes"
              onChange={(values) => {
                setClienteIds(values);
                const allowedObras =
                  values.length === 0
                    ? data?.filters.obras ?? []
                    : (data?.filters.obras ?? []).filter((obra) => obra.clienteId && values.includes(obra.clienteId));
                setObraIds((current) => current.filter((obraId) => allowedObras.some((obra) => obra.id === obraId)));
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">Obra</span>
            <SearchableMultiSelect
              values={obraIds}
              options={filteredObras.map((item) => ({ value: item.id, label: item.label }))}
              placeholder="Buscar obras"
              onChange={setObraIds}
            />
          </label>
          <label className="field">
            <span className="field-label">Operador / motorista</span>
            <SearchableMultiSelect
              values={colaboradorIds}
              options={(data?.filters.colaboradores ?? []).map((item) => ({ value: item.id, label: item.label }))}
              placeholder="Buscar colaborador"
              onChange={setColaboradorIds}
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

      <section className="km-kpi-grid fade-up fade-up-delay-2">
        <KpiCard label="KM total rodado" value={formatKm(data?.summary.totalKm ?? 0)} helper={`${data?.summary.totalEquipamentos ?? 0} equipamento(s) no periodo`} tone="blue" />
        <KpiCard label="Horas totais" value={formatHoras(data?.summary.totalHoras ?? 0)} helper={`${data?.summary.totalObras ?? 0} obra(s) com movimento`} tone="orange" />
        <KpiCard label="Maior KM" value={data?.summary.equipamentoMaiorKm?.nome ?? "-"} helper={formatKm(data?.summary.equipamentoMaiorKm?.valor ?? 0)} tone="blue" />
        <KpiCard label="Maior horimetro" value={data?.summary.equipamentoMaiorHoras?.nome ?? "-"} helper={formatHoras(data?.summary.equipamentoMaiorHoras?.valor ?? 0)} tone="orange" />
        <KpiCard label="Obra mais ativa" value={data?.summary.obraMaisAtiva?.nome ?? "-"} helper={`${formatKm(data?.summary.obraMaisAtiva?.totalKm ?? 0)} | ${formatHoras(data?.summary.obraMaisAtiva?.totalHoras ?? 0)}`} tone="green" />
        <KpiCard label="Cliente principal" value={data?.summary.clientePrincipal?.nome ?? "-"} helper={`${formatKm(data?.summary.clientePrincipal?.totalKm ?? 0)} | ${formatHoras(data?.summary.clientePrincipal?.totalHoras ?? 0)}`} tone="green" />
        <KpiCard label="Media por dia" value={`${formatKm(data?.summary.mediaKmDia ?? 0)} / ${formatHoras(data?.summary.mediaHorasDia ?? 0)}`} helper="Media no periodo filtrado" tone="blue" />
        <KpiCard label="Alertas de leitura" value={String(data?.summary.inconsistencias ?? 0)} helper={`${data?.summary.leiturasSemBase ?? 0} sem leitura inicial | ${data?.summary.calculosPorApontamento ?? 0} por apontamento`} tone="red" />
      </section>

      {!hasData ? (
        <section className="surface section-card km-empty-state">
          <strong>Sem dados para o periodo selecionado</strong>
          <p>Nenhum movimento encontrado para os filtros aplicados. Ajuste o periodo ou limpe os filtros.</p>
        </section>
      ) : (
        <>
          <section className="km-chart-grid fade-up fade-up-delay-3">
            <article className="surface section-card km-chart-card">
              <div className="km-card-header">
                <div>
                  <span className="km-kicker">KM</span>
                  <h2 className="section-title">KM rodado por equipamento</h2>
                </div>
              </div>
              {kmChart.length ? (
                <ResponsiveContainer width="100%" height={Math.max(260, kmChart.length * 44 + 80)}>
                  <BarChart data={kmChart} layout="vertical" margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
                    <CartesianGrid stroke="var(--dashboard-chart-grid)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} tickFormatter={(value) => formatKm(Number(value)).replace(" km", "")} />
                    <YAxis type="category" dataKey="nome" width={160} tick={{ fill: "var(--screen-chart-tick)", fontSize: 11 }} />
                    <Tooltip content={<MetricTooltip />} />
                    <Bar dataKey="totalKm" name="KM" fill="#38BDF8" radius={[0, 12, 12, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="section-copy">Sem equipamentos controlados por KM no periodo.</p>
              )}
            </article>

            <article className="surface section-card km-chart-card">
              <div className="km-card-header">
                <div>
                  <span className="km-kicker">Horimetro</span>
                  <h2 className="section-title">Horas trabalhadas por equipamento</h2>
                </div>
              </div>
              {hoursChart.length ? (
                <ResponsiveContainer width="100%" height={Math.max(260, hoursChart.length * 44 + 80)}>
                  <BarChart data={hoursChart} layout="vertical" margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
                    <CartesianGrid stroke="var(--dashboard-chart-grid)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} tickFormatter={(value) => formatHoras(Number(value)).replace(" h", "")} />
                    <YAxis type="category" dataKey="nome" width={160} tick={{ fill: "var(--screen-chart-tick)", fontSize: 11 }} />
                    <Tooltip content={<MetricTooltip />} />
                    <Bar dataKey="totalHoras" name="Horas" fill="#F97316" radius={[0, 12, 12, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="section-copy">Sem equipamentos controlados por horimetro no periodo.</p>
              )}
            </article>
          </section>

          <section className="km-chart-grid km-chart-grid-wide fade-up fade-up-delay-3">
            <article className="surface section-card km-chart-card">
              <div className="km-card-header">
                <div>
                  <span className="km-kicker">Obras</span>
                  <h2 className="section-title">KM e horas por obra</h2>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={worksiteChart} margin={{ top: 18, right: 28, left: 8, bottom: 70 }}>
                  <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                  <XAxis dataKey="nome" interval={0} angle={-32} textAnchor="end" height={88} tick={{ fill: "var(--screen-chart-tick)", fontSize: 11 }} />
                  <YAxis yAxisId="km" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <YAxis yAxisId="horas" orientation="right" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <Tooltip content={<MetricTooltip />} />
                  <Bar yAxisId="km" dataKey="totalKm" name="KM" fill="#38BDF8" radius={[10, 10, 0, 0]} />
                  <Line yAxisId="horas" type="monotone" dataKey="totalHoras" name="Horas" stroke="#F97316" strokeWidth={3} dot={{ r: 4, fill: "#F97316" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </article>

            <article className="surface section-card km-chart-card">
              <div className="km-card-header">
                <div>
                  <span className="km-kicker">Evolucao</span>
                  <h2 className="section-title">Evolucao diaria</h2>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={data?.charts.daily ?? []} margin={{ top: 18, right: 24, left: 8, bottom: 20 }}>
                  <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--screen-chart-tick)", fontSize: 11 }} />
                  <YAxis yAxisId="km" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <YAxis yAxisId="horas" orientation="right" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <Tooltip content={<MetricTooltip />} />
                  <Line yAxisId="km" type="monotone" dataKey="km" name="KM" stroke="#38BDF8" strokeWidth={3} dot={false} />
                  <Line yAxisId="horas" type="monotone" dataKey="horas" name="Horas" stroke="#F97316" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </article>
          </section>

          <section className="km-heatmap-card surface section-card fade-up fade-up-delay-3">
            <div className="km-card-header">
              <div>
                <span className="km-kicker">Heatmap</span>
                <h2 className="section-title">Leitura instantanea por dia</h2>
                <p className="section-copy">A intensidade indica maior KM ou maior hora no proprio equipamento.</p>
              </div>
              <div className="km-heatmap-legend">
                <span><i className="is-empty" /> Sem lancamento</span>
                <span><i className="is-low" /> Baixo</span>
                <span><i className="is-high" /> Alto</span>
              </div>
            </div>
            <div className="km-heatmap-scroll">
              <div className="km-heatmap-grid" style={{ gridTemplateColumns: `220px repeat(${data?.heatmap.days.length ?? 0}, minmax(74px, 1fr))` }}>
                <div className="km-heatmap-head km-heatmap-fixed">Equipamento</div>
                {(data?.heatmap.days ?? []).map((day) => (
                  <div key={day.key} className="km-heatmap-head">
                    <strong>{day.weekday}</strong>
                    <span>{day.label}</span>
                  </div>
                ))}
                {(data?.heatmap.rows ?? []).map((row) => (
                  <Fragment key={row.equipamentoId ?? row.label}>
                    <div key={`${row.equipamentoId}-label`} className="km-heatmap-equipment">
                      <strong>{row.label}</strong>
                      <span>{row.tipoControle === "KM" ? formatKm(row.totalKm) : formatHoras(row.totalHoras)}</span>
                    </div>
                    {row.cells.map((cell) => (
                      <div key={`${row.equipamentoId}-${cell.key}`} className={`km-heatmap-cell intensity-${cell.intensity}`} title={`${row.label} | ${cell.obra || "Sem obra"} | ${row.tipoControle === "KM" ? formatKm(cell.km) : formatHoras(cell.horas)}`}>
                        <strong>{cell.value > 0 ? (row.tipoControle === "KM" ? formatKm(cell.km) : formatHoras(cell.horas)) : "-"}</strong>
                        <span>{cell.obra ? cell.obra.replace(/^[^-]+ - /, "") : ""}</span>
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
          </section>

          <section className="km-chart-grid fade-up fade-up-delay-3">
            <article className="surface section-card km-chart-card">
              <div className="km-card-header">
                <div>
                  <span className="km-kicker">Mensal</span>
                  <h2 className="section-title">Evolucao mensal</h2>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.charts.monthly ?? []} margin={{ top: 18, right: 20, left: 8, bottom: 12 }}>
                  <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--screen-chart-tick)", fontSize: 12 }} />
                  <Tooltip content={<MetricTooltip />} />
                  <Bar dataKey="km" name="KM" fill="#38BDF8" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="horas" name="Horas" fill="#F97316" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="surface section-card km-chart-card">
              <div className="km-card-header">
                <div>
                  <span className="km-kicker">Clientes</span>
                  <h2 className="section-title">Participacao por cliente</h2>
                </div>
              </div>
              <div className="km-client-list">
                {clientChart.length ? (
                  clientChart.map((item, index) => (
                    <article key={`${item.clienteId}-${index}`} className="km-client-row">
                      <div>
                        <strong>{item.nome}</strong>
                        <span>{item.obras} obra(s) | {item.equipamentos} equipamento(s)</span>
                      </div>
                      <div className="km-client-meter">
                        <span style={{ width: `${Math.min(100, item.sharePercent)}%` }} />
                      </div>
                      <b>{formatPercent(item.sharePercent)}</b>
                    </article>
                  ))
                ) : (
                  <p className="section-copy">Sem clientes com movimento no periodo.</p>
                )}
              </div>
            </article>
          </section>

          <section className="km-list-grid fade-up fade-up-delay-3">
            <RankingTable title="Visao por equipamento" rows={data?.tables.equipamentos ?? []} type="equipment" />
            <RankingTable title="Visao por obra" rows={data?.tables.obras ?? []} type="worksite" />
            <InsightsPanel insights={data?.insights ?? []} inconsistencies={data?.inconsistencies ?? []} />
          </section>
        </>
      )}
    </main>
  );
}

function RankingTable({
  title,
  rows,
  type
}: {
  title: string;
  rows: RankingEquipment[] | WorksiteRow[];
  type: "equipment" | "worksite";
}) {
  return (
    <article className="surface section-card km-table-card">
      <span className="km-kicker">{type === "equipment" ? "Equipamentos" : "Obras"}</span>
      <h2 className="section-title">{title}</h2>
      <div className="km-table-scroll">
        <table className="km-table">
          <thead>
            <tr>
              <th>{type === "equipment" ? "Equipamento" : "Obra"}</th>
              <th>{type === "equipment" ? "Tipo" : "Cliente"}</th>
              <th>KM</th>
              <th>Horas</th>
              <th>{type === "equipment" ? "Obras" : "Equip."}</th>
              <th>Dias</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.slice(0, 12).map((row, index) => {
                const equipment = row as RankingEquipment;
                const worksite = row as WorksiteRow;
                return (
                  <tr key={`${type}-${index}`}>
                    <td>{type === "equipment" ? equipment.nome : worksite.nome}</td>
                    <td>{type === "equipment" ? `${equipment.tipoRecurso} / ${equipment.tipoControle}` : worksite.clienteNome}</td>
                    <td>{formatKm(type === "equipment" ? equipment.totalKm : worksite.totalKm)}</td>
                    <td>{formatHoras(type === "equipment" ? equipment.totalHoras : worksite.totalHoras)}</td>
                    <td>{type === "equipment" ? equipment.obras : worksite.equipamentos}</td>
                    <td>{type === "equipment" ? equipment.diasTrabalhados : worksite.diasMovimento}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>Sem dados para o periodo selecionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function InsightsPanel({
  insights,
  inconsistencies
}: {
  insights: DashboardPayload["insights"];
  inconsistencies: DashboardPayload["inconsistencies"];
}) {
  return (
    <article className="surface section-card km-insights-card">
      <span className="km-kicker">Alertas</span>
      <h2 className="section-title">Insights automaticos</h2>
      <div className="km-insight-list">
        {insights.length ? (
          insights.map((item, index) => (
            <div key={`${item.title}-${index}`} className={`km-insight km-insight-${item.tone}`}>
              <strong>{item.title}</strong>
              <span>{item.message}</span>
            </div>
          ))
        ) : (
          <p className="section-copy">Nenhum alerta operacional para o periodo.</p>
        )}
      </div>
      {inconsistencies.length ? (
        <div className="km-inconsistency-list">
          {inconsistencies.slice(0, 5).map((item) => (
            <div key={item.lancamentoId}>
              <strong>{item.equipamento}</strong>
              <span>
                Ficha {item.ficha}: {item.leituraInformada.toLocaleString("pt-BR")} menor que {item.leituraAnterior.toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
