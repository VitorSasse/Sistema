import type { Route } from "next";

export type ItemNavegacaoAdmin = {
  href: Route;
  rotulo: string;
};

export type GrupoNavegacaoAdmin = {
  rotulo: string;
  descricao: string;
  itens: ItemNavegacaoAdmin[];
  icone?: string;
};

const gruposBaseNavegacao = [
  {
    rotulo: "Dashboards",
    icone: "dashboard",
    descricao: "Painel financeiro e acompanhamento consolidado da frota.",
    itens: [
      { href: "/dashboard", rotulo: "Dashboard de faturamento" },
      { href: "/frota/dashboard", rotulo: "Dashboard da frota" },
      { href: "/dashboard/executivo", rotulo: "Dashboard executivo" }
    ]
  },
  {
    rotulo: "Cadastros",
    icone: "cadastros",
    descricao: "Base mestre para cliente, obra, recurso e equipe.",
    itens: [
      { href: "/clientes", rotulo: "Cadastro de clientes" },
      { href: "/obras", rotulo: "Cadastro de obras" },
      { href: "/equipamentos", rotulo: "Cadastro de equipamentos" },
      { href: "/materiais", rotulo: "Cadastro de materiais" },
      { href: "/servicos", rotulo: "Cadastro de servicos" },
      { href: "/colaboradores", rotulo: "Cadastro de colaboradores" }
    ]
  },
  {
    rotulo: "Operacao",
    icone: "operacao",
    descricao: "Lancamento diario, consulta e medicao operacional.",
    itens: [
      { href: "/programacao", rotulo: "Agenda de programacao" },
      { href: "/lancamentos", rotulo: "Lancamentos" },
      { href: "/historico", rotulo: "Historico" },
      { href: "/medicoes", rotulo: "Medicoes" }
    ]
  },
  {
    rotulo: "Frota",
    icone: "frota",
    descricao: "Leituras, manutencao e acompanhamento dos recursos.",
    itens: [
      { href: "/frota/leituras", rotulo: "Leituras de horimetro/KM" },
      { href: "/frota/planos", rotulo: "Plano preventivo" }
    ]
  }
] satisfies GrupoNavegacaoAdmin[];

export function obterNavegacaoAdmin(podeGerenciarUsuarios: boolean) {
  if (!podeGerenciarUsuarios) {
    return gruposBaseNavegacao;
  }

  return [
    ...gruposBaseNavegacao,
    {
      rotulo: "Seguranca",
      icone: "seguranca",
      descricao: "Controle administrativo de acessos e perfis.",
      itens: [{ href: "/usuarios" as Route, rotulo: "Usuarios e acessos" }]
    }
  ] satisfies GrupoNavegacaoAdmin[];
}

export const montarNavegacaoAdmin = obterNavegacaoAdmin;
