import type { Route } from "next";
import { ReactNode } from "react";
import { logout } from "./actions";
import { AdminNav } from "@/components/admin-nav";
import { BaseproLogo } from "@/components/branding/basepro-logo";
import { hasRoleAccess, requireSession } from "@/lib/auth-guards";

const navigationGroups = [
  {
    label: "Dashboard",
    description: "Visao executiva, financeira e acompanhamento consolidado.",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/executivo", label: "Painel executivo" },
      { href: "/frota/dashboard", label: "Frota e operacao" }
    ]
  },
  {
    label: "Operacao",
    description: "Fichas de bordo, agenda e historico operacional.",
    items: [
      { href: "/lancamentos", label: "Fichas de bordo" },
      { href: "/programacao", label: "Agenda de servicos" },
      { href: "/historico", label: "Historico operacional" }
    ]
  },
  {
    label: "Producao",
    description: "Medicoes, volumes e fechamento de producao.",
    items: [
      { href: "/medicoes", label: "Medicoes e volumes" },
      { href: "/dashboard/mensal", label: "Receita mensal" }
    ]
  },
  {
    label: "Equipamentos",
    description: "Cadastros, manutencao e leituras dos recursos.",
    items: [
      { href: "/equipamentos", label: "Equipamentos" },
      { href: "/frota/leituras", label: "Leituras de horimetro/KM" },
      { href: "/frota/planos", label: "Controle de manutencao" }
    ]
  },
  {
    label: "Gestao",
    description: "Base mestre, equipe e apoio financeiro/comercial.",
    items: [
      { href: "/obras", label: "Obras" },
      { href: "/clientes", label: "Clientes" },
      { href: "/colaboradores", label: "RH" },
      { href: "/servicos", label: "Financeiro e servicos" },
      { href: "/materiais", label: "Relatorios e materiais" }
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
        <div className="admin-sidebar-scroll">
          <div className="admin-brand">
            <span className="admin-brand-badge">Sistema completo para terraplenagem</span>
            <BaseproLogo theme="dark" />
            <h2 className="admin-brand-title">Controle, produtividade e confianca</h2>
            <p className="admin-brand-copy">
              Sua operacao pesada, agora sob controle. Do campo ao faturamento, sem erros.
            </p>
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
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">BASEPRO | Plataforma industrial de operacao pesada</h1>
            <p className="admin-topbar-copy">
              Lancamento de fichas de bordo, manutencao, agenda de servicos, producao, RH, financeiro e relatorios.
            </p>
          </div>
          <div className="badge badge-success">BASEPRO local</div>
        </header>

        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
