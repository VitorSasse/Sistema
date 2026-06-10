import type { Route } from "next";
import { ReactNode } from "react";
import { logout } from "./actions";
import { BaseproLogo } from "@/components/branding/basepro-logo";
import { SidebarScrollArea } from "@/components/layout/sidebar-scroll-area";
import { NavegacaoAdmin } from "@/components/navegacao-admin";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { obterNavegacaoAdmin } from "@/lib/configuracao/navegacao-admin";
import { hasRoleAccess, requireSession } from "@/lib/auth-guards";

type PropriedadesLayoutProtegido = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: PropriedadesLayoutProtegido) {
  const sessao = await requireSession();
  const podeGerenciarUsuarios = hasRoleAccess(sessao.user.roles, "users.manage");
  const navegacao = obterNavegacaoAdmin(podeGerenciarUsuarios);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <SidebarScrollArea>
          <div className="admin-brand">
            <BaseproLogo theme="dark" showTagline={false} className="admin-brand-logo" />
          </div>

          <div className="admin-user-card">
            <p className="admin-user-label">Sessao ativa</p>
            <p className="admin-user-email">{sessao.user.email}</p>
            <ThemeToggle />
          </div>

          <NavegacaoAdmin grupos={navegacao} />

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
