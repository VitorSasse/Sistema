import type { Route } from "next";
import { ReactNode } from "react";
import { logout } from "./actions";
import { AdminNav } from "@/components/admin-nav";
import { BaseproLogo } from "@/components/branding/basepro-logo";
import { SidebarScrollArea } from "@/components/layout/sidebar-scroll-area";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { hasRoleAccess, requireSession } from "@/lib/auth-guards";

const navigationGroups = [
  {
    label: "Dashboards",
    description: "Painel financeiro e acompanhamento consolidado da frota.",
    items: [
      { href: "/dashboard", label: "Dashboard de faturamento" },
      { href: "/frota/dashboard", label: "Dashboard da frota" },
      { href: "/dashboard/executivo", label: "Dashboard executivo" }
    ]
  },
  {
    label: "Cadastros",
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
    description: "Lancamento diario, consulta e medicao operacional.",
    items: [
      { href: "/programacao", label: "Agenda de programacao" },
      { href: "/lancamentos", label: "Lancamentos" },
      { href: "/historico", label: "Historico" },
      { href: "/medicoes", label: "Medicoes" }
    ]
  },
  {
    label: "Frota",
    description: "Leituras, manutencao e acompanhamento dos recursos.",
    items: [
      { href: "/frota/leituras", label: "Leituras de horimetro/KM" },
      { href: "/frota/planos", label: "Plano preventivo" }
    ]
  }
] satisfies {
  label: string;
  description: string;
  items: { href: Route; label: string }[];
}[];

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await requireSession();
  const canManageUsers = hasRoleAccess(session.user.roles, "users.manage");

  const navigation = canManageUsers
    ? [
        ...navigationGroups,
        {
          label: "Seguranca",
          description: "Controle administrativo de acessos e perfis.",
          items: [{ href: "/usuarios" as Route, label: "Usuarios e acessos" }]
        }
      ]
    : navigationGroups;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <SidebarScrollArea>
          <div className="admin-brand">
            <span className="admin-brand-badge">Sistema completo para terraplenagem</span>
            <BaseproLogo theme="dark" showTagline={false} />
            <h2 className="admin-brand-title">Controle, produtividade e confianca</h2>
            <p className="admin-brand-copy">
              Sua operacao pesada, agora sob controle. Do campo ao faturamento, sem erros.
            </p>
          </div>

          <div className="admin-user-card">
            <p className="admin-user-label">Sessao ativa</p>
            <p className="admin-user-email">{session.user.email}</p>
            <ThemeToggle />
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
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
