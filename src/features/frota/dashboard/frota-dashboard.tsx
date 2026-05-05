"use client";

import { useEffect, useState } from "react";

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

  if (!data) {
    return <p className="section-copy">Carregando dashboard da frota...</p>;
  }

  return (
    <main className="page-stack">
      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card-label">Equipamentos ativos</p>
          <p className="stat-card-value">{data.resumo.ativos}</p>
          <p className="stat-card-copy">Cadastros ativos com potencial de uso operacional.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Em manutencao</p>
          <p className="stat-card-value">{data.resumo.emManutencao}</p>
          <p className="stat-card-copy">Recursos atualmente bloqueados para revisao ou servico.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Parados</p>
          <p className="stat-card-value">{data.resumo.parados}</p>
          <p className="stat-card-copy">Equipamentos aguardando leitura, agenda ou liberacao.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Sem leitura recente</p>
          <p className="stat-card-value">{data.resumo.semLeituraRecente}</p>
          <p className="stat-card-copy">Recursos sem atualizacao recente no cadastro operacional.</p>
        </article>
      </section>

      <section className="tile-grid">
        <article className="tile-card">
          <h3>Alertas ativos</h3>
          <p className="stat-card-value" style={{ fontSize: "2rem", marginTop: 8 }}>
            {data.resumo.alertas}
          </p>
          <p className="section-copy">O gerador de alertas entra na proxima sprint.</p>
        </article>
        <article className="tile-card">
          <h3>Proximos servicos</h3>
          <p className="stat-card-value" style={{ fontSize: "2rem", marginTop: 8 }}>
            {data.resumo.proximosServicos}
          </p>
          <p className="section-copy">Indicador preparatorio para agenda e plano preventivo.</p>
        </article>
        <article className="tile-card">
          <h3>Ultimas leituras</h3>
          <p className="stat-card-value" style={{ fontSize: "2rem", marginTop: 8 }}>
            {data.leiturasRecentes.length}
          </p>
          <p className="section-copy">Leituras recentes ja consolidadas pela frota.</p>
        </article>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Ultimas leituras registradas</h2>
            <p className="section-copy">
              Painel rapido para o escritorio acompanhar a atualizacao da frota.
            </p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Equipamento</th>
                <th>Horimetro</th>
                <th>KM</th>
              </tr>
            </thead>
            <tbody>
              {data.leiturasRecentes.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.dataLeitura).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <div>{item.equipamento.descricao}</div>
                    <div className="subtle">{item.equipamento.placaOuTag}</div>
                  </td>
                  <td>{item.horimetroValor ?? "-"}</td>
                  <td>{item.kmValor ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
