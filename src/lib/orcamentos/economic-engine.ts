export type EconomicEngineFrenteInput = {
  ref: string;
  nome?: string | null;
  custoDireto?: string | number | null;
};

export type EconomicEngineServicoInput = {
  frenteRef?: string | null;
  tipoItem?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  quantidade?: string | number | null;
  valorUnitario?: string | number | null;
};

export type EconomicEngineFrenteResultado = {
  ref: string;
  nome: string;
  custoDireto: number;
  valorVenda: number;
  statusComercial: "VENDA_DEFINIDA" | "PENDENTE_PRECIFICACAO";
  memoriaVenda: Array<{
    descricao: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
};

export type EconomicEngineResultado = {
  frentes: EconomicEngineFrenteResultado[];
  custoDiretoTotal: number;
  custoDiretoPendente: number;
  custoIndireto: number;
  custoTotal: number;
  valorComercialInformado: number;
  precoSugeridoPendentes: number;
  margemValor: number;
  impostosValor: number;
  ajusteComercial: number;
  valorSubtotal: number;
  valorDesconto: number;
  valorAcrescimo: number;
  valorTotal: number;
  frentesComVenda: number;
  frentesPendentes: number;
  cenarioComercial: "VENDA_DEFINIDA" | "FORMACAO_POR_CUSTO" | "MISTO";
};

type EconomicEngineInput = {
  frentes: EconomicEngineFrenteInput[];
  servicos: EconomicEngineServicoInput[];
  custoDiretoLegado?: string | number | null;
  custoIndireto?: string | number | null;
  margemPercentual?: string | number | null;
  impostosPercentual?: string | number | null;
  ajusteComercial?: string | number | null;
  valorDesconto?: string | number | null;
  valorAcrescimo?: string | number | null;
};

const tiposComerciaisDaFrente = new Set([
  "SERVICO_PRINCIPAL",
  "SERVICO_AUXILIAR",
  "MATERIAL",
  "LOCACAO",
  "TRANSPORTE",
  "SUBEMPREITADA",
  "VERBA",
  "OUTRO"
]);

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundEconomicValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcularConsolidacaoEconomica(
  input: EconomicEngineInput
): EconomicEngineResultado {
  const servicosPorFrente = new Map<string, EconomicEngineServicoInput[]>();

  for (const servico of input.servicos) {
    const frenteRef = servico.frenteRef?.trim();

    if (!frenteRef || !tiposComerciaisDaFrente.has((servico.tipoItem ?? "").toUpperCase())) {
      continue;
    }

    const servicos = servicosPorFrente.get(frenteRef) ?? [];
    servicos.push(servico);
    servicosPorFrente.set(frenteRef, servicos);
  }

  const frentes = input.frentes.map<EconomicEngineFrenteResultado>((frente) => {
    const memoriaVenda = (servicosPorFrente.get(frente.ref) ?? []).map((servico) => {
      const quantidade = Math.max(0, toNumber(servico.quantidade));
      const valorUnitario = Math.max(0, toNumber(servico.valorUnitario));

      return {
        descricao: servico.descricao?.trim() || "Servico principal",
        unidade: servico.unidade?.trim() || "UN",
        quantidade: roundEconomicValue(quantidade),
        valorUnitario: roundEconomicValue(valorUnitario),
        valorTotal: roundEconomicValue(quantidade * valorUnitario)
      };
    });
    const valorVenda = roundEconomicValue(
      memoriaVenda.reduce((total, servico) => total + servico.valorTotal, 0)
    );

    return {
      ref: frente.ref,
      nome: frente.nome?.trim() || "Frente",
      custoDireto: roundEconomicValue(Math.max(0, toNumber(frente.custoDireto))),
      valorVenda,
      statusComercial: valorVenda > 0 ? "VENDA_DEFINIDA" : "PENDENTE_PRECIFICACAO",
      memoriaVenda
    };
  });

  const custoDiretoLegado = roundEconomicValue(
    Math.max(0, toNumber(input.custoDiretoLegado))
  );
  const custoDiretoDasFrentes = roundEconomicValue(
    frentes.reduce((total, frente) => total + frente.custoDireto, 0)
  );
  const custoDiretoTotal = roundEconomicValue(
    custoDiretoDasFrentes > 0 ? custoDiretoDasFrentes : custoDiretoLegado
  );
  const frentesComVenda = frentes.filter(
    (frente) => frente.statusComercial === "VENDA_DEFINIDA"
  ).length;
  const frentesPendentes = frentes.length - frentesComVenda;
  const valorComercialInformado = roundEconomicValue(
    frentes.reduce((total, frente) => total + frente.valorVenda, 0)
  );
  const custoDiretoPendente = roundEconomicValue(
    custoDiretoDasFrentes > 0
      ? frentes
          .filter((frente) => frente.statusComercial === "PENDENTE_PRECIFICACAO")
          .reduce((total, frente) => total + frente.custoDireto, 0)
      : frentesPendentes > 0 || frentes.length === 0
        ? custoDiretoLegado
        : 0
  );
  const custoIndireto = roundEconomicValue(Math.max(0, toNumber(input.custoIndireto)));
  const custoTotal = roundEconomicValue(custoDiretoTotal + custoIndireto);
  const possuiEscopoPendente = frentes.length === 0 || frentesPendentes > 0;
  const basePendente = roundEconomicValue(
    possuiEscopoPendente ? custoDiretoPendente + custoIndireto : 0
  );
  const margemPercentual = Math.max(0, toNumber(input.margemPercentual));
  const margemValor = roundEconomicValue(basePendente * (margemPercentual / 100));
  const impostosPercentual = Math.max(0, toNumber(input.impostosPercentual));
  const impostosValor = roundEconomicValue(
    (basePendente + margemValor) * (impostosPercentual / 100)
  );
  const precoSugeridoPendentes = roundEconomicValue(
    basePendente + margemValor + impostosValor
  );
  const valorConsolidado = roundEconomicValue(
    valorComercialInformado + precoSugeridoPendentes
  );
  const ajusteComercial = roundEconomicValue(Math.max(0, toNumber(input.ajusteComercial)));
  const valorSubtotal = ajusteComercial > 0 ? ajusteComercial : valorConsolidado;
  const valorDesconto = roundEconomicValue(Math.max(0, toNumber(input.valorDesconto)));
  const valorAcrescimo = roundEconomicValue(Math.max(0, toNumber(input.valorAcrescimo)));
  const valorTotal = roundEconomicValue(
    Math.max(0, valorSubtotal - valorDesconto + valorAcrescimo)
  );
  const cenarioComercial =
    frentesComVenda > 0 && frentesPendentes > 0
      ? "MISTO"
      : frentesComVenda > 0
        ? "VENDA_DEFINIDA"
        : "FORMACAO_POR_CUSTO";

  return {
    frentes,
    custoDiretoTotal,
    custoDiretoPendente,
    custoIndireto,
    custoTotal,
    valorComercialInformado,
    precoSugeridoPendentes,
    margemValor,
    impostosValor,
    ajusteComercial,
    valorSubtotal,
    valorDesconto,
    valorAcrescimo,
    valorTotal,
    frentesComVenda,
    frentesPendentes,
    cenarioComercial
  };
}
