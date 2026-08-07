"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Calculator,
  ClipboardList,
  FileText,
  Gauge,
  Home,
  Search
} from "lucide-react";
import { AppUserMenu } from "@/components/layout/app-user-menu";
import { MasterCompanySelector } from "@/components/layout/master-company-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserCompanySelector } from "@/components/layout/user-company-selector";

type AppHeaderProps = {
  userEmail: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  companyName?: string | null;
  isMaster?: boolean;
  empresaAtualId?: string;
  empresasAcesso?: Array<{
    empresaId: string;
    nome: string;
    nomeFantasia: string | null;
    razaoSocial: string | null;
  }>;
};

type RouteMeta = {
  title: string;
  group: string;
};

type QuickAction = {
  href: Route;
  label: string;
  description: string;
  keywords: string;
  icon: typeof ClipboardList;
};

const routeMeta: Array<{ prefix: string; meta: RouteMeta }> = [
  { prefix: "/inicio", meta: { title: "Home operacional", group: "Inicio" } },
  { prefix: "/perfil", meta: { title: "Meu perfil", group: "Conta" } },
  { prefix: "/master", meta: { title: "Painel da Plataforma", group: "Seguranca" } },
  { prefix: "/dashboard/custos", meta: { title: "Dashboard de custos", group: "Dashboards" } },
  { prefix: "/dashboard/km-horimetro", meta: { title: "KM e horimetro", group: "Dashboards" } },
  { prefix: "/dashboard/executivo", meta: { title: "Dashboard executivo", group: "Dashboards" } },
  { prefix: "/dashboard", meta: { title: "Dashboard de faturamento", group: "Dashboards" } },
  { prefix: "/frota/dashboard", meta: { title: "Dashboard da frota", group: "Frota" } },
  { prefix: "/frota/manutencao", meta: { title: "Painel de manutencao", group: "Frota" } },
  { prefix: "/frota/leituras", meta: { title: "Leituras de horimetro/KM", group: "Frota" } },
  { prefix: "/frota/planos", meta: { title: "Plano preventivo", group: "Frota" } },
  { prefix: "/lancamentos", meta: { title: "Lancamentos", group: "Operacao" } },
  { prefix: "/medicoes", meta: { title: "Medicoes", group: "Operacao" } },
  { prefix: "/orcamentos", meta: { title: "Orcamentos", group: "Operacao" } },
  { prefix: "/execucoes", meta: { title: "Execucao e Resultado", group: "Operacao" } },
  { prefix: "/programacao", meta: { title: "Agenda de programacao", group: "Operacao" } },
  { prefix: "/historico", meta: { title: "Historico", group: "Operacao" } },
  { prefix: "/ordens-compra", meta: { title: "Ordens de compra", group: "Financeiro" } },
  { prefix: "/fornecedores", meta: { title: "Fornecedores", group: "Financeiro" } },
  { prefix: "/plano-contas", meta: { title: "Plano de contas", group: "Financeiro" } },
  { prefix: "/centros-custo", meta: { title: "Centros de custo", group: "Financeiro" } },
  { prefix: "/catalogo-compras", meta: { title: "Produtos e servicos", group: "Financeiro" } },
  { prefix: "/clientes", meta: { title: "Clientes", group: "Cadastros" } },
  { prefix: "/obras", meta: { title: "Obras", group: "Cadastros" } },
  { prefix: "/equipamentos", meta: { title: "Equipamentos", group: "Cadastros" } },
  { prefix: "/materiais", meta: { title: "Materiais", group: "Cadastros" } },
  { prefix: "/servicos", meta: { title: "Servicos", group: "Cadastros" } },
  { prefix: "/colaboradores", meta: { title: "Colaboradores", group: "Cadastros" } },
  { prefix: "/usuarios", meta: { title: "Usuarios e acessos", group: "Seguranca" } },
  { prefix: "/seguranca", meta: { title: "Seguranca", group: "Auditoria" } }
];

const quickActions: QuickAction[] = [
  {
    href: "/lancamentos",
    label: "Novo lancamento",
    description: "Fichas, apontamentos e romaneios",
    keywords: "lancamento ficha apontamento romaneio producao",
    icon: ClipboardList
  },
  {
    href: "/medicoes",
    label: "Medicoes",
    description: "Gerar, revisar e fechar medicoes",
    keywords: "medicao faturamento cliente pdf nota pedido",
    icon: Calculator
  },
  {
    href: "/ordens-compra",
    label: "Ordem de compra",
    description: "Compras, servicos e anexos",
    keywords: "ordem compra servico produto fornecedor nota fiscal",
    icon: FileText
  },
  {
    href: "/programacao",
    label: "Agenda",
    description: "Programacao da frota",
    keywords: "agenda programacao frota equipamento",
    icon: Activity
  },
  {
    href: "/frota/manutencao",
    label: "Manutencao",
    description: "Revisoes e preventivas",
    keywords: "manutencao plano preventivo revisao horimetro km",
    icon: Gauge
  }
];

function resolveRouteMeta(pathname: string): RouteMeta {
  const match = routeMeta
    .filter((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match?.meta ?? { title: "BASEPRO", group: "Sistema" };
}

export function AppHeader({
  userEmail,
  userName,
  userAvatarUrl,
  companyName,
  isMaster = false,
  empresaAtualId = "",
  empresasAcesso = []
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const meta = resolveRouteMeta(pathname);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return quickActions.slice(0, 4);
    }

    return quickActions
      .filter((action) =>
        `${action.label} ${action.description} ${action.keywords}`.toLowerCase().includes(normalized)
      )
      .slice(0, 5);
  }, [query]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (filteredActions[0]) {
      router.push(filteredActions[0].href);
      setQuery("");
      setIsSearchOpen(false);
    }
  }

  return (
    <header className="app-header">
      <div className="app-header-main">
        <div className="app-breadcrumb" aria-label="Caminho da pagina">
          <Link href="/inicio" className="app-breadcrumb-home" aria-label="Ir para a home operacional">
            <Home size={15} />
          </Link>
          <span>BASEPRO</span>
          <span>{meta.group}</span>
          <strong>{meta.title}</strong>
        </div>
      </div>

      <div className="app-header-actions">
        <form className="app-search" onSubmit={handleSearchSubmit}>
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
            placeholder="Buscar clientes, obras, equipamentos ou modulos..."
            aria-label="Buscar atalhos do sistema"
          />
          <kbd>Ctrl K</kbd>
          {isSearchOpen ? (
            <div className="app-search-menu">
              {filteredActions.length > 0 ? (
                filteredActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="app-search-item"
                      onClick={() => {
                        setQuery("");
                        setIsSearchOpen(false);
                      }}
                    >
                      <Icon size={17} />
                      <span>
                        <strong>{action.label}</strong>
                        <small>{action.description}</small>
                      </span>
                    </Link>
                  );
                })
              ) : (
                <span className="app-search-empty">Nenhum atalho encontrado.</span>
              )}
            </div>
          ) : null}
        </form>

        {isMaster ? (
          <MasterCompanySelector />
        ) : empresasAcesso.length > 1 ? (
          <UserCompanySelector empresas={empresasAcesso} empresaAtualId={empresaAtualId} />
        ) : companyName ? (
          <div className="app-company-readonly">
            <span>Empresa atual</span>
            <strong>{companyName}</strong>
          </div>
        ) : null}

        <ThemeToggle />

        <AppUserMenu
          userName={userName?.trim() || "Usuario"}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
        />
      </div>
    </header>
  );
}
