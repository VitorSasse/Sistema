import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { BaseproLogo } from "@/components/branding/basepro-logo";
import { AppHeader } from "@/components/layout/app-header";
import { CollapsibleAdminShell } from "@/components/layout/collapsible-admin-shell";
import { SidebarScrollArea } from "@/components/layout/sidebar-scroll-area";
import { hasModuleAccess, hasRoleAccess, requireSession } from "@/lib/auth-guards";
import type { AccessModule } from "@/lib/permissions";
import { withUnscopedPrisma } from "@/lib/prisma";
import { getPerfilUsuario } from "@/server/services/perfil";

const navigationGroups = [
  {
    label: "Dashboards",
    icon: "dashboard",
    description: "Painel financeiro e acompanhamento consolidado da frota.",
    items: [
      { href: "/dashboard", label: "Dashboard de faturamento", module: "dashboard_faturamento" },
      { href: "/dashboard/custos", label: "Dashboard de custos", module: "dashboard_custos" },
      { href: "/dashboard/km-horimetro", label: "KM/Horimetro mensal", module: "dashboard_km_horimetro" },
      { href: "/frota/dashboard", label: "Dashboard da frota", module: "dashboard_frota" },
      { href: "/dashboard/executivo", label: "Dashboard executivo", module: "dashboard_executivo" }
    ]
  },
  {
    label: "Operacao",
    icon: "operacao",
    description: "Lancamento diario, consulta e medicao operacional.",
    items: [
      { href: "/orcamentos" as Route, label: "Orcamentos", module: "orcamentos" },
      { href: "/programacao", label: "Agenda de programacao", module: "programacao" },
      { href: "/lancamentos", label: "Lancamentos", module: "lancamentos" },
      { href: "/historico", label: "Historico", module: "historico" },
      { href: "/medicoes", label: "Medicoes", module: "medicoes" }
    ]
  },
  {
    label: "Financeiro",
    icon: "financeiro",
    description: "Compras, fornecedores e documentos de apoio financeiro.",
    items: [
      { href: "/fornecedores", label: "Cadastro de fornecedores", module: "fornecedores" },
      { href: "/plano-contas", label: "Cadastro de plano de contas", module: "plano_contas" },
      { href: "/centros-custo", label: "Cadastro de centros de custo", module: "centros_custo" },
      { href: "/catalogo-compras", label: "Cadastro de produtos e servicos", module: "catalogo_compras" },
      { href: "/ordens-compra", label: "Ordem de compra", module: "ordens_compra" }
    ]
  },
  {
    label: "Frota",
    icon: "frota",
    description: "Leituras, manutencao e acompanhamento dos recursos.",
    items: [
      { href: "/frota/manutencao", label: "Painel de manutencao", module: "agenda_manutencao" },
      { href: "/frota/leituras", label: "Leituras de horimetro/KM", module: "leituras" },
      { href: "/frota/planos", label: "Plano preventivo", module: "planos_manutencao" }
    ]
  },
  {
    label: "Cadastros",
    icon: "cadastros",
    description: "Base mestre para cliente, obra, recurso e equipe.",
    items: [
      { href: "/clientes", label: "Cadastro de clientes", module: "clientes" },
      { href: "/obras", label: "Cadastro de obras", module: "obras" },
      { href: "/equipamentos", label: "Cadastro de equipamentos", module: "equipamentos" },
      { href: "/materiais", label: "Cadastro de materiais", module: "materiais" },
      { href: "/servicos", label: "Cadastro de servicos", module: "servicos" },
      { href: "/colaboradores", label: "Cadastro de colaboradores", module: "colaboradores" }
    ]
  }
] satisfies {
  label: string;
  icon?: string;
  description: string;
  items: { href: Route; label: string; module: AccessModule }[];
}[];

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = await requireSession();
  const profile = await getPerfilUsuario(session.user.id);

  if (!profile) {
    redirect("/login");
  }

  const canManageUsers = hasRoleAccess(session.user.roles, "users.manage", session.user);
  const canReadAudit = hasRoleAccess(session.user.roles, "auditoria.read", session.user);
  const isMaster = session.user.isMaster;
  const selectedEmpresa = session.user.empresaSelecionadaId
    ? await withUnscopedPrisma((db) =>
        db.empresa.findFirst({
          where: { id: session.user.empresaSelecionadaId!, status: "ATIVO", deletedAt: null },
          select: { nome: true, nomeFantasia: true, razaoSocial: true }
        })
      )
    : null;
  const companyName = selectedEmpresa
    ? selectedEmpresa.nomeFantasia || selectedEmpresa.razaoSocial || selectedEmpresa.nome
    : !isMaster
      ? profile.empresa?.nomeFantasia || profile.empresa?.razaoSocial
      : null;

  const securityItems = [
    ...(isMaster ? [{ href: "/master" as Route, label: "Painel Master", module: "master" as AccessModule }] : []),
    ...(canManageUsers ? [{ href: "/usuarios" as Route, label: "Usuarios e acessos", module: "usuarios" as AccessModule }] : []),
    ...(canReadAudit
      ? [{ href: "/seguranca/logs-lancamentos" as Route, label: "Logs de edicao de lancamentos", module: "auditoria" as AccessModule }]
      : [])
  ];

  const navigation = [
    ...navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasModuleAccess(session.user, item.module, "view"))
      }))
      .filter((group) => group.items.length > 0),
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
    <CollapsibleAdminShell
      sidebar={
        <SidebarScrollArea>
          <div className="admin-brand">
            <Link href="/inicio" className="admin-brand-link" aria-label="Ir para a home operacional">
              <BaseproLogo theme="dark" showTagline={false} className="admin-brand-logo" />
            </Link>
          </div>

          <div className="admin-company-context">
            <span>Empresa atual</span>
            <strong>{companyName || "Selecione uma empresa"}</strong>
          </div>

          <AdminNav groups={navigation} />
        </SidebarScrollArea>
      }
    >
      <AppHeader
        userEmail={profile.email}
        userName={profile.nome}
        userAvatarUrl={profile.fotoPerfilUrl}
        companyName={companyName}
        isMaster={isMaster}
      />
      <div className="admin-content">{children}</div>
    </CollapsibleAdminShell>
  );
}
