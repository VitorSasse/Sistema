import type { Route } from "next";
import { ReactNode } from "react";
import { logout } from "./actions";
import { AdminNav } from "@/components/admin-nav";
import { hasRoleAccess, requireSession } from "@/lib/auth-guards";

const navigationGroups = [
  {
    label: "Visao geral",
    description: "Painel executivo e acompanhamento rapido.",
    items: [{ href: "/dashboard", label: "Dashboard" }]
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
      { href: "/frota/dashboard", label: "Dashboard da frota" },
      { href: "/frota/leituras", label: "Leituras de horimetro/KM" },
      { href: "/frota/planos", label: "Plano preventivo" }
    ]
  },
  {
    label: "Expansao",
    description: "Modulo preparado para futuro financeiro.",
    items: [{ href: "/precos", label: "Precos" }]
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
            <span className="admin-brand-badge">Terraplenagem ERP</span>
            <h2 className="admin-brand-title">Operacao e medicao</h2>
            <p className="admin-brand-copy">
              Controle diario de fichas, obras, recursos e fechamento operacional em uma unica base.
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
            <h1 className="admin-topbar-title">Gestao operacional de fichas e medicao</h1>
            <p className="admin-topbar-copy">
              Ambiente de escritorio para cadastro mestre, apontamento diario, conferencia e fechamento.
            </p>
          </div>
          <div className="badge badge-success">Ambiente local</div>
        </header>

        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
