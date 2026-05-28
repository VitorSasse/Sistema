"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  resumo: {
    ativos: number;
    emManutencao: number;
    parados: number;
    semLeituraRecente: number;
    alertas: number;
    proximosServicos: number;
  };
  leiturasRecentes: Array<{
    id: string;
    dataLeitura: string;
    horimetroValor: string | null;
    kmValor: string | null;
    equipamento: {
      descricao: string;
      placaOuTag: string;
    };
  }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function buildAttentionItems(data: DashboardData["resumo"]) {
  const items = [];

  if (data.emManutencao > 0) {
    items.push({
      tone: "danger" as const,
      title: "Manutencao ativa",
      copy: `${data.emManutencao} recurso(s) seguem bloqueados para revisao ou servico.`
    });
  }

  if (data.parados > 0) {
    items.push({
      tone: "warn" as const,
      title: "Recursos parados",
      copy: `${data.parados} equipamento(s) aguardam liberacao ou nova frente.`
    });
  }

  if (data.semLeituraRecente > 0) {
    items.push({
      tone: "info" as const,
      title: "Leituras pendentes",
      copy: `${data.semLeituraRecente} cadastro(s) precisam de leitura recente para ficar confiaveis.`
    });
  }

  if (data.alertas === 0) {
    items.push({
      tone: "success" as const,
      title: "Sem alertas ativos",
      copy: "Nao ha alerta de manutencao disparado no painel atual."
    });
  }

  return items;
}

export function FrotaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const response = await fetch("/api/frota/dashboard", { cache: "no-store" });
      const payload = (await response.json()) as DashboardData;
      setData(payload);
    }

    void loadDashboard();
  }, []);

  const baseAtiva = data?.resumo.ativos ?? 0;
  const liberadosEstimados = Math.max(
    0,
    baseAtiva - (data?.resumo.emManutencao ?? 0) - (data?.resumo.parados ?? 0)
  );

  const operacaoMix = useMemo(() => {
    if (!data || baseAtiva === 0) {
      return {
        liberados: 0,
        manutencao: 0,
        parados: 0
      };
    }

    return {
      liberados: Number(((liberadosEstimados / baseAtiva) * 100).toFixed(1)),
      manutencao: Number(((data.resumo.emManutencao / baseAtiva) * 100).toFixed(1)),
      parados: Number(((data.resumo.parados / baseAtiva) * 100).toFixed(1))
    };
  }, [baseAtiva, data, liberadosEstimados]);

  const attentionItems = useMemo(
    () => (data ? buildAttentionItems(data.resumo) : []),
    [data]
  );

  if (!data) {
    return (
      <main className="fleet-dashboard">
        <section className="surface section-card fleet-hero fleet-skeleton-block" />
        <section className="fleet-summary-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={index}
              className="surface section-card fleet-summary-card fleet-skeleton-block"
            />
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="fleet-dashboard">
      <section className="surface section-card fleet-hero">
        <div className="fleet-hero-main">
          <span className="fleet-kicker">Pulso da frota</span>
          <h2 className="fleet-hero-title">
            {baseAtiva} equipamento(s) ativos com leitura e manutencao sob monitoramento.
          </h2>
          <p className="fleet-hero-copy">
            O quadro abaixo prioriza o que exige atencao agora: manutencao ativa,
            recursos parados e cadastros com leitura desatualizada.
          </p>

          <div className="fleet-hero-strip">
            <div
              className="fleet-hero-strip-segment is-success"
              style={{ width: `${operacaoMix.liberados}%` }}
            />
            <div
              className="fleet-hero-strip-segment is-danger"
              style={{ width: `${operacaoMix.manutencao}%` }}
            />
            <div
              className="fleet-hero-strip-segment is-warn"
              style={{ width: `${operacaoMix.parados}%` }}
            />
          </div>

          <div className="fleet-hero-metrics">
            <div className="fleet-hero-metric">
              <strong>{liberadosEstimados}</strong>
              <span>Liberados estimados</span>
            </div>
            <div className="fleet-hero-metric">
              <strong>{data.resumo.emManutencao}</strong>
              <span>Em manutencao</span>
            </div>
            <div className="fleet-hero-metric">
              <strong>{data.resumo.parados}</strong>
              <span>Parados</span>
            </div>
          </div>
        </div>

        <div className="fleet-hero-side">
          <article className="fleet-spotlight-card is-danger">
            <span className="fleet-spotlight-label">Atencao imediata</span>
            <strong>{data.resumo.semLeituraRecente}</strong>
            <p>
              equipamento(s) sem leitura recente e com risco de decisao baseada em dado velho.
            </p>
          </article>
          <article className="fleet-spotlight-card is-neutral">
            <span className="fleet-spotlight-label">Base monitorada</span>
            <strong>{data.resumo.proximosServicos}</strong>
            <p>recurso(s) ativos ja possuem leitura consolidada para controle da frota.</p>
          </article>
        </div>
      </section>

      <section className="fleet-summary-grid">
        <article className="fleet-summary-card fleet-summary-card-strong">
          <span className="fleet-card-label">Equipamentos ativos</span>
          <strong className="fleet-card-value">{data.resumo.ativos}</strong>
          <p className="fleet-card-copy">Base operacional ativa acompanhada pelo painel.</p>
        </article>

        <article className="fleet-summary-card fleet-summary-card-danger">
          <span className="fleet-card-label">Em manutencao</span>
          <strong className="fleet-card-value">{data.resumo.emManutencao}</strong>
          <p className="fleet-card-copy">Recursos bloqueados para revisao, oficina ou servico.</p>
        </article>

        <article className="fleet-summary-card fleet-summary-card-warn">
          <span className="fleet-card-label">Parados</span>
          <strong className="fleet-card-value">{data.resumo.parados}</strong>
          <p className="fleet-card-copy">Equipamentos aguardando liberacao ou replanejamento.</p>
        </article>

        <article className="fleet-summary-card fleet-summary-card-info">
          <span className="fleet-card-label">Ultimas leituras</span>
          <strong className="fleet-card-value">{data.leiturasRecentes.length}</strong>
          <p className="fleet-card-copy">Leituras recentes que alimentam o controle da frota.</p>
        </article>
      </section>

      <section className="fleet-analysis-grid">
        <article className="surface section-card fleet-attention-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Radar de atencao</h2>
              <p className="section-copy">
                Resumo de impacto para o escritorio bater o olho e agir rapido.
              </p>
            </div>
          </div>

          <div className="fleet-attention-list">
            {attentionItems.map((item) => (
              <div
                key={item.title}
                className={`fleet-attention-item fleet-attention-item-${item.tone}`}
              >
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface section-card fleet-reading-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Ultimas leituras registradas</h2>
              <p className="section-copy">
                Sequencia recente para validar se a frota esta sendo alimentada corretamente.
              </p>
            </div>
          </div>

          <div className="fleet-reading-list">
            {data.leiturasRecentes.map((item) => (
              <article key={item.id} className="fleet-reading-item">
                <div className="fleet-reading-item-top">
                  <div>
                    <strong>{item.equipamento.descricao}</strong>
                    <span>{item.equipamento.placaOuTag}</span>
                  </div>
                  <span className="badge badge-neutral">{formatDate(item.dataLeitura)}</span>
                </div>

                <div className="fleet-reading-values">
                  <div>
                    <small>Horimetro</small>
                    <strong>{item.horimetroValor ?? "-"}</strong>
                  </div>
                  <div>
                    <small>KM</small>
                    <strong>{item.kmValor ?? "-"}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
