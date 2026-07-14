export const JORNADA_PADRAO_HORAS_DIA = 8;
export const DIAS_TRABALHADOS_MES_PADRAO = 22;

export type CostEngineModoCustoFrente = "AUTO" | "MANUAL";
export type CostEngineOrigemPrazo = "AUTOMATICO" | "AJUSTADO";
export type CostEngineTipoCalculoRecurso = "AUTOMATICO" | "VALOR_TOTAL_MANUAL";
export type CostEngineUnidadeEconomicaCusto =
  | "CUSTO_FIXO"
  | "DIA"
  | "HORA"
  | "KM"
  | "M3"
  | "M2"
  | "VIAGEM"
  | "CARGA"
  | "MES"
  | "UNIDADE_PRODUZIDA"
  | "UNIDADE"
  | "VALOR_TOTAL";

type UnidadeOperacional =
  | "HORA"
  | "DIA"
  | "KM"
  | "VIAGEM"
  | "SEMANA"
  | "MES"
  | "M3"
  | "M2"
  | "TON"
  | "CARGA"
  | "UN"
  | "DESCONHECIDA";

export type CostEngineFrenteInput = {
  ref: string;
  nome?: string | null;
  unidadeProducao?: string | null;
  quantidadePrevista?: string | number | null;
  produtividadeDia?: string | number | null;
  prazoEstimadoDias?: string | number | null;
  prazoTeoricoDias?: string | number | null;
  prazoAdotadoDias?: string | number | null;
  origemPrazo?: CostEngineOrigemPrazo | null;
  modoCusto?: CostEngineModoCustoFrente | null;
  custoManual?: string | number | null;
};

