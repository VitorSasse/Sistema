"use client";

import { useEffect, useState } from "react";
import { SearchableMultiSelect } from "@/components/form/searchable-multi-select";

type PanelStatus = "VENCIDA" | "ATENCAO" | "EM_DIA" | "SEM_BASE" | "SEM_PLANO";

type DashboardPayload = {
  filters: {
    equipamentoIds: string[];
    equipamentos: Array<{ id: string; label: string }>;
    situacao: PanelStatus | "TODAS";
  };
  summary: {
    total: number;
    vencidas: number;
    atencao: number;
    emDia: number;
    semBase: number;
    semPlano: number;
  };
  highlights: MaintenanceItem[];
  items: MaintenanceItem[];
};

type MaintenanceItem = {
  equipamentoId: string;
  descricao: string;
  placaOuTag: string;
  tipoRecurso: string;
  tipoControle: string;
  statusOperacional: string;
  complementar: boolean;
  painelStatus: PanelStatus;
  planoId: string | null;
  planoTitulo: string;
  tipoManutencao: string;
  criterioControle: string | null;
  periodicidadeValor: number | null;
  toleranciaValor: number | null;
  restanteNumero: number | null;
  restanteLabel: string;
  unidadeRestante: string | null;
  alvoLabel: string;
  leituraAtualLabel: string;
  progresso: number | null;
  urgencia: number;
};

const situacaoOptions: Array<{ value: PanelStatus | "TODAS"; label: string }> = [
  { value: "TODAS", label: "Todas" },
  { value: "VENCIDA", label: "Vencidas" },
  { value: "ATENCAO", label: "Atencao" },
  { value: "EM_DIA", label: "Em dia" },
  { value: "SEM_BASE", label: "Sem base" },
  { value: "SEM_PLANO", label: "Sem plano" }
];

function formatStatusLabel(status: PanelStatus) {
  switch (status) {
    case "VENCIDA":
      return "Vencida";
    case "ATENCAO":
      return "Atencao";
    case "EM_DIA":
      return "Em dia";
    case "SEM_BASE":
      return "Sem base";
    default:
      return "Sem plano";
  }
}

function getStatusClass(status: PanelStatus) {
  switch (status) {
    case "VENCIDA":
      return "maintenance-pill maintenance-pill-danger";
    case "ATENCAO":
      return "maintenance-pill maintenance-pill-warn";
    case "EM_DIA":
      return "maintenance-pill maintenance-pill-success";
    case "SEM_BASE":
      return "maintenance-pill maintenance-pill-neutral";
    default:
      return "maintenance-pill maintenance-pill-muted";
  }
}

function getStatusTrackClass(status: PanelStatus) {
  switch (status) {
    case "VENCIDA":
      return "maintenance-progress-fill maintenance-progress-fill-danger";
    case "ATENCAO":
      return "maintenance-progress-fill maintenance-progress-fill-warn";
    case "EM_DIA":
      return "maintenance-progress-fill maintenance-progress-fill-success";
    case "SEM_BASE":
      return "maintenance-progress-fill maintenance-progress-fill-neutral";
    default:
      return "maintenance-progress-fill maintenance-progress-fill-muted";
  }
}

function DashboardSkeleton() {
  return (
    <main className="fleet-dashboard maintenance-dashboard">
      <section className="surface section-card maintenance-toolbar fleet-skeleton-block" />
      <section className="maintenance-command-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="fleet-skeleton-block maintenance-stat-card" />
        ))}
      </section>
      <section className="surface section-card fleet-skeleton-block" />
    </main>
  );
}

