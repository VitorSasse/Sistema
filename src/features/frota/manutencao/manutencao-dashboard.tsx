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
      <section className="fleet-summary-grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <article
            key={index}
            className="surface section-card fleet-summary-card fleet-skeleton-block"
          />
        ))}
      </section>
      <section className="maintenance-panel-grid">
        <article className="surface section-card fleet-skeleton-block" />
        <article className="surface section-card fleet-skeleton-block" />
      </section>
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

  return (
    <main className="fleet-dashboard maintenance-dashboard">
      <section className="page-header fade-up">
        <span className="page-kicker">Frota</span>
        <h1 className="page-title">Painel visual de manutencao</h1>
        <p className="page-copy">
          Leitura rapida da manutencao dos equipamentos para saber o que vence primeiro e quanto falta em horas, KM ou dias.
        </p>
      </section>

      <section className="maintenance-toolbar surface section-card fade-up">
        <div className="maintenance-toolbar-copy">
          <span className="fleet-kicker">Manutencao preventiva</span>
          <h2 className="section-title">Proxima revisao por equipamento</h2>
          <p className="section-copy">
            O painel usa a leitura atual e o plano preventivo mais relevante de cada equipamento.
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

      <section className="fleet-summary-grid fade-up fade-up-delay-1">
        <article className="fleet-summary-card fleet-summary-card-strong">
          <span className="fleet-card-label">Equipamentos monitorados</span>
          <strong className="fleet-card-value">{data?.summary.total ?? 0}</strong>
          <p className="fleet-card-copy">Leitura consolidada do filtro atual.</p>
        </article>
        <article className="fleet-summary-card fleet-summary-card-danger">
          <span className="fleet-card-label">Revisoes vencidas</span>
          <strong className="fleet-card-value">{data?.summary.vencidas ?? 0}</strong>
          <p className="fleet-card-copy">Exigem acao imediata.</p>
        </article>
        <article className="fleet-summary-card fleet-summary-card-warn">
          <span className="fleet-card-label">Em atencao</span>
          <strong className="fleet-card-value">{data?.summary.atencao ?? 0}</strong>
          <p className="fleet-card-copy">Ja entraram na faixa de alerta.</p>
        </article>
        <article className="fleet-summary-card fleet-summary-card-info">
          <span className="fleet-card-label">Sem base de leitura</span>
          <strong className="fleet-card-value">{data?.summary.semBase ?? 0}</strong>
          <p className="fleet-card-copy">Nao ha dados suficientes para calcular.</p>
        </article>
        <article className="fleet-summary-card fleet-summary-card-neutral">
          <span className="fleet-card-label">Sem plano ativo</span>
          <strong className="fleet-card-value">{data?.summary.semPlano ?? 0}</strong>
          <p className="fleet-card-copy">Equipamentos sem preventivo configurado.</p>
        </article>
      </section>

      <section className="maintenance-panel-grid fade-up fade-up-delay-2">
        <article className="surface section-card maintenance-distribution-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Distribuicao da manutencao</h2>
              <p className="section-copy">
                Situacao geral do parque de equipamentos dentro do filtro aplicado.
              </p>
            </div>
          </div>

          <div className="maintenance-distribution-list">
            {[
              { key: "vencidas", label: "Vencidas", value: data?.summary.vencidas ?? 0, className: "danger" },
              { key: "atencao", label: "Atencao", value: data?.summary.atencao ?? 0, className: "warn" },
              { key: "emDia", label: "Em dia", value: data?.summary.emDia ?? 0, className: "success" },
              { key: "semBase", label: "Sem base", value: data?.summary.semBase ?? 0, className: "neutral" },
              { key: "semPlano", label: "Sem plano", value: data?.summary.semPlano ?? 0, className: "muted" }
            ].map((item) => (
              <div key={item.key} className="maintenance-distribution-item">
                <div className="maintenance-distribution-copy">
                  <strong>{item.label}</strong>
                  <span>{item.value} equipamento(s)</span>
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
              <h2 className="section-title">O que vence primeiro</h2>
              <p className="section-copy">
                Equipamentos mais urgentes para manutencao preventiva.
              </p>
            </div>
          </div>

          <div className="maintenance-highlight-list">
            {(data?.highlights ?? []).length === 0 ? (
              <div className="fleet-empty-state fleet-empty-state-compact">
                <strong>Nenhum equipamento no filtro</strong>
                <p>Sem dados para destacar neste recorte.</p>
              </div>
            ) : (
              data?.highlights.map((item) => (
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
                    {item.tipoManutencao} · Alvo {item.alvoLabel}
                  </span>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="maintenance-card-grid fade-up fade-up-delay-3">
        {(data?.items ?? []).length === 0 ? (
          <article className="surface section-card fleet-empty-state">
            <strong>Nenhum equipamento encontrado</strong>
            <p>Altere os filtros para visualizar o painel de manutencao.</p>
          </article>
        ) : (
          data?.items.map((item) => (
            <article
              key={item.equipamentoId}
              className={`surface section-card maintenance-equipment-card maintenance-equipment-card-${item.painelStatus.toLowerCase()}`}
            >
              <div className="maintenance-card-top">
                <div className="maintenance-card-top-copy">
                  <span className="fleet-kicker">{item.tipoRecurso}</span>
                  <strong>{item.placaOuTag}</strong>
                  <span>{item.descricao}</span>
                </div>
                <span className={getStatusClass(item.painelStatus)}>
                  {formatStatusLabel(item.painelStatus)}
                </span>
              </div>

              <div className="maintenance-card-body">
                <span className="maintenance-card-plan">{item.planoTitulo}</span>
                <strong className="maintenance-card-value">{item.restanteLabel}</strong>
                <p className="maintenance-card-copy">
                  {item.tipoManutencao} · Leitura atual {item.leituraAtualLabel}
                </p>
              </div>

              <div className="maintenance-progress">
                <div className="maintenance-progress-track">
                  <div
                    className={getStatusTrackClass(item.painelStatus)}
                    style={{ width: `${item.progresso ?? 0}%` }}
                  />
                </div>
                <span className="maintenance-progress-label">
                  {item.progresso !== null
                    ? `${item.progresso.toFixed(0)}% do ciclo usado`
                    : "Progresso indisponivel"}
                </span>
              </div>

              <div className="maintenance-card-footer">
                <div className="maintenance-card-meta">
                  <span className="maintenance-meta-label">Proxima meta</span>
                  <strong>{item.alvoLabel}</strong>
                </div>
                <div className="maintenance-card-meta">
                  <span className="maintenance-meta-label">Criterio</span>
                  <strong>{item.criterioControle ?? "SEM PLANO"}</strong>
                </div>
                <div className="maintenance-card-meta">
                  <span className="maintenance-meta-label">Intervalo</span>
                  <strong>
                    {item.periodicidadeValor !== null ? item.periodicidadeValor : "-"}
                    {item.unidadeRestante ? ` ${item.unidadeRestante}` : ""}
                  </strong>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
