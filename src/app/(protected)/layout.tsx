import type { Route } from "next";
import Link from "next/link";
import { ReactNode } from "react";
import { logout } from "./actions";
import { AdminNav } from "@/components/admin-nav";
import { BaseproLogo } from "@/components/branding/basepro-logo";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarScrollArea } from "@/components/layout/sidebar-scroll-area";
import { hasRoleAccess, requireSession } from "@/lib/auth-guards";

const navigationGroups = [
  {
    label: "Dashboards",
    icon: "dashboard",
    description: "Painel financeiro e acompanhamento consolidado da frota.",
    items: [
      { href: "/dashboard", label: "Dashboard de faturamento" },
      { href: "/dashboard/custos", label: "Dashboard de custos" },
      { href: "/dashboard/km-horimetro", label: "KM/Horimetro mensal" },
      { href: "/frota/dashboard", label: "Dashboard da frota" },
      { href: "/dashboard/executivo", label: "Dashboard executivo" }
    ]
  },
  {
    label: "Cadastros",
    icon: "cadastros",
    description: "Base mestre para cliente, obra, recurso e equipe.",
    items: [
      { href: "/clientes", label: "Cadastro de clientes" },
      { href: "/obras", label: "Cadastro de obras" },
      { href: "/equipamentos", label: "Cadastro de equipamentos" },
      { href: "/materiais", label: "Cadastro de materiais" },
      { href: "/servicos", label: "Cadastro de servicos" },
      { href: "/colaboradores", label: "Cadastro de colaboradores" }
    ]
  },
  {
    label: "Operacao",
    icon: "operacao",
    description: "Lancamento diario, consulta e medicao operacional.",
    items: [
      { href: "/orcamentos" as Route, label: "Orcamentos" },
      { href: "/programacao", label: "Agenda de programacao" },
      { href: "/lancamentos", label: "Lancamentos" },
      { href: "/historico", label: "Historico" },
      { href: "/medicoes", label: "Medicoes" }
    ]
  },
  {
    label: "Financeiro",
    icon: "financeiro",
    description: "Compras, fornecedores e documentos de apoio financeiro.",
    items: [
      { href: "/fornecedores", label: "Cadastro de fornecedores" },
      { href: "/plano-contas", label: "Cadastro de plano de contas" },
      { href: "/centros-custo", label: "Cadastro de centros de custo" },
      { href: "/catalogo-compras", label: "Cadastro de produtos e servicos" },
      { href: "/ordens-compra", label: "Ordem de compra" }
    ]
  },
  {
    label: "Frota",
    icon: "frota",
    description: "Leituras, manutencao e acompanhamento dos recursos.",
    items: [
      { href: "/frota/manutencao", label: "Painel de manutencao" },
      { href: "/frota/leituras", label: "Leituras de horimetro/KM" },
      { href: "/frota/planos", label: "Plano preventivo" }
    ]
  }
] satisfies {
  label: string;
  icon?: string;
  description: string;
  items: { href: Route; label: string }[];
}[];

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await requireSession();
  const canManageUsers = hasRoleAccess(session.user.roles, "users.manage");
  const canReadAudit = hasRoleAccess(session.user.roles, "auditoria.read");
  const isMaster = session.user.isMaster;

  const securityItems = [
    ...(canManageUsers ? [{ href: "/usuarios" as Route, label: "Usuarios e acessos" }] : []),
    ...(canReadAudit
      ? [{ href: "/seguranca/logs-lancamentos" as Route, label: "Logs de edicao de lancamentos" }]
      : [])
  ];

  const navigation = [
    ...(isMaster
      ? [
          {
            label: "Master",
            icon: "master",
            description: "Administracao SaaS, empresas e usuarios por tenant.",
            items: [{ href: "/master" as Route, label: "Painel Master" }]
          }
        ]
      : []),
    ...navigationGroups,
    ...(securityItems.length > 0
      ? [
          {
            label: "Seguranca",
            icon: "seguranca",
            description: "Controle administrativo, acessos e trilha de auditoria.",
            items: securityItems
          }
        ]
      : [])
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <SidebarScrollArea>
          <div className="admin-brand">
            <Link href="/inicio" className="admin-brand-link" aria-label="Ir para a home operacional">
              <BaseproLogo theme="dark" showTagline={false} className="admin-brand-logo" />
            </Link>
          </div>

          <div className="admin-user-card">
            <p className="admin-user-label">Sessao ativa</p>
            <p className="admin-user-email">{session.user.email}</p>
          </div>

          <AdminNav groups={navigation} />

          <form action={logout}>
            <button type="submit" className="admin-logout">
              Encerrar sessao
            </button>
          </form>
        </SidebarScrollArea>
      </aside>

      <div className="admin-main">
        <AppHeader userEmail={session.user.email ?? ""} userName={session.user.name} isMaster={isMaster} />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
