export type PropostaPdfItemBase = {
  ordem: number;
  tipoItem: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorTotal: number;
};

export type PropostaPdfFrenteBase = {
  ordem: number;
  nome: string;
  descricao: string | null;
  unidadeProducao: string | null;
  quantidadePrevista: number | null;
};

const tiposComerciais = new Set([
  "COMERCIAL",
  "SERVICO_PRINCIPAL",
  "SERVICO_AUXILIAR",
  "MATERIAL",
  "LOCACAO",
  "TRANSPORTE",
  "SUBEMPREITADA",
  "VERBA"
]);

export function formatarUnidadeComercial(value?: string | null, quantidade?: number | null) {
  if (!value?.trim()) {
    return "-";
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized === "mes" || normalized === "meses") {
    return Number(quantidade) === 1 ? "mês" : "meses";
  }

  const labels: Record<string, string> = {
    m3: "m³",
    "m³": "m³",
    m2: "m²",
    "m²": "m²",
    tonelada: "t",
    toneladas: "t"
  };

  return labels[normalized] ?? value;
}

export function selecionarItensComerciais<T extends PropostaPdfItemBase>(itens: T[]) {
  return itens
    .filter((item) => tiposComerciais.has(item.tipoItem.toUpperCase()))
    .filter((item) => Math.abs(item.valorTotal) > 0)
    .sort((first, second) => first.ordem - second.ordem);
}

export function montarFrentesComerciais(
  frentes: PropostaPdfFrenteBase[],
  itens: PropostaPdfItemBase[]
) {
  if (frentes.length > 0) {
    return [...frentes].sort((first, second) => first.ordem - second.ordem);
  }

  return itens
    .filter((item) => item.tipoItem.toUpperCase() === "SERVICO_PRINCIPAL")
    .map((item) => ({
      ordem: item.ordem,
      nome: item.descricao,
      descricao: null,
      unidadeProducao: item.unidade,
      quantidadePrevista: item.quantidade
    }))
    .sort((first, second) => first.ordem - second.ordem);
}

export function resolverValorGlobalProposta(params: {
  snapshotValorTotal?: number | null;
  propostaValorTotal?: number | null;
  orcamentoValorTotal: number;
}) {
  if (params.snapshotValorTotal !== null && params.snapshotValorTotal !== undefined) {
    return params.snapshotValorTotal;
  }

  if (params.propostaValorTotal !== null && params.propostaValorTotal !== undefined) {
    return params.propostaValorTotal;
  }

  return params.orcamentoValorTotal;
}
