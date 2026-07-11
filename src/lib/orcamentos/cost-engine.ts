export const JORNADA_PADRAO_HORAS_DIA = 8;

type UnidadeEconomica =
  | "HORA"
  | "DIA"
  | "KM"
  | "VIAGEM"
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
};

export type CostEngineRecursoInput = {
  frenteRef?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  quantidade?: string | number | null;
  custoOperacional?: string | number | null;
  unidadeCusto?: string | null;
};

export type CostEngineMemoriaRecurso = {
  frenteRef: string;
  frenteNome: string;
  categoria: string;
  descricao: string;
  quantidadeRecursos: number;
  custoOperacional: number;
  unidadeCustoOriginal: string;
  unidadeCustoFormatada: string;
  baseConversao: number;
  custoTotal: number;
  custoUnitarioFrente: number;
  formula: string;
  observacoes: string[];
};

export type CostEngineFrenteResultado = {
  ref: string;
  nome: string;
  unidade: string;
  quantidade: number;
  produtividadeDia: number;
  prazoDias: number;
  custoDireto: number;
  custoDiretoUnitario: number;
  recursos: CostEngineMemoriaRecurso[];
};

export type CostEngineResultado = {
  custoDiretoTotal: number;
  quantidadeTotal: number;
  prazoEstimadoTotalDias: number;
  custoDiretoUnitarioMedio: number;
  frentes: CostEngineFrenteResultado[];
  memoria: CostEngineMemoriaRecurso[];
  avisos: string[];
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function normalizeUnidade(value?: string | null): UnidadeEconomica {
  const normalized = normalizeText(value)
    .replace("r$", "")
    .replace("por", "/")
    .replace(/\s+/g, "");

  if (!normalized) return "UN";
  if (normalized.includes("/h") || normalized.includes("hora")) return "HORA";
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

export function formatarUnidadeCusto(value?: string | null) {
  const unidade = normalizeUnidade(value);

  if (unidade === "HORA") return "R$/h";
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

function formatarUnidadeFrente(value?: string | null) {
  const unidade = normalizeUnidade(value);

  if (unidade === "M3") return "m3";
  if (unidade === "M2") return "m2";
  if (unidade === "TON") return "t";
  if (unidade === "CARGA") return "carga";
  if (unidade === "HORA") return "hora";
  if (unidade === "KM") return "km";
  if (unidade === "VIAGEM") return "viagem";
  if (unidade === "DIA") return "dia";

  return value?.trim() || "un";
}

function calcularPrazoDias(frente: CostEngineFrenteInput) {
  const quantidade = toNumber(frente.quantidadePrevista);
  const produtividade = toNumber(frente.produtividadeDia);
  const prazoManual = toNumber(frente.prazoEstimadoDias);

  if (prazoManual > 0) {
    return prazoManual;
  }

  if (quantidade > 0 && produtividade > 0) {
    return quantidade / produtividade;
  }

  return 0;
}

function unidadesCompativeis(unidadeCusto: UnidadeEconomica, unidadeFrente: UnidadeEconomica) {
  if (unidadeCusto === unidadeFrente) return true;
  if (unidadeCusto === "VIAGEM" && unidadeFrente === "CARGA") return true;
  if (unidadeCusto === "CARGA" && unidadeFrente === "VIAGEM") return true;
  return false;
}

function resolverBaseConversao(params: {
  unidadeCusto: UnidadeEconomica;
  unidadeFrente: UnidadeEconomica;
  quantidadeFrente: number;
  prazoDias: number;
}) {
  const observacoes: string[] = [];
  const { unidadeCusto, unidadeFrente, quantidadeFrente, prazoDias } = params;

  if (unidadeCusto === "UN" || unidadeCusto === "DESCONHECIDA") {
    if (unidadeCusto === "DESCONHECIDA") {
      observacoes.push("Unidade do custo nao reconhecida; tratada como custo unitario unico.");
    }

    return {
      baseConversao: 1,
      formulaBase: "1",
      observacoes
    };
  }

  if (unidadeCusto === "DIA") {
    if (prazoDias <= 0) {
      observacoes.push("Prazo da frente ausente; recurso por dia nao entrou no custo.");
    }

    return {
      baseConversao: prazoDias > 0 ? prazoDias : 0,
      formulaBase: "prazo da frente em dias",
      observacoes
    };
  }

  if (unidadeCusto === "HORA") {
    if (unidadeFrente === "HORA") {
      return {
        baseConversao: quantidadeFrente,
        formulaBase: "quantidade da frente em horas",
        observacoes
      };
    }

    if (prazoDias <= 0) {
      observacoes.push("Prazo da frente ausente; recurso por hora nao entrou no custo.");
      return {
        baseConversao: 0,
        formulaBase: "prazo x jornada padrao",
        observacoes
      };
    }

    observacoes.push(`Conversao R$/h usando jornada padrao de ${JORNADA_PADRAO_HORAS_DIA} h/dia.`);
    return {
      baseConversao: prazoDias * JORNADA_PADRAO_HORAS_DIA,
      formulaBase: `prazo da frente x ${JORNADA_PADRAO_HORAS_DIA} h/dia`,
      observacoes
    };
  }

  if (unidadesCompativeis(unidadeCusto, unidadeFrente)) {
    if (quantidadeFrente <= 0) {
      observacoes.push("Quantidade da frente ausente; recurso por unidade produzida nao entrou no custo.");
    }

    return {
      baseConversao: quantidadeFrente > 0 ? quantidadeFrente : 0,
      formulaBase: "quantidade prevista da frente",
      observacoes
    };
  }

  observacoes.push("Unidade do custo nao compativel com a unidade da frente; recurso tratado como custo unico.");
  return {
    baseConversao: 1,
    formulaBase: "1",
    observacoes
  };
}

export function calcularMotorCustos(input: {
  frentes: CostEngineFrenteInput[];
  recursos: CostEngineRecursoInput[];
}): CostEngineResultado {
  const avisos: string[] = [];
  const frentes = input.frentes.map((frente) => {
    const quantidade = toNumber(frente.quantidadePrevista);
    const produtividadeDia = toNumber(frente.produtividadeDia);
    const prazoDias = calcularPrazoDias(frente);

    return {
      ref: frente.ref,
      nome: frente.nome?.trim() || "Frente",
      unidade: formatarUnidadeFrente(frente.unidadeProducao),
      unidadeNormalizada: normalizeUnidade(frente.unidadeProducao),
      quantidade,
      produtividadeDia,
      prazoDias,
      custoDireto: 0,
      custoDiretoUnitario: 0,
      recursos: [] as CostEngineMemoriaRecurso[]
    };
  });
  const frenteByRef = new Map(frentes.map((frente) => [frente.ref, frente]));

  for (const recurso of input.recursos) {
    const frente = recurso.frenteRef ? frenteByRef.get(recurso.frenteRef) : null;

    if (!frente) {
      avisos.push(`Recurso "${recurso.descricao || "sem descricao"}" sem frente valida foi ignorado.`);
      continue;
    }

    const quantidadeRecursos = toNumber(recurso.quantidade);
    const custoOperacional = toNumber(recurso.custoOperacional);
    const unidadeCusto = normalizeUnidade(recurso.unidadeCusto);
    const unidadeCustoFormatada = formatarUnidadeCusto(recurso.unidadeCusto);
    const conversao = resolverBaseConversao({
      unidadeCusto,
      unidadeFrente: frente.unidadeNormalizada,
      quantidadeFrente: frente.quantidade,
      prazoDias: frente.prazoDias
    });
    const custoTotal = roundMoney(quantidadeRecursos * custoOperacional * conversao.baseConversao);
    const custoUnitarioFrente =
      frente.quantidade > 0 ? roundMoney(custoTotal / frente.quantidade) : 0;
    const memoria: CostEngineMemoriaRecurso = {
      frenteRef: frente.ref,
      frenteNome: frente.nome,
      categoria: recurso.categoria?.trim() || "RECURSO",
      descricao: recurso.descricao?.trim() || "Recurso sem descricao",
      quantidadeRecursos,
      custoOperacional,
      unidadeCustoOriginal: recurso.unidadeCusto?.trim() || "UN",
      unidadeCustoFormatada,
      baseConversao: roundMoney(conversao.baseConversao),
      custoTotal,
      custoUnitarioFrente,
      formula: `${quantidadeRecursos} recurso(s) x ${unidadeCustoFormatada} ${roundMoney(
        custoOperacional
      )} x ${conversao.formulaBase}`,
      observacoes: conversao.observacoes
    };

    frente.custoDireto = roundMoney(frente.custoDireto + custoTotal);
    frente.recursos.push(memoria);
    avisos.push(...conversao.observacoes.map((observacao) => `${memoria.descricao}: ${observacao}`));
  }

  const resultadosFrentes: CostEngineFrenteResultado[] = frentes.map((frente) => ({
    ref: frente.ref,
    nome: frente.nome,
    unidade: frente.unidade,
    quantidade: roundMoney(frente.quantidade),
    produtividadeDia: roundMoney(frente.produtividadeDia),
    prazoDias: roundMoney(frente.prazoDias),
    custoDireto: roundMoney(frente.custoDireto),
    custoDiretoUnitario: frente.quantidade > 0 ? roundMoney(frente.custoDireto / frente.quantidade) : 0,
    recursos: frente.recursos
  }));
  const memoria = resultadosFrentes.flatMap((frente) => frente.recursos);
  const custoDiretoTotal = roundMoney(
    resultadosFrentes.reduce((sum, frente) => sum + frente.custoDireto, 0)
  );
  const quantidadeTotal = roundMoney(
    resultadosFrentes.reduce((sum, frente) => sum + frente.quantidade, 0)
  );
  const prazoEstimadoTotalDias = roundMoney(
    Math.max(0, ...resultadosFrentes.map((frente) => frente.prazoDias))
  );

  if (memoria.length === 0) {
    avisos.push("Nenhum recurso valido para calcular o custo direto no modo completo.");
  }

  return {
    custoDiretoTotal,
    quantidadeTotal,
    prazoEstimadoTotalDias,
    custoDiretoUnitarioMedio:
      quantidadeTotal > 0 ? roundMoney(custoDiretoTotal / quantidadeTotal) : 0,
    frentes: resultadosFrentes,
    memoria,
    avisos: Array.from(new Set(avisos.filter(Boolean)))
  };
}
