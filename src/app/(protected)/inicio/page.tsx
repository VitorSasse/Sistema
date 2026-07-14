import type { Route } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileSearch,
  Gauge,
  HardHat,
  ReceiptText,
  ShoppingCart,
  Truck,
  UsersRound,
  type LucideIcon
} from "lucide-react";

type HomeLink = {
  href: Route;
  kicker?: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const primaryActions: HomeLink[] = [
  {
    href: "/lancamentos",
    kicker: "Operacao",
    title: "Lancamentos diarios",
    description: "Abra fichas, registre a producao e mantenha o dia operacional em ordem.",
    icon: ClipboardList
  },
  {
    href: "/medicoes",
    kicker: "Faturamento",
    title: "Medicoes operacionais",
    description: "Revise os apontamentos e prepare o fechamento dos servicos executados.",
    icon: ClipboardCheck
  },
  {
    href: "/programacao",
    kicker: "Agenda",
    title: "Programacao da frota",
    description: "Consulte alocacoes, disponibilidade e manutencoes em uma unica leitura.",
    icon: CalendarDays
  },
  {
    href: "/ordens-compra",
    kicker: "Compras",
    title: "Ordens de compra",
    description: "Crie compras e acompanhe fornecedores, documentos e aprovacoes.",
    icon: ShoppingCart
  }
];

const managementLinks: HomeLink[] = [
  {
    href: "/dashboard",
    title: "Faturamento",
    description: "Receita, medicoes e valores a faturar.",
    icon: BarChart3
  },
  {
    href: "/dashboard/custos",
    title: "Custos",
    description: "Compras, combustivel e manutencao.",
    icon: ReceiptText
  },
  {
    href: "/frota/dashboard",
    title: "Desempenho da frota",
    description: "Producao e comparativos por equipamento.",
    icon: Truck
  },
  {
    href: "/dashboard/executivo",
    title: "Controle executivo",
    description: "Utilizacao, disponibilidade e perdas.",
    icon: Gauge
  },
  {
    href: "/historico",
    title: "Historico operacional",
    description: "Consulte fichas e corrija divergencias.",
    icon: FileSearch
  },
  {
    href: "/frota/planos",
    title: "Plano preventivo",
    description: "Revisoes e vencimentos da manutencao.",
    icon: Clock3
  }
];

const registryLinks = [
  { href: "/clientes" as Route, label: "Clientes", icon: UsersRound },
  { href: "/obras" as Route, label: "Obras", icon: Building2 },
  { href: "/equipamentos" as Route, label: "Equipamentos", icon: HardHat },
  { href: "/fornecedores" as Route, label: "Fornecedores", icon: Truck }
];

export default function InicioPage() {
  return (
    <main className="basepro-home">
      <section className="basepro-home-hero fade-up">
        <div className="basepro-home-hero-copy">
          <span className="basepro-kicker">Central operacional</span>
          <h1>O trabalho do dia, sem ruido.</h1>
          <p>
            Acesse os fluxos essenciais da operacao, acompanhe os indicadores e mantenha a equipe
            alinhada a partir de uma unica central.
          </p>
        </div>

        <div className="basepro-home-hero-index" aria-label="Resumo dos acessos da home">
          <div>
            <span>Rotinas essenciais</span>
            <strong>{primaryActions.length}</strong>
            <small>atalhos operacionais</small>
          </div>
          <div>
            <span>Visoes de gestao</span>
            <strong>{managementLinks.length}</strong>
            <small>leituras consolidadas</small>
          </div>
          <div>
            <span>Acesso</span>
            <strong>1</strong>
            <small>clique por rotina</small>
          </div>
        </div>
      </section>

      <section className="basepro-home-section fade-up fade-up-delay-1">
        <header className="basepro-home-section-heading">
          <div>
            <span>Comece por aqui</span>
            <h2>Rotinas do dia</h2>
          </div>
          <p>Os pontos de entrada mais usados pela operacao.</p>
        </header>

        <div className="basepro-home-action-grid">
          {primaryActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="basepro-home-action-card">
                <span className="basepro-home-action-icon" aria-hidden="true">
                  <Icon size={21} strokeWidth={1.9} />
                </span>
                <span className="basepro-home-card-kicker">{item.kicker}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <span className="basepro-home-card-link">
                  Abrir modulo <ArrowUpRight size={16} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="basepro-home-section fade-up fade-up-delay-2">
        <header className="basepro-home-section-heading">
          <div>
            <span>Leitura gerencial</span>
            <h2>Gestao e acompanhamento</h2>
          </div>
          <p>Dashboards e consultas para decidir com mais contexto.</p>
        </header>

        <div className="basepro-home-management-grid">
          {managementLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="basepro-home-management-card">
                <span aria-hidden="true"><Icon size={19} /></span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="basepro-home-registry fade-up fade-up-delay-3">
        <div>
          <span className="basepro-kicker">Base mestre</span>
          <h2>Cadastros de acesso rapido</h2>
          <p>Mantenha as informacoes estruturais atualizadas sem percorrer todo o menu.</p>
        </div>
        <nav aria-label="Cadastros de acesso rapido">
          {registryLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </section>
    </main>
  );
}
