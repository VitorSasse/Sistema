import type { TipoPlanoConta } from "@prisma/client";

type PlanoContaSequencial = {
  id: string;
  classificacao: string;
  tipo: TipoPlanoConta;
  categoria: string | null;
};

const BASE_CLASSIFICACAO: Record<TipoPlanoConta, string> = {
  DESPESA: "3",
  RECEITA: "4"
};

function padSegment(value: number) {
  return String(value).padStart(2, "0");
}

export function normalizarCategoriaPlanoConta(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.toUpperCase() : "GERAL";
}

export function parseClassificacaoPlanoConta(value: string) {
  const match = value.trim().match(/^([34])\.(\d{1,2})\.(\d{1,2})$/);

  if (!match) {
    return null;
  }

  return {
    grupo: match[1],
    grupoCategoria: Number(match[2]),
    conta: Number(match[3])
  };
}

export function montarClassificacaoPlanoConta(params: {
  tipo: TipoPlanoConta;
  grupoCategoria: number;
  conta: number;
}) {
  return `${BASE_CLASSIFICACAO[params.tipo]}.${padSegment(params.grupoCategoria)}.${padSegment(params.conta)}`;
}

export function calcularProximaClassificacaoPlanoConta(params: {
  tipo: TipoPlanoConta;
  categoria?: string | null;
  items: PlanoContaSequencial[];
  excludeId?: string;
}) {
  const categoriaAlvo = normalizarCategoriaPlanoConta(params.categoria);
  const grupoBase = BASE_CLASSIFICACAO[params.tipo];
  const gruposCategoria = new Map<string, { grupoCategoria: number; maiorConta: number }>();
  let maiorGrupoCategoria = 0;

  for (const item of params.items) {
    if (item.id === params.excludeId || item.tipo !== params.tipo) {
      continue;
    }

    const parsed = parseClassificacaoPlanoConta(item.classificacao);

    if (!parsed || parsed.grupo !== grupoBase) {
      continue;
    }

    const categoriaNormalizada = normalizarCategoriaPlanoConta(item.categoria);
    const atual = gruposCategoria.get(categoriaNormalizada);

    gruposCategoria.set(categoriaNormalizada, {
      grupoCategoria: atual ? atual.grupoCategoria : parsed.grupoCategoria,
      maiorConta: Math.max(atual?.maiorConta ?? 0, parsed.conta)
    });

    maiorGrupoCategoria = Math.max(maiorGrupoCategoria, parsed.grupoCategoria);
  }

  const grupoExistente = gruposCategoria.get(categoriaAlvo);
  const grupoCategoria = grupoExistente?.grupoCategoria ?? maiorGrupoCategoria + 1;
  const proximaConta = (grupoExistente?.maiorConta ?? 0) + 1;

  return montarClassificacaoPlanoConta({
    tipo: params.tipo,
    grupoCategoria,
    conta: proximaConta
  });
}