export function FrotaManutencaoDashboard() {
  const [equipamentoIds, setEquipamentoIds] = useState<string[]>([]);
  const [situacao, setSituacao] = useState<PanelStatus | "TODAS">("TODAS");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(
    nextEquipamentoIds = equipamentoIds,
    nextSituacao = situacao
  ) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (nextEquipamentoIds.length > 0) {
        params.set("equipamentoIds", nextEquipamentoIds.join(","));
      }

      if (nextSituacao !== "TODAS") {
        params.set("situacao", nextSituacao);
      }

      const response = await fetch(`/api/frota/manutencao?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as DashboardPayload & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel carregar o painel de manutencao.");
        setData(null);
        return;
      }

      setData(payload);
      setEquipamentoIds(payload.filters.equipamentoIds ?? []);
      setSituacao(payload.filters.situacao ?? "TODAS");
    } catch {
      setError("Nao foi possivel carregar o painel de manutencao.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard([], "TODAS");
  }, []);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const totalConsiderado = Math.max(1, data?.summary.total ?? 0);
  const summaryItems = [
    { key: "vencidas", label: "Vencidas", value: data?.summary.vencidas ?? 0, className: "danger" },
    { key: "atencao", label: "Atencao", value: data?.summary.atencao ?? 0, className: "warn" },
    { key: "emDia", label: "Em dia", value: data?.summary.emDia ?? 0, className: "success" },
    { key: "semBase", label: "Sem base", value: data?.summary.semBase ?? 0, className: "neutral" },
    { key: "semPlano", label: "Sem plano", value: data?.summary.semPlano ?? 0, className: "muted" }
  ];
  const urgentItems = (data?.highlights ?? []).slice(0, 6);

  return (
    <main className="fleet-dashboard maintenance-dashboard">
      <section className="maintenance-toolbar surface section-card fade-up">
        <div className="maintenance-toolbar-copy">
          <span className="page-kicker">Frota</span>
          <h1 className="page-title">Painel visual de manutencao</h1>
          <p className="section-copy">
            Proxima revisao, criticidade e quanto falta por equipamento em uma leitura unica.
          </p>
        </div>

        <div className="maintenance-toolbar-filters">
          <label className="field maintenance-filter-field">
            <span className="field-label">Equipamentos exibidos</span>
            <SearchableMultiSelect
              values={equipamentoIds}
              options={(data?.filters.equipamentos ?? []).map((item) => ({
                value: item.id,
                label: item.label
              }))}
              placeholder="Buscar equipamentos"
              emptyLabel="Nenhum equipamento encontrado."
              onChange={(values) => {
                setEquipamentoIds(values);
                void loadDashboard(values, situacao);
              }}
            />
          </label>

          <label className="field maintenance-filter-field">
            <span className="field-label">Situacao</span>
            <select
              className="field-control"
              value={situacao}
              onChange={(event) => {
                const nextSituacao = event.target.value as PanelStatus | "TODAS";
                setSituacao(nextSituacao);
                void loadDashboard(equipamentoIds, nextSituacao);
              }}
            >
              {situacaoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <section className="surface section-card">
          <p className="message-inline message-inline-danger">{error}</p>
        </section>
      ) : null}

      <section className="maintenance-command-grid fade-up fade-up-delay-1">
        <article className="maintenance-total-card">
          <span>Monitorados</span>
          <strong>{data?.summary.total ?? 0}</strong>
          <small>equipamentos</small>
        </article>

        {summaryItems.map((item) => (
          <article
            key={item.key}
            className={`maintenance-stat-card maintenance-stat-card-${item.className}`}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <div className="maintenance-stat-meter">
              <div style={{ width: `${(item.value / totalConsiderado) * 100}%` }} />
            </div>
          </article>
        ))}
      </section>

      <section className="maintenance-overview-grid fade-up fade-up-delay-2">
        <article className="surface section-card maintenance-distribution-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Distribuicao</h2>
              <p className="section-copy">Situacao geral do filtro aplicado.</p>
            </div>
          </div>

          <div className="maintenance-distribution-list">
            {summaryItems.map((item) => (
              <div key={item.key} className="maintenance-distribution-item">
                <div className="maintenance-distribution-copy">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>
                <div className="maintenance-distribution-track">
                  <div
                    className={`maintenance-distribution-fill maintenance-distribution-fill-${item.className}`}
                    style={{ width: `${(item.value / totalConsiderado) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface section-card maintenance-highlights-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Fila critica</h2>
              <p className="section-copy">Os primeiros equipamentos para revisar.</p>
            </div>
          </div>

          <div className="maintenance-highlight-list">
            {urgentItems.length === 0 ? (
              <div className="fleet-empty-state fleet-empty-state-compact">
                <strong>Nenhum equipamento no filtro</strong>
                <p>Sem dados para destacar neste recorte.</p>
              </div>
            ) : (
              urgentItems.map((item) => (
                <article key={item.equipamentoId} className="maintenance-highlight-item">
                  <div className="maintenance-highlight-head">
                    <strong>{item.placaOuTag}</strong>
                    <span className={getStatusClass(item.painelStatus)}>
                      {formatStatusLabel(item.painelStatus)}
                    </span>
                  </div>
                  <span className="maintenance-highlight-subtitle">{item.descricao}</span>
                  <strong className="maintenance-highlight-value">{item.restanteLabel}</strong>
                  <span className="maintenance-highlight-meta">
                    {item.tipoManutencao} - Alvo {item.alvoLabel}
                  </span>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="surface section-card maintenance-compact-board fade-up fade-up-delay-3">
        <div className="section-header">
          <div>
            <h2 className="section-title">Mapa preventivo</h2>
            <p className="section-copy">Leitura atual, meta e ciclo consumido em formato compacto.</p>
          </div>
          <span className="maintenance-board-count">{data?.items.length ?? 0} linhas</span>
        </div>

        {(data?.items ?? []).length === 0 ? (
          <article className="fleet-empty-state">
            <strong>Nenhum equipamento encontrado</strong>
            <p>Altere os filtros para visualizar o painel de manutencao.</p>
          </article>
        ) : (
          <div className="maintenance-compact-table" role="table">
            <div className="maintenance-compact-row maintenance-compact-head" role="row">
              <span>Equipamento</span>
              <span>Situacao</span>
              <span>Falta</span>
              <span>Atual</span>
              <span>Proxima</span>
              <span>Ciclo</span>
            </div>

            {data?.items.map((item) => (
              <article
                key={item.equipamentoId}
                className={`maintenance-compact-row maintenance-compact-row-${item.painelStatus.toLowerCase()}`}
                role="row"
              >
                <div className="maintenance-compact-equipment">
                  <strong>{item.placaOuTag}</strong>
                  <span>{item.descricao}</span>
                  <small>{item.planoTitulo}</small>
                </div>
                <div>
                  <span className={getStatusClass(item.painelStatus)}>
                    {formatStatusLabel(item.painelStatus)}
                  </span>
                </div>
                <strong className="maintenance-compact-value">{item.restanteLabel}</strong>
                <span>{item.leituraAtualLabel}</span>
                <span>{item.alvoLabel}</span>
                <div className="maintenance-compact-cycle">
                  <div className="maintenance-progress-track">
                    <div
                      className={getStatusTrackClass(item.painelStatus)}
                      style={{ width: `${item.progresso ?? 0}%` }}
                    />
                  </div>
                  <span>
                    {item.progresso !== null ? `${item.progresso.toFixed(0)}%` : "sem leitura"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