export type CostEngineRecursoInput = {
  ref?: string | null;
  frenteRef?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  quantidade?: string | number | null;
  custoOperacional?: string | number | null;
  unidadeCusto?: string | null;
  tipoCalculo?: CostEngineTipoCalculoRecurso | null;
  unidadeEconomicaCusto?: CostEngineUnidadeEconomicaCusto | null;
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

export type CostEnginePlanejamentoFrente = {
  quantidade: number;
  produtividadeInformada: number;
  produtividadeResultante: number;
  produtividadeAjustada: number;
  prazoTeorico: number;
  prazoAdotado: number;
  prazoUtilizado: number;
  prazoCalculo: number;
  origemPrazo: CostEngineOrigemPrazo;
  prazoUnidade: string;
};

export type CostEngineMemoriaRecurso = {
  recursoRef: string;
  frenteRef: string;
  frenteNome: string;
  categoria: string;
  descricao: string;
  quantidadeRecursos: number;
  custoOperacional: number;
  unidadeCustoOriginal: string;
  unidadeCustoFormatada: string;
  tipoCalculo: CostEngineTipoCalculoRecurso;
  unidadeEconomicaCusto: CostEngineUnidadeEconomicaCusto;
  horasDia: number;
  horasTotais: number;
  viagensDia: number;
  viagensTotais: number;
  distanciaViagemKm: number;
  quilometrosTotais: number;
  capacidadePorViagem: number;
  unidadeCapacidade: string;
  viagensTeoricas: number;
  viagensOperacionais: number;
  custoPorViagem: number;
  viagensMediasPorRecurso: number;
  cargasTotais: number;
  mesesTotais: number;
  diasTrabalhadosMes: number;
  baseConversao: number;
  custoTotal: number;
  custoUnitarioFrente: number;
  statusCalculo: "CALCULADO" | "PENDENTE";
  formula: string;
  observacoes: string[];
};

export type CostEngineFrenteResultado = {
  ref: string;
  nome: string;
  unidade: string;
  quantidade: number;
  produtividadeDia: number;
  produtividadeResultante: number;
  produtividadeAjustada: number;
  prazoTeoricoDias: number;
  prazoAdotadoDias: number;
  prazoDias: number;
  prazoUnidade: string;
  origemPrazo: CostEngineOrigemPrazo;
  custoDireto: number;
  custoDiretoUnitario: number;
  modoCusto: CostEngineModoCustoFrente;
  custoManual: number;
  custoCalculadoRecursos: number;
  origemCusto: "RECURSOS" | "MANUAL";
  recursos: CostEngineMemoriaRecurso[];
};

export type CostEngineResolucaoFrente = {
  custoFrente: number;
  modoCusto: CostEngineModoCustoFrente;
  custoManual: number;
  custoCalculadoRecursos: number;
  origemCusto: "RECURSOS" | "MANUAL";
  recursos: CostEngineMemoriaRecurso[];
  avisos: string[];
};

export type CostEngineGrupoUnidade = {
  unidade: string;
  quantidadeTotal: number;
  producaoPrevistaDia: number;
  prazoCritico: number;
  prazoUnidade: string;
  custoDireto: number;
  custoDiretoUnitario: number;
  frentes: string[];
};

export type CostEngineResultado = {
  custoDiretoTotal: number;
  quantidadeTotal: number;
  prazoEstimadoTotalDias: number;
  prazoCritico: {
    frenteNome: string;
    valor: number;
    unidade: string;
  } | null;
  custoDiretoUnitarioMedio: number;
  unidadesHomogeneas: boolean;
  gruposUnidade: CostEngineGrupoUnidade[];
  frentes: CostEngineFrenteResultado[];
  memoria: CostEngineMemoriaRecurso[];
  avisos: string[];
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundOperational(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/³/g, "3")
    .replace(/²/g, "2");
}

function normalizeUnidade(value?: string | null): UnidadeOperacional {
  const normalized = normalizeText(value)
    .replace("r$", "")
    .replace("por", "/")
    .replace(/\s+/g, "");

  if (!normalized) return "UN";
  if (normalized.includes("/h") || normalized.includes("hora")) return "HORA";
  if (normalized.includes("semana")) return "SEMANA";
  if (normalized.includes("mes")) return "MES";
  if (normalized.includes("dia") || normalized.includes("diaria")) return "DIA";
  if (normalized.includes("km")) return "KM";
  if (normalized.includes("viagem")) return "VIAGEM";
  if (normalized.includes("m3")) return "M3";
  if (normalized.includes("m2")) return "M2";
  if (normalized === "t" || normalized.includes("ton")) return "TON";
  if (normalized.includes("carga")) return "CARGA";
  if (["un", "und", "unidade", "unidades", "item"].includes(normalized)) return "UN";
  return "DESCONHECIDA";
}

function unidadesOperacionaisCompativeis(
  unidadeFrente: UnidadeOperacional,
  unidadeCapacidade: UnidadeOperacional
) {
  return unidadeFrente !== "DESCONHECIDA" &&
    unidadeCapacidade !== "DESCONHECIDA" &&
    unidadeFrente === unidadeCapacidade;
}

function unidadeEconomicaLegada(value?: string | null): CostEngineUnidadeEconomicaCusto {
  const unidade = normalizeUnidade(value);
  if (unidade === "DIA") return "DIA";
  if (unidade === "HORA") return "HORA";
  if (unidade === "KM") return "KM";
  if (unidade === "M3") return "M3";
  if (unidade === "VIAGEM" || unidade === "CARGA") return "VIAGEM";
  if (unidade === "MES") return "MES";
  return "UNIDADE";
}

export function formatarUnidadeCusto(value?: string | null) {
  const unidade = normalizeUnidade(value);
  if (unidade === "HORA") return "R$/h";
  if (unidade === "SEMANA") return "R$/semana";
  if (unidade === "MES") return "R$/mes";
  if (unidade === "DIA") return "R$/dia";
  if (unidade === "KM") return "R$/km";
  if (unidade === "VIAGEM") return "R$/viagem";
  if (unidade === "M3") return "R$/m3";
  if (unidade === "M2") return "R$/m2";
  if (unidade === "TON") return "R$/t";
  if (unidade === "CARGA") return "R$/carga";
  if (unidade === "UN") return "R$/un";
  return value?.trim() || "R$/un";
}

export function formatarUnidadeEconomica(value: CostEngineUnidadeEconomicaCusto) {
  const labels: Record<CostEngineUnidadeEconomicaCusto, string> = {
    CUSTO_FIXO: "R$/recurso",
    DIA: "R$/dia",
    HORA: "R$/hora",
    KM: "R$/km",
    M3: "R$/m3",
    M2: "R$/m2",
    VIAGEM: "R$/viagem",
    CARGA: "R$/carga",
    MES: "R$/mes",
    UNIDADE_PRODUZIDA: "R$/unidade produzida",
    UNIDADE: "R$/unidade",
    VALOR_TOTAL: "Valor total"
  };
  return labels[value];
}

function formatarUnidadeFrente(value?: string | null) {
  const unidade = normalizeUnidade(value);
  if (unidade === "M3") return "m3";
  if (unidade === "M2") return "m2";
  if (unidade === "TON") return "t";
  if (unidade === "CARGA") return "carga";
  if (unidade === "HORA") return "hora";
  if (unidade === "SEMANA") return "semana";
  if (unidade === "MES") return "mes";
  if (unidade === "KM") return "km";
  if (unidade === "VIAGEM") return "viagem";
  if (unidade === "DIA") return "dia";
  return value?.trim() || "un";
}

function getPrazoUnidade(unidadeFrente: UnidadeOperacional) {
  if (unidadeFrente === "HORA") return "hora(s)";
  if (unidadeFrente === "SEMANA") return "semana(s)";
  if (unidadeFrente === "MES") return "mes(es)";
  return "dia(s)";
}

export function calcularPlanejamentoFrente(frente: CostEngineFrenteInput): CostEnginePlanejamentoFrente {
  const quantidade = Math.max(0, toNumber(frente.quantidadePrevista));
  const produtividadeInformada = Math.max(0, toNumber(frente.produtividadeDia));
  const prazoCalculado = quantidade > 0 && produtividadeInformada > 0
    ? quantidade / produtividadeInformada
    : 0;
  const prazoTeoricoPersistido = Math.max(0, toNumber(frente.prazoTeoricoDias));
  const prazoTeorico = prazoCalculado > 0 ? prazoCalculado : prazoTeoricoPersistido;
  const prazoAdotadoExplicito = Math.max(0, toNumber(frente.prazoAdotadoDias));
  const possuiNovosCampos =
    frente.prazoTeoricoDias !== undefined ||
    frente.prazoAdotadoDias !== undefined ||
    frente.origemPrazo !== undefined;
  const prazoLegado = Math.max(0, toNumber(frente.prazoEstimadoDias));
  const prazoAdotado = prazoAdotadoExplicito > 0
    ? prazoAdotadoExplicito
    : !possuiNovosCampos && prazoLegado > 0
      ? prazoLegado
      : 0;
  const unidadeFrente = normalizeUnidade(frente.unidadeProducao);
  const prazoNatural =
    prazoTeorico > 0
      ? prazoTeorico
      : ["MES", "DIA", "HORA", "SEMANA"].includes(unidadeFrente)
        ? quantidade
        : 0;
  const prazoUtilizado = prazoAdotado > 0 ? prazoAdotado : prazoNatural;
  const origemPrazo: CostEngineOrigemPrazo = prazoAdotado > 0 ? "AJUSTADO" : "AUTOMATICO";
  const produtividadeResultante = prazoUtilizado > 0 && quantidade > 0
    ? quantidade / prazoUtilizado
    : produtividadeInformada;
  const produtividadeResultanteArredondada = roundOperational(produtividadeResultante);

  return {
    quantidade: roundMoney(quantidade),
    produtividadeInformada: roundMoney(produtividadeInformada),
    produtividadeResultante: produtividadeResultanteArredondada,
    produtividadeAjustada: produtividadeResultanteArredondada,
    prazoTeorico: roundMoney(prazoTeorico),
    prazoAdotado: roundMoney(prazoAdotado),
    prazoUtilizado: roundMoney(prazoUtilizado),
    prazoCalculo: prazoUtilizado,
    origemPrazo,
    prazoUnidade: getPrazoUnidade(unidadeFrente)
  };
}

function formatNumber(value: number) {
  return roundMoney(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatCurrency(value: number) {
  return roundMoney(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function unidadesCompativeis(unidadeCusto: UnidadeOperacional, unidadeFrente: UnidadeOperacional) {
  if (unidadeCusto === unidadeFrente) return true;
  if (unidadeCusto === "VIAGEM" && unidadeFrente === "CARGA") return true;
  if (unidadeCusto === "CARGA" && unidadeFrente === "VIAGEM") return true;
  return false;
}

function resolverLegado(params: {
  unidadeCusto: UnidadeOperacional;
  unidadeFrente: UnidadeOperacional;
  quantidadeFrente: number;
  prazoUtilizado: number;
  prazoUnidade: string;
}) {
  const observacoes: string[] = [];
  if (unidadesCompativeis(params.unidadeCusto, params.unidadeFrente)) {
    return { base: 1, descricao: "quantidade total informada do recurso", observacoes };
  }
  if (params.unidadeCusto === "UN" || params.unidadeCusto === "DESCONHECIDA") {
    return { base: 1, descricao: "1", observacoes };
  }
  if (params.unidadeCusto === "DIA") {
    if (params.prazoUnidade !== "dia(s)") {
      observacoes.push(`Recurso por dia nao convertido porque o prazo esta em ${params.prazoUnidade}.`);
      return { base: 0, descricao: "prazo da frente", observacoes };
    }
    return { base: params.prazoUtilizado, descricao: "prazo da frente em dias", observacoes };
  }
  if (params.unidadeCusto === "HORA") {
    if (params.unidadeFrente === "HORA") {
      return { base: params.quantidadeFrente, descricao: "quantidade da frente em horas", observacoes };
    }
    if (params.prazoUnidade !== "dia(s)") {
      observacoes.push(`Recurso por hora nao convertido porque o prazo esta em ${params.prazoUnidade}.`);
      return { base: 0, descricao: "prazo x jornada padrao", observacoes };
    }
    observacoes.push(`Conversao R$/h usando jornada padrao de ${JORNADA_PADRAO_HORAS_DIA} h/dia.`);
    return {
      base: params.prazoUtilizado * JORNADA_PADRAO_HORAS_DIA,
      descricao: `prazo da frente x ${JORNADA_PADRAO_HORAS_DIA} h/dia`,
      observacoes
    };
  }
  observacoes.push("Unidade do custo nao compativel; recurso tratado como custo unico.");
  return { base: 1, descricao: "1", observacoes };
}

function calcularRecurso(params: {
  frente: CostEngineFrenteInput;
  recurso: CostEngineRecursoInput;
  planejamento: CostEnginePlanejamentoFrente;
}) {
  const { frente, recurso, planejamento } = params;
  const quantidadeRecursos = Math.max(0, toNumber(recurso.quantidade));
  const valorCusto = Math.max(0, toNumber(recurso.valorCusto ?? recurso.custoOperacional));
  const tipoCalculo = recurso.tipoCalculo ?? "AUTOMATICO";
  const unidadeEconomica = recurso.unidadeEconomicaCusto ?? unidadeEconomicaLegada(recurso.unidadeCusto);
  const unidadeFrente = normalizeUnidade(frente.unidadeProducao);
  const unidadeFormatada = recurso.unidadeEconomicaCusto
    ? formatarUnidadeEconomica(unidadeEconomica)
    : formatarUnidadeCusto(recurso.unidadeCusto);
  const horasDia = Math.max(0, toNumber(recurso.horasDia)) || JORNADA_PADRAO_HORAS_DIA;
  const horasTotais = Math.max(0, toNumber(recurso.horasTotais));
  const viagensDia = Math.max(0, toNumber(recurso.viagensDia));
  const viagensTotais = Math.max(0, toNumber(recurso.viagensTotais));
  const distanciaViagemKm = Math.max(0, toNumber(recurso.distanciaViagemKm));
  const quilometrosTotais = Math.max(0, toNumber(recurso.quilometrosTotais));
  const capacidadePorViagem = Math.max(0, toNumber(recurso.capacidadePorViagem));
  const unidadeCapacidade = recurso.unidadeCapacidade?.trim() || "";
  const cargasTotais = Math.max(0, toNumber(recurso.cargasTotais));
  const mesesTotais = Math.max(0, toNumber(recurso.mesesTotais));
  const diasTrabalhadosMes =
    Math.max(0, toNumber(recurso.diasTrabalhadosMes)) || DIAS_TRABALHADOS_MES_PADRAO;
  const observacoes: string[] = [];
  let baseConversao = 1;
  let custoTotal = 0;
  let viagensTeoricas = 0;
  let viagensOperacionais = 0;
  let custoPorViagem = 0;
  let viagensMediasPorRecurso = 0;
  let calculavel = true;
  let formula = "";

  if (tipoCalculo === "VALOR_TOTAL_MANUAL") {
    custoTotal = quantidadeRecursos * valorCusto;
    formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)} = ${formatCurrency(custoTotal)}`;
  } else if (!recurso.unidadeEconomicaCusto) {
    const legado = resolverLegado({
      unidadeCusto: normalizeUnidade(recurso.unidadeCusto),
      unidadeFrente,
      quantidadeFrente: planejamento.quantidade,
      prazoUtilizado: planejamento.prazoCalculo,
      prazoUnidade: planejamento.prazoUnidade
    });
    baseConversao = legado.base;
    observacoes.push(...legado.observacoes);
    custoTotal = quantidadeRecursos * valorCusto * baseConversao;
    formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)} x ${legado.descricao} = ${formatCurrency(custoTotal)}`;
  } else {
    switch (unidadeEconomica) {
      case "CUSTO_FIXO": {
        baseConversao = quantidadeRecursos;
        custoTotal = quantidadeRecursos * valorCusto;
        formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)} fixo = ${formatCurrency(custoTotal)}`;
        break;
      }
      case "DIA": {
        if (unidadeFrente === "MES") {
          baseConversao = diasTrabalhadosMes * planejamento.quantidade;
          custoTotal = quantidadeRecursos * valorCusto * baseConversao;
          formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)}/dia x ${formatNumber(diasTrabalhadosMes)} dias/mes x ${formatNumber(planejamento.quantidade)} meses = ${formatCurrency(custoTotal)}`;
        } else {
          baseConversao = roundMoney(planejamento.prazoCalculo);
          custoTotal = quantidadeRecursos * valorCusto * baseConversao;
          formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)}/dia x ${formatNumber(baseConversao)} dias = ${formatCurrency(custoTotal)}`;
        }
        break;
      }
      case "HORA": {
        if (horasTotais > 0) {
          baseConversao = quantidadeRecursos * horasTotais;
          custoTotal = valorCusto * baseConversao;
          formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)}/hora x ${formatNumber(horasTotais)} horas = ${formatCurrency(custoTotal)}`;
        } else if (unidadeFrente === "HORA" && planejamento.quantidade > 0) {
          baseConversao = planejamento.quantidade;
          custoTotal = quantidadeRecursos * valorCusto * baseConversao;
          formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)}/hora x ${formatNumber(baseConversao)} horas = ${formatCurrency(custoTotal)}`;
        } else {
          baseConversao = horasDia * planejamento.prazoCalculo;
          custoTotal = quantidadeRecursos * valorCusto * baseConversao;
          formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)}/hora x ${formatNumber(horasDia)} h/dia x ${formatNumber(planejamento.prazoCalculo)} dias = ${formatCurrency(custoTotal)}`;
          observacoes.push("Compatibilidade: horas totais calculadas pela jornada diaria e pelo prazo da frente.");
        }
        break;
      }
      case "M3":
      case "M2":
      case "UNIDADE_PRODUZIDA": {
        const unidadeProducao = unidadeEconomica === "M3"
          ? "m3"
          : unidadeEconomica === "M2"
            ? "m2"
            : formatarUnidadeFrente(frente.unidadeProducao);
        baseConversao = planejamento.quantidade;
        custoTotal = valorCusto * baseConversao;
        formula = `${formatNumber(baseConversao)} ${unidadeProducao} x ${formatCurrency(valorCusto)}/${unidadeProducao} = ${formatCurrency(custoTotal)}`;
        break;
      }
      case "VIAGEM": {
        baseConversao = viagensTotais > 0
          ? viagensTotais
          : quantidadeRecursos * viagensDia * planejamento.prazoCalculo;
        custoTotal = valorCusto * baseConversao;
        formula = `${formatNumber(baseConversao)} viagens x ${formatCurrency(valorCusto)}/viagem = ${formatCurrency(custoTotal)}`;
        if (viagensTotais <= 0 && viagensDia <= 0) observacoes.push("Informe a quantidade total de viagens para calcular este recurso.");
        if (viagensTotais <= 0 && viagensDia > 0) observacoes.push("Compatibilidade: total calculado por viagens/dia e prazo da frente.");
        break;
      }
      case "KM": {
        const unidadeCapacidadeNormalizada = normalizeUnidade(unidadeCapacidade);
        const unidadeCompativel = unidadesOperacionaisCompativeis(
          unidadeFrente,
          unidadeCapacidadeNormalizada
        );

        if (recurso.unidadeEconomicaCusto === "KM") {
          if (planejamento.quantidade <= 0) observacoes.push("Informe uma quantidade prevista maior que zero na frente.");
          if (capacidadePorViagem <= 0) observacoes.push("Informe uma capacidade por viagem maior que zero.");
          if (!unidadeCapacidade) observacoes.push("Informe a unidade da capacidade por viagem.");
          if (unidadeCapacidade && !unidadeCompativel) {
            observacoes.push("A unidade da capacidade deve ser compativel com a unidade de producao da frente.");
          }
          if (distanciaViagemKm <= 0) observacoes.push("Informe uma distancia por viagem maior que zero.");
          if (quantidadeRecursos <= 0) observacoes.push("Informe a quantidade de caminhoes mobilizados.");

          calculavel = observacoes.length === 0;
          if (calculavel) {
            viagensTeoricas = planejamento.quantidade / capacidadePorViagem;
            viagensOperacionais = Math.ceil(viagensTeoricas - 1e-9);
            custoPorViagem = roundMoney(distanciaViagemKm * valorCusto);
            viagensMediasPorRecurso = viagensOperacionais / quantidadeRecursos;
            baseConversao = viagensOperacionais * distanciaViagemKm;
            custoTotal = viagensOperacionais * custoPorViagem;
            const unidadeFormatada = formatarUnidadeFrente(frente.unidadeProducao);
            formula = [
              `${formatNumber(planejamento.quantidade)} ${unidadeFormatada} / ${formatNumber(capacidadePorViagem)} ${unidadeFormatada}/viagem = ${formatNumber(viagensTeoricas)} viagens teoricas`,
              `Arredondamento operacional: ${viagensOperacionais.toLocaleString("pt-BR")} viagens`,
              `${formatNumber(distanciaViagemKm)} km/viagem x ${formatCurrency(valorCusto)}/km = ${formatCurrency(custoPorViagem)}/viagem`,
              `${viagensOperacionais.toLocaleString("pt-BR")} viagens x ${formatCurrency(custoPorViagem)}/viagem = ${formatCurrency(custoTotal)}`
            ].join("\n");
            observacoes.push(
              `${viagensOperacionais.toLocaleString("pt-BR")} viagens / ${formatNumber(quantidadeRecursos)} caminhoes = ${formatNumber(viagensMediasPorRecurso)} viagens medias por caminhao.`
            );
          } else {
            baseConversao = 0;
            formula = "Pendente de calculo: complete os parametros do transporte por km.";
          }
        } else {
          baseConversao = quilometrosTotais > 0
            ? quilometrosTotais
            : quantidadeRecursos * distanciaViagemKm * viagensDia * planejamento.prazoCalculo;
          custoTotal = valorCusto * baseConversao;
          formula = `${formatNumber(baseConversao)} km x ${formatCurrency(valorCusto)}/km = ${formatCurrency(custoTotal)}`;
          if (quilometrosTotais <= 0 && (distanciaViagemKm <= 0 || viagensDia <= 0)) {
            observacoes.push("Informe a quantidade total de quilometros para calcular este recurso.");
          }
          if (quilometrosTotais <= 0 && distanciaViagemKm > 0 && viagensDia > 0) {
            observacoes.push("Compatibilidade: quilometragem calculada por distancia, viagens/dia e prazo.");
          }
        }
        break;
      }
      case "CARGA": {
        baseConversao = cargasTotais;
        custoTotal = valorCusto * baseConversao;
        formula = `${formatNumber(baseConversao)} cargas x ${formatCurrency(valorCusto)}/carga = ${formatCurrency(custoTotal)}`;
        if (cargasTotais <= 0) observacoes.push("Informe a quantidade total de cargas para calcular este recurso.");
        break;
      }
      case "MES": {
        baseConversao = mesesTotais > 0
          ? mesesTotais
          : unidadeFrente === "MES"
          ? planejamento.quantidade
          : planejamento.prazoUnidade === "mes(es)"
            ? planejamento.prazoCalculo
            : 0;
        custoTotal = quantidadeRecursos * valorCusto * baseConversao;
        formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)}/mes x ${formatNumber(baseConversao)} meses = ${formatCurrency(custoTotal)}`;
        if (baseConversao <= 0) observacoes.push("A frente nao possui duracao em meses para este recurso.");
        break;
      }
      case "VALOR_TOTAL": {
        baseConversao = 1;
        custoTotal = valorCusto;
        formula = `Valor total informado = ${formatCurrency(custoTotal)}`;
        break;
      }
      case "UNIDADE":
      default: {
        baseConversao = quantidadeRecursos;
        custoTotal = quantidadeRecursos * valorCusto;
        formula = `${formatNumber(quantidadeRecursos)} x ${formatCurrency(valorCusto)}/unidade = ${formatCurrency(custoTotal)}`;
      }
    }
  }

  return {
    quantidadeRecursos,
    valorCusto,
    tipoCalculo,
    unidadeEconomica,
    unidadeFormatada,
    horasDia,
    horasTotais,
    viagensDia,
    viagensTotais,
    distanciaViagemKm,
    quilometrosTotais,
    capacidadePorViagem,
    unidadeCapacidade,
    viagensTeoricas,
    viagensOperacionais,
    custoPorViagem,
    viagensMediasPorRecurso,
    cargasTotais,
    mesesTotais,
    diasTrabalhadosMes,
    baseConversao: roundMoney(baseConversao),
    custoTotal: roundMoney(Math.max(0, custoTotal)),
    calculavel,
    formula,
    observacoes
  };
}

export function resolveFrontCost(
  frenteInput: CostEngineFrenteInput,
  recursosInput: CostEngineRecursoInput[]
): CostEngineResolucaoFrente {
  const avisos: string[] = [];
  const memoria: CostEngineMemoriaRecurso[] = [];
  const planejamento = calcularPlanejamentoFrente(frenteInput);
  const frenteNome = frenteInput.nome?.trim() || "Frente";
  let custoRecursos = 0;
  let possuiRecursoCalculavel = false;

  for (const recurso of recursosInput) {
    if (recurso.frenteRef && recurso.frenteRef !== frenteInput.ref) continue;
    const calculo = calcularRecurso({ frente: frenteInput, recurso, planejamento });
    const descricao = recurso.descricao?.trim() || "Recurso sem descricao";
    const transporteKmExplicito =
      calculo.tipoCalculo === "AUTOMATICO" &&
      recurso.unidadeEconomicaCusto === "KM";

    const usaValorTotalDireto =
      calculo.tipoCalculo === "AUTOMATICO" && calculo.unidadeEconomica === "VALOR_TOTAL";
    if (
      !transporteKmExplicito &&
      ((!usaValorTotalDireto && calculo.quantidadeRecursos <= 0) || calculo.valorCusto <= 0)
    ) {
      avisos.push(`Recurso "${descricao}" ignorado por quantidade ou custo zerado.`);
      continue;
    }
    if (!transporteKmExplicito && calculo.custoTotal <= 0) {
      avisos.push(`Recurso "${descricao}" nao gerou custo calculavel.`);
      avisos.push(...calculo.observacoes.map((item) => `${descricao}: ${item}`));
      continue;
    }

    const custoUnitarioFrente = planejamento.quantidade > 0
      ? roundMoney(calculo.custoTotal / planejamento.quantidade)
      : 0;
    const memoriaAtual: CostEngineMemoriaRecurso = {
      recursoRef: recurso.ref?.trim() || `${frenteInput.ref}:${memoria.length + 1}`,
      frenteRef: frenteInput.ref,
      frenteNome,
      categoria: recurso.categoria?.trim() || "RECURSO",
      descricao,
      quantidadeRecursos: roundMoney(calculo.quantidadeRecursos),
      custoOperacional: roundMoney(calculo.valorCusto),
      unidadeCustoOriginal: recurso.unidadeCusto?.trim() || calculo.unidadeFormatada,
      unidadeCustoFormatada: calculo.unidadeFormatada,
      tipoCalculo: calculo.tipoCalculo,
      unidadeEconomicaCusto: calculo.unidadeEconomica,
      horasDia: roundMoney(calculo.horasDia),
      horasTotais: roundMoney(calculo.horasTotais),
      viagensDia: roundMoney(calculo.viagensDia),
      viagensTotais: roundMoney(calculo.viagensTotais),
      distanciaViagemKm: roundMoney(calculo.distanciaViagemKm),
      quilometrosTotais: roundMoney(calculo.quilometrosTotais),
      capacidadePorViagem: roundOperational(calculo.capacidadePorViagem, 4),
      unidadeCapacidade: calculo.unidadeCapacidade,
      viagensTeoricas: roundOperational(calculo.viagensTeoricas, 4),
      viagensOperacionais: calculo.viagensOperacionais,
      custoPorViagem: roundMoney(calculo.custoPorViagem),
      viagensMediasPorRecurso: roundMoney(calculo.viagensMediasPorRecurso),
      cargasTotais: roundMoney(calculo.cargasTotais),
      mesesTotais: roundMoney(calculo.mesesTotais),
      diasTrabalhadosMes: roundMoney(calculo.diasTrabalhadosMes),
      baseConversao: calculo.baseConversao,
      custoTotal: calculo.custoTotal,
      custoUnitarioFrente,
      statusCalculo: calculo.calculavel ? "CALCULADO" : "PENDENTE",
      formula: calculo.formula,
      observacoes: calculo.observacoes
    };

    if (!calculo.calculavel) {
      memoria.push(memoriaAtual);
      avisos.push(`Recurso "${descricao}" pendente de calculo.`);
      avisos.push(...calculo.observacoes.map((item) => `${descricao}: ${item}`));
      continue;
    }

    const duplicadoLegado = !recurso.ref
      ? memoria.find((item) =>
          item.descricao === memoriaAtual.descricao &&
          item.categoria === memoriaAtual.categoria &&
          item.custoOperacional === memoriaAtual.custoOperacional &&
          item.unidadeCustoFormatada === memoriaAtual.unidadeCustoFormatada &&
          item.tipoCalculo === memoriaAtual.tipoCalculo
        )
      : undefined;

    if (duplicadoLegado) {
      duplicadoLegado.quantidadeRecursos = roundMoney(
        duplicadoLegado.quantidadeRecursos + memoriaAtual.quantidadeRecursos
      );
      duplicadoLegado.custoTotal = roundMoney(duplicadoLegado.custoTotal + memoriaAtual.custoTotal);
      duplicadoLegado.custoUnitarioFrente = planejamento.quantidade > 0
        ? roundMoney(duplicadoLegado.custoTotal / planejamento.quantidade)
        : 0;
      duplicadoLegado.formula = `${formatNumber(duplicadoLegado.quantidadeRecursos)} recursos equivalentes = ${formatCurrency(duplicadoLegado.custoTotal)}`;
    } else {
      memoria.push(memoriaAtual);
    }
    possuiRecursoCalculavel = true;
    custoRecursos = roundMoney(custoRecursos + calculo.custoTotal);
    avisos.push(...calculo.observacoes.map((item) => `${descricao}: ${item}`));
  }

  const custoManual = roundMoney(Math.max(0, toNumber(frenteInput.custoManual)));
  const possuiCustoValidoPorRecursos = possuiRecursoCalculavel;
  return {
    custoFrente: possuiCustoValidoPorRecursos ? custoRecursos : custoManual,
    modoCusto: possuiCustoValidoPorRecursos ? "AUTO" : "MANUAL",
    custoManual,
    custoCalculadoRecursos: custoRecursos,
    origemCusto: possuiCustoValidoPorRecursos ? "RECURSOS" : "MANUAL",
    recursos: memoria,
    avisos
  };
}

export function calcularMotorCustos(input: {
  frentes: CostEngineFrenteInput[];
  recursos: CostEngineRecursoInput[];
}): CostEngineResultado {
  const avisos: string[] = [];
  const frenteRefs = new Set(input.frentes.map((frente) => frente.ref));
  const recursosPorFrente = new Map<string, CostEngineRecursoInput[]>();

  for (const recurso of input.recursos) {
    const frenteRef = recurso.frenteRef?.trim();
    if (!frenteRef || !frenteRefs.has(frenteRef)) {
      avisos.push(`Recurso "${recurso.descricao || "sem descricao"}" sem frente valida foi ignorado.`);
      continue;
    }
    const recursos = recursosPorFrente.get(frenteRef) ?? [];
    recursos.push(recurso);
    recursosPorFrente.set(frenteRef, recursos);
  }

  const resultadosFrentes = input.frentes.map<CostEngineFrenteResultado>((frente) => {
    const planejamento = calcularPlanejamentoFrente(frente);
    const unidadeNormalizada = normalizeUnidade(frente.unidadeProducao);
    const resolucao = resolveFrontCost(frente, recursosPorFrente.get(frente.ref) ?? []);
    avisos.push(...resolucao.avisos);
    return {
      ref: frente.ref,
      nome: frente.nome?.trim() || "Frente",
      unidade: formatarUnidadeFrente(frente.unidadeProducao),
      quantidade: planejamento.quantidade,
      produtividadeDia: planejamento.produtividadeInformada,
      produtividadeResultante: planejamento.produtividadeResultante,
      produtividadeAjustada: planejamento.produtividadeAjustada,
      prazoTeoricoDias: planejamento.prazoTeorico,
      prazoAdotadoDias: planejamento.prazoAdotado,
      prazoDias: planejamento.prazoUtilizado,
      prazoUnidade: getPrazoUnidade(unidadeNormalizada),
      origemPrazo: planejamento.origemPrazo,
      custoDireto: resolucao.custoFrente,
      custoDiretoUnitario: planejamento.quantidade > 0
        ? roundMoney(resolucao.custoFrente / planejamento.quantidade)
        : 0,
      modoCusto: resolucao.modoCusto,
      custoManual: resolucao.custoManual,
      custoCalculadoRecursos: resolucao.custoCalculadoRecursos,
      origemCusto: resolucao.origemCusto,
      recursos: resolucao.recursos
    };
  });
  const memoria = resultadosFrentes.flatMap((frente) => frente.recursos);
  const custoDiretoTotal = roundMoney(resultadosFrentes.reduce((sum, frente) => sum + frente.custoDireto, 0));
  const grupoByUnidade = new Map<string, CostEngineGrupoUnidade>();

  for (const frente of resultadosFrentes) {
    const grupo = grupoByUnidade.get(frente.unidade) ?? {
      unidade: frente.unidade,
      quantidadeTotal: 0,
      producaoPrevistaDia: 0,
      prazoCritico: 0,
      prazoUnidade: frente.prazoUnidade,
      custoDireto: 0,
      custoDiretoUnitario: 0,
      frentes: []
    };
    grupo.quantidadeTotal = roundMoney(grupo.quantidadeTotal + frente.quantidade);
    grupo.producaoPrevistaDia = roundMoney(grupo.producaoPrevistaDia + frente.produtividadeAjustada);
    grupo.custoDireto = roundMoney(grupo.custoDireto + frente.custoDireto);
    grupo.prazoCritico = roundMoney(Math.max(grupo.prazoCritico, frente.prazoDias));
    grupo.custoDiretoUnitario = grupo.quantidadeTotal > 0
      ? roundMoney(grupo.custoDireto / grupo.quantidadeTotal)
      : 0;
    grupo.frentes.push(frente.nome);
    grupoByUnidade.set(frente.unidade, grupo);
  }

  const gruposUnidade = Array.from(grupoByUnidade.values());
  const unidadesHomogeneas = gruposUnidade.length <= 1;
  const quantidadeTotal = unidadesHomogeneas ? gruposUnidade[0]?.quantidadeTotal ?? 0 : 0;
  const prazoCriticoFrente = resultadosFrentes.reduce<CostEngineFrenteResultado | null>(
    (maior, frente) => (!maior || frente.prazoDias > maior.prazoDias ? frente : maior),
    null
  );
  const prazoEstimadoTotalDias = unidadesHomogeneas ? gruposUnidade[0]?.prazoCritico ?? 0 : 0;

  if (memoria.length === 0 && custoDiretoTotal === 0) {
    avisos.push("Nenhum recurso valido ou custo manual informado para calcular o custo direto.");
  }

  return {
    custoDiretoTotal,
    quantidadeTotal,
    prazoEstimadoTotalDias,
    prazoCritico: prazoCriticoFrente
      ? {
          frenteNome: prazoCriticoFrente.nome,
          valor: prazoCriticoFrente.prazoDias,
          unidade: prazoCriticoFrente.prazoUnidade
        }
      : null,
    custoDiretoUnitarioMedio:
      unidadesHomogeneas && quantidadeTotal > 0 ? roundMoney(custoDiretoTotal / quantidadeTotal) : 0,
    unidadesHomogeneas,
    gruposUnidade,
    frentes: resultadosFrentes,
    memoria,
    avisos: Array.from(new Set(avisos.filter(Boolean)))
  };
}
