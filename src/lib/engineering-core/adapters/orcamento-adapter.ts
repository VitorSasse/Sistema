import type {
  BaseEconomicaRecursoOperacional,
  EntradaNucleoEngenharia,
  ModoCustoUnidadeOperacional,
  OrigemPrazoNucleo,
  RecursoOperacionalNucleoInput,
  TipoCalculoRecursoOperacional,
  UnidadeOperacionalNucleoInput
} from "../contracts";

type OrcamentoAdapterFrente = {
  tempId?: string | null;
  localId?: string | null;
  ordem?: number | null;
  natureza?: string | null;
  nome?: string | null;
  descricao?: string | null;
  unidadeProducao?: string | number | null;
  quantidadePrevista?: string | number | null;
  receitaPrevista?: string | number | null;
  produtividadeDia?: string | number | null;
  prazoEstimadoDias?: string | number | null;
  prazoTeoricoDias?: string | number | null;
  prazoAdotadoDias?: string | number | null;
  origemPrazo?: string | null;
  modoCusto?: string | null;
  custoManual?: string | number | null;
};

type OrcamentoAdapterItem = {
  tempId?: string | null;
  localId?: string | null;
  frenteTempId?: string | null;
  frenteOrdem?: number | null;
  ordem?: number | null;
  tipoItem?: string | null;
  categoriaRecurso?: string | null;
  descricao?: string | null;
  recursoNome?: string | null;
  classeOperacional?: string | null;
  recursoReferenciaId?: string | null;
  quantidade?: string | number | null;
  quantidadeOperacional?: string | number | null;
  origemQuantidadeOperacional?: string | null;
  unidadeQuantidadeOperacional?: string | null;
  custoUnitario?: string | number | null;
  unidade?: string | null;
  tipoCalculoRecurso?: string | null;
  unidadeEconomicaCusto?: string | null;
  valorCusto?: string | number | null;
  horasDia?: string | number | null;
  horasTotais?: string | number | null;
  viagensDia?: string | number | null;
  viagensTotais?: string | number | null;
  distanciaViagemKm?: string | number | null;
  quilometrosTotais?: string | number | null;
  capacidadePorViagem?: string | number | null;
  unidadeCapacidade?: string | null;
  cargasTotais?: string | number | null;
  mesesTotais?: string | number | null;
  diasTrabalhadosMes?: string | number | null;
};

export type OrcamentoParaNucleoAdapterInput = {
  id?: string | null;
  codigo?: string | null;
  titulo?: string | null;
  frentes: OrcamentoAdapterFrente[];
  itens: OrcamentoAdapterItem[];
};

function isOperacional(frente: OrcamentoAdapterFrente) {
  return (frente.natureza ?? "OPERACIONAL") === "OPERACIONAL";
}

function isRecurso(item: OrcamentoAdapterItem) {
  return item.tipoItem === "RECURSO";
}

function frenteRef(frente: OrcamentoAdapterFrente) {
  return frente.localId?.trim() || frente.tempId?.trim() || `ordem:${frente.ordem ?? 0}`;
}

function itemFrenteRef(item: OrcamentoAdapterItem) {
  return item.frenteTempId?.trim() || (item.frenteOrdem ? `ordem:${item.frenteOrdem}` : "");
}

function recursoRef(item: OrcamentoAdapterItem) {
  return item.localId?.trim() || item.tempId?.trim() || `${itemFrenteRef(item)}:item:${item.ordem ?? 0}`;
}

function asOrigemPrazo(value?: string | null): OrigemPrazoNucleo | null {
  return value === "AUTOMATICO" || value === "AJUSTADO" ? value : null;
}

function asModoCusto(value?: string | null): ModoCustoUnidadeOperacional | null {
  return value === "AUTO" || value === "MANUAL" ? value : null;
}

function asOrigemQuantidade(value?: string | null) {
  return value === "PERSONALIZADA" ? "PERSONALIZADA" : "FRENTE";
}

function asTipoCalculo(value?: string | null): TipoCalculoRecursoOperacional | null {
  return value === "VALOR_TOTAL_MANUAL" ? "VALOR_TOTAL_MANUAL" : value === "AUTOMATICO" ? "AUTOMATICO" : null;
}

