import type { Route } from "next";
import Link from "next/link";

const atalhosPrincipais = [
  {
    href: "/lancamentos" as Route,
    kicker: "Operacao",
    titulo: "Lancamentos diarios",
    descricao: "Abrir fichas, ajustar apontamentos e manter o dia operacional em ordem."
  },
  {
    href: "/medicoes" as Route,
    kicker: "Faturamento",
    titulo: "Medicoes operacionais",
    descricao: "Gerar, revisar e acompanhar medicoes antes do fechamento e faturamento."
  },
  {
    href: "/programacao" as Route,
    kicker: "Agenda",
    titulo: "Programacao",
    descricao: "Visualizar alocacoes, disponibilidade e manutencoes em um unico painel."
  },
  {
    href: "/historico" as Route,
    kicker: "Consulta",
    titulo: "Historico de lancamentos",
    descricao: "Localizar registros antigos, conferir romaneios e corrigir divergencias."
  }
];

const atalhosSuporte = [
  {
    href: "/dashboard" as Route,
    titulo: "Dashboard de faturamento",
    descricao: "Receita por cliente, valor a faturar e leitura financeira do periodo."
  },
  {
    href: "/frota/dashboard" as Route,
    titulo: "Dashboard da frota",
    descricao: "Resumo produtivo por equipamento e comparativos de resultado."
  },
  {
    href: "/dashboard/executivo" as Route,
    titulo: "Dashboard executivo",
    descricao: "Utilizacao, disponibilidade mecanica e perdas operacionais."
  },
  {
    href: "/ordens-compra" as Route,
    titulo: "Ordens de compra",
    descricao: "Criar compras, consultar fornecedores e acompanhar aprovacoes."
  },
  {
    href: "/frota/leituras" as Route,
    titulo: "Leituras de horimetro e KM",
    descricao: "Atualizar leituras e manter a base da manutencao consistente."
  },
  {
    href: "/frota/planos" as Route,
    titulo: "Plano preventivo",
    descricao: "Conferir revisoes, proximos vencimentos e pendencias de manutencao."
  }
];

const atalhosCadastro = [
  { href: "/clientes" as Route, titulo: "Clientes" },
  { href: "/obras" as Route, titulo: "Obras" },
  { href: "/equipamentos" as Route, titulo: "Equipamentos" },
  { href: "/fornecedores" as Route, titulo: "Fornecedores" }
];

export default function InicioPage() {
  return (
    <main className="page-stack admin-home">
      <section className="surface section-card admin-home-hero fade-up">
        <div className="admin-home-hero-copy">
          <span className="basepro-kicker">Home operacional</span>
          <h1 className="page-title">Atalhos essenciais da operacao</h1>
          <p className="page-copy">
            Central de acesso rapido para as rotinas mais usadas no dia a dia:
            lancamentos, medicoes, programacao, compras e acompanhamento da frota.
          </p>
        </div>

        <div className="admin-home-summary">
          <div className="admin-home-summary-card">
            <span className="admin-home-summary-label">Fluxos principais</span>
            <strong>4 rotinas criticas</strong>
            <small>Entrada operacional, medicao, agenda e consulta historica.</small>
          </div>
          <div className="admin-home-summary-card">
            <span className="admin-home-summary-label">Acesso rapido</span>
            <strong>1 clique</strong>
            <small>Logo da BASEPRO leva direto para esta tela inicial.</small>
          </div>
        </div>
      </section>

      <section className="admin-home-section fade-up fade-up-delay-1">
        <div className="section-header">
          <div>
            <h2 className="section-title">Rotinas do dia</h2>
            <p className="section-copy">
              Pontos de entrada para o que normalmente precisa ser resolvido primeiro.
            </p>
          </div>
        </div>

        <div className="admin-home-grid admin-home-grid-primary">
          {atalhosPrincipais.map((item) => (
            <Link key={item.href} href={item.href} className="admin-home-card admin-home-card-primary">
              <span className="admin-home-card-kicker">{item.kicker}</span>
              <strong className="admin-home-card-title">{item.titulo}</strong>
              <p className="admin-home-card-copy">{item.descricao}</p>
              <span className="admin-home-card-action">Abrir modulo</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-home-section fade-up fade-up-delay-2">
        <div className="section-header">
          <div>
            <h2 className="section-title">Gestao e acompanhamento</h2>
            <p className="section-copy">
              Dashboards e modulos de suporte para leitura gerencial e decisao rapida.
            </p>
          </div>
        </div>

        <div className="admin-home-grid admin-home-grid-secondary">
          {atalhosSuporte.map((item) => (
            <Link key={item.href} href={item.href} className="admin-home-card admin-home-card-secondary">
              <strong className="admin-home-card-title">{item.titulo}</strong>
              <p className="admin-home-card-copy">{item.descricao}</p>
              <span className="admin-home-card-action">Ir para a tela</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-home-section fade-up fade-up-delay-3">
        <div className="surface section-card admin-home-compact-panel">
          <div className="section-header">
            <div>
              <h2 className="section-title">Cadastros uteis</h2>
              <p className="section-copy">
                Acessos diretos para manter a base mestre atualizada sem navegar pelo menu todo.
              </p>
            </div>
          </div>

          <div className="admin-home-chip-row">
            {atalhosCadastro.map((item) => (
              <Link key={item.href} href={item.href} className="admin-home-chip-link">
                {item.titulo}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
