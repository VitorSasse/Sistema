const indicators = [
  {
    label: "Lancamentos no periodo",
    value: "0",
    copy: "Consolidado do intervalo selecionado para operacao."
  },
  {
    label: "Fichas pendentes",
    value: "0",
    copy: "Itens que ainda exigem complemento operacional."
  },
  {
    label: "Fichas sem obra",
    value: "0",
    copy: "Apontamentos aguardando vinculacao correta."
  },
  {
    label: "Medicoes em aberto",
    value: "0",
    copy: "Fechamentos criados e ainda nao concluidos."
  }
];

const quickNotes = [
  "Use Lancamentos como a tela principal do escritorio para registrar a producao do dia.",
  "Feche a quinzena em Medicoes somente apos validar itens pendentes e obras vinculadas.",
  "Historico centraliza consulta, edicao e rastreabilidade dos apontamentos."
];

export default function DashboardPage() {
  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Dashboard operacional</h1>
          <p className="page-copy">
            Painel inicial do escritorio para acompanhar volume de lancamentos, pendencias e status de medicao.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        {indicators.map((indicator) => (
          <article key={indicator.label} className="stat-card">
            <p className="stat-card-label">{indicator.label}</p>
            <p className="stat-card-value">{indicator.value}</p>
            <p className="stat-card-copy">{indicator.copy}</p>
          </article>
        ))}
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Orientacao rapida</h2>
            <p className="section-copy">
              O sistema ja esta pronto para operacao local; agora a prioridade e lapidar uso diario e consistencia.
            </p>
          </div>
        </div>

        <div className="tile-grid">
          {quickNotes.map((note, index) => (
            <article key={note} className="tile-card">
              <p className="stat-card-label">Fluxo {String(index + 1).padStart(2, "0")}</p>
              <h3 style={{ marginBottom: 10 }}>Rotina do escritorio</h3>
              <p className="section-copy">{note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