function asBaseEconomica(value?: string | null): BaseEconomicaRecursoOperacional | null {
  const allowed: BaseEconomicaRecursoOperacional[] = [
    "CUSTO_FIXO",
    "DIA",
    "HORA",
    "UNIDADE_PRODUZIDA",
    "M3",
    "M2",
    "KM",
    "VIAGEM",
    "CARGA",
    "MES",
    "UNIDADE",
    "VALOR_TOTAL"
  ];

  return allowed.includes(value as BaseEconomicaRecursoOperacional)
    ? (value as BaseEconomicaRecursoOperacional)
    : null;
}

function adaptarRecurso(item: OrcamentoAdapterItem, unidadeOperacionalId: string): RecursoOperacionalNucleoInput {
  return {
    id: recursoRef(item),
    unidadeOperacionalId,
    nomeTecnico: item.recursoNome,
    descricaoTecnica: item.descricao,
    categoria: item.categoriaRecurso,
    classeOperacional: item.classeOperacional,
    referenciaTecnicaId: item.recursoReferenciaId,
    quantidadeRecursos: item.quantidade,
    quantidadeOperacional: item.quantidadeOperacional,
    origemQuantidadeOperacional: asOrigemQuantidade(item.origemQuantidadeOperacional),
    unidadeQuantidadeOperacional: item.unidadeQuantidadeOperacional,
    custoUnitario: item.custoUnitario,
    unidadeCusto: item.unidade,
    tipoCalculo: asTipoCalculo(item.tipoCalculoRecurso),
    baseEconomica: asBaseEconomica(item.unidadeEconomicaCusto),
    valorCusto: item.valorCusto,
    horasDia: item.horasDia,
    horasTotais: item.horasTotais,
    viagensDia: item.viagensDia,
    viagensTotais: item.viagensTotais,
    distanciaViagemKm: item.distanciaViagemKm,
    quilometrosTotais: item.quilometrosTotais,
    capacidadePorViagem: item.capacidadePorViagem,
    unidadeCapacidade: item.unidadeCapacidade,
    cargasTotais: item.cargasTotais,
    mesesTotais: item.mesesTotais,
    diasTrabalhadosMes: item.diasTrabalhadosMes,
    origem: item.origemQuantidadeOperacional === "PERSONALIZADA" ? "PERSONALIZADO" : "INFORMADO"
  };
}

export function adaptarOrcamentoParaEntradaNucleo(input: OrcamentoParaNucleoAdapterInput): EntradaNucleoEngenharia {
  const frentesOperacionais = input.frentes.filter(isOperacional);
  const refsOperacionais = new Set(frentesOperacionais.map(frenteRef));

  const unidades: UnidadeOperacionalNucleoInput[] = frentesOperacionais.map((frente) => {
    const id = frenteRef(frente);
    const recursos = input.itens
      .filter((item) => isRecurso(item) && refsOperacionais.has(itemFrenteRef(item)) && itemFrenteRef(item) === id)
      .map((item) => adaptarRecurso(item, id));

    return {
      id,
      nome: frente.nome,
      descricaoTecnica: frente.descricao,
      quantidade: frente.quantidadePrevista,
      unidade: typeof frente.unidadeProducao === "number" ? String(frente.unidadeProducao) : frente.unidadeProducao,
      receita: frente.receitaPrevista,
      produtividade: frente.produtividadeDia,
      prazoEstimado: frente.prazoEstimadoDias,
      prazoTeorico: frente.prazoTeoricoDias,
      prazoAdotado: frente.prazoAdotadoDias,
      origemPrazo: asOrigemPrazo(frente.origemPrazo),
      modoCusto: asModoCusto(frente.modoCusto),
      custoManual: frente.custoManual,
      recursos,
      metadados: {
        origem: "ORCAMENTO",
        ordem: frente.ordem ?? null
      }
    };
  });

  return {
    contextoDeCalculo: "ORCAMENTO",
    analiseId: input.id ?? input.codigo ?? null,
    nomeTecnico: input.titulo ?? input.codigo ?? null,
    metadados: {
      origem: "ORCAMENTO"
    },
    unidades
  };
}
