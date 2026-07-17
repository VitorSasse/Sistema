export type EconomicEngineFrenteInput = {
  ref: string;
  nome?: string | null;
  custoDireto?: string | number | null;
};

export type EconomicEngineItemNatureza =
  | "MATERIAL_COMERCIAL"
  | "SERVICO"
  | "RECURSO"
  | "OUTRO";
type EconomicEngineOrigemValorAplicado =
  | "CALCULADO_AUTOMATICAMENTE"
  | "PERSONALIZADO_PELO_USUARIO";

export type EconomicEngineServicoInput = {
  frenteRef?: string | null;
  tipoItem?: string | null;
  modoPrecificacao?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  quantidade?: string | number | null;
  valorUnitario?: string | number | null;
  precoCompra?: string | number | null;
  markupPercentual?: string | number | null;
  precoVendaSobrescrito?: boolean | null;
  custoUnitario?: string | number | null;
  custoCalculadoOriginal?: string | number | null;
  custoBaseSobrescrito?: string | number | null;
  custoBaseAplicado?: string | number | null;
  precoCalculado?: string | number | null;
  precoAplicado?: string | number | null;
};

export type EconomicEngineFrenteResultado = {
  ref: string;
  nome: string;
  custoDireto: number;
  custoCalculadoServicosCompostos: number;
  custoBaseUtilizado: number;
  vendaMateriais: number;
  vendaServicosDiretos: number;
  vendaServicosCompostos: number;
  valorVenda: number;
  statusComercial: "VENDA_DEFINIDA" | "PENDENTE_PRECIFICACAO";
  memoriaVenda: Array<{
    descricao: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    tipoItem: string;
    modoPrecificacao: string;
    origemValorAplicado: EconomicEngineOrigemValorAplicado;
    custoCalculadoOriginal: number;
    custoBaseAplicado: number;
    precoCalculado: number;
    precoAplicado: number;
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

const tiposServico = new Set(["SERVICO_PRINCIPAL", "SERVICO_AUXILIAR"]);
const tiposMaterialComercial = new Set([
  "COMERCIAL",
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

function roundUnitValue(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function getModoPrecificacao(value?: string | null) {
  return value === "COMPOSICAO" ? "COMPOSICAO" : "PRECO_DIRETO";
}

function getOrigemValorAplicado(personalizado: boolean): EconomicEngineOrigemValorAplicado {
  return personalizado ? "PERSONALIZADO_PELO_USUARIO" : "CALCULADO_AUTOMATICAMENTE";
}

function getItemNatureza(tipoItem?: string | null): EconomicEngineItemNatureza {
  const tipo = (tipoItem ?? "").toUpperCase();

  if (tipo === "RECURSO") return "RECURSO";
  if (tiposServico.has(tipo)) return "SERVICO";
  if (tiposMaterialComercial.has(tipo)) return "MATERIAL_COMERCIAL";

  return "OUTRO";
}

function calcularVendaItemComercial(servico: EconomicEngineServicoInput) {
  const quantidade = Math.max(0, toNumber(servico.quantidade));
  const modoPrecificacao = getModoPrecificacao(servico.modoPrecificacao);
  const precoDireto = Math.max(0, toNumber(servico.valorUnitario));
  const precoCompra = Math.max(0, toNumber(servico.precoCompra));
  const markupPercentual = Math.max(0, toNumber(servico.markupPercentual));
  const precoCalculadoInformado = Math.max(0, toNumber(servico.precoCalculado));
  const precoAplicadoInformado = Math.max(0, toNumber(servico.precoAplicado));
  const precoCalculado =
    modoPrecificacao === "COMPOSICAO"
      ? roundUnitValue(
          precoCalculadoInformado > 0
            ? precoCalculadoInformado
            : precoCompra * (1 + markupPercentual / 100)
        )
      : roundUnitValue(precoDireto);
  const possuiSobrescrita =
    Boolean(servico.precoVendaSobrescrito) && precoDireto >= 0 && modoPrecificacao === "COMPOSICAO";
  const precoAplicado =
    modoPrecificacao === "COMPOSICAO"
      ? roundUnitValue(possuiSobrescrita ? precoDireto : precoAplicadoInformado > 0 ? precoAplicadoInformado : precoCalculado)
      : roundUnitValue(precoDireto);

  return {
    quantidade: roundEconomicValue(quantidade),
    valorUnitario: precoAplicado,
    valorTotal: roundEconomicValue(quantidade * precoAplicado),
    precoCalculado,
    precoAplicado,
    custoCalculadoOriginal: roundEconomicValue(precoCompra),
    custoBaseAplicado: 0,
    origemValorAplicado: getOrigemValorAplicado(possuiSobrescrita)
  } as const;
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

  const dadosBasePorFrente = input.frentes.map((frente) => {
    const servicos = servicosPorFrente.get(frente.ref) ?? [];
    const servicosCompostos = servicos.filter(
      (servico) =>
        getItemNatureza(servico.tipoItem) === "SERVICO" &&
        getModoPrecificacao(servico.modoPrecificacao) === "COMPOSICAO"
    );
    const custoDiretoFrente = roundEconomicValue(Math.max(0, toNumber(frente.custoDireto)));
    const somaSobrescrita = roundEconomicValue(
      servicosCompostos.reduce(
        (total, servico) => total + Math.max(0, toNumber(servico.custoBaseSobrescrito)),
        0
      )
    );
    const possuiSobrescrita = servicosCompostos.some(
      (servico) => toNumber(servico.custoBaseSobrescrito) > 0
    );
    const custoBaseUtilizado =
      servicosCompostos.length > 0
        ? roundEconomicValue(possuiSobrescrita ? somaSobrescrita : custoDiretoFrente)
        : 0;

    return { frente, servicos, servicosCompostos, custoDiretoFrente, custoBaseUtilizado };
  });

  const custoBaseMotor = roundEconomicValue(
    dadosBasePorFrente.reduce((total, item) => total + item.custoBaseUtilizado, 0)
  );
  const custoIndireto = roundEconomicValue(Math.max(0, toNumber(input.custoIndireto)));
  const margemPercentual = Math.max(0, toNumber(input.margemPercentual));
  const impostosPercentual = Math.max(0, toNumber(input.impostosPercentual));
  const margemValorMotor = roundEconomicValue((custoBaseMotor + custoIndireto) * (margemPercentual / 100));
  const impostosValorMotor = roundEconomicValue(
    (custoBaseMotor + custoIndireto + margemValorMotor) * (impostosPercentual / 100)
  );
  const encargosMotor = roundEconomicValue(custoIndireto + margemValorMotor + impostosValorMotor);

  const frentes = dadosBasePorFrente.map<EconomicEngineFrenteResultado>((dados) => {
    const { frente, servicos, servicosCompostos, custoDiretoFrente, custoBaseUtilizado } = dados;
    const vendaServicosCompostos = roundEconomicValue(
      custoBaseUtilizado +
        (custoBaseMotor > 0 ? (custoBaseUtilizado / custoBaseMotor) * encargosMotor : 0)
    );
    const memoriaVenda = servicos.flatMap((servico) => {
      const natureza = getItemNatureza(servico.tipoItem);
      const modoPrecificacao = getModoPrecificacao(servico.modoPrecificacao);

      if (natureza === "SERVICO" && modoPrecificacao === "COMPOSICAO") {
        const custoCalculadoOriginal = roundEconomicValue(custoDiretoFrente);
        const custoBaseSobrescrito = Math.max(0, toNumber(servico.custoBaseSobrescrito));
        const custoBaseAplicado = roundEconomicValue(
          custoBaseSobrescrito > 0 ? custoBaseSobrescrito : custoBaseUtilizado
        );
        const quantidade = Math.max(0, toNumber(servico.quantidade));
        const valorUnitario = quantidade > 0
          ? roundEconomicValue(vendaServicosCompostos / Math.max(1, servicosCompostos.length) / quantidade)
          : 0;
        const valorTotal = roundEconomicValue(
          servicosCompostos.length > 0 ? vendaServicosCompostos / servicosCompostos.length : 0
        );

        return [{
          descricao: servico.descricao?.trim() || "Servico principal",
          unidade: servico.unidade?.trim() || "UN",
          quantidade: roundEconomicValue(quantidade),
          valorUnitario,
          valorTotal,
          tipoItem: servico.tipoItem ?? "SERVICO",
          modoPrecificacao,
          origemValorAplicado: getOrigemValorAplicado(custoBaseSobrescrito > 0),
          custoCalculadoOriginal,
          custoBaseAplicado,
          precoCalculado: valorUnitario,
          precoAplicado: valorUnitario
        }];
      }

      if (natureza === "MATERIAL_COMERCIAL" || (natureza === "SERVICO" && modoPrecificacao === "PRECO_DIRETO")) {
        const venda = calcularVendaItemComercial(servico);

        return [{
          descricao: servico.descricao?.trim() || "Item comercial",
          unidade: servico.unidade?.trim() || "UN",
          quantidade: venda.quantidade,
          valorUnitario: venda.valorUnitario,
          valorTotal: venda.valorTotal,
          tipoItem: servico.tipoItem ?? "COMERCIAL",
          modoPrecificacao,
          origemValorAplicado: venda.origemValorAplicado,
          custoCalculadoOriginal: venda.custoCalculadoOriginal,
          custoBaseAplicado: venda.custoBaseAplicado,
          precoCalculado: venda.precoCalculado,
          precoAplicado: venda.precoAplicado
        }];
      }

      return [];
    });
    const valorVenda = roundEconomicValue(
      memoriaVenda.reduce((total, servico) => total + servico.valorTotal, 0)
    );
    const vendaMateriais = roundEconomicValue(
      memoriaVenda
        .filter((item) => getItemNatureza(item.tipoItem) === "MATERIAL_COMERCIAL")
        .reduce((total, item) => total + item.valorTotal, 0)
    );
    const vendaServicosDiretos = roundEconomicValue(
      memoriaVenda
        .filter(
          (item) =>
            getItemNatureza(item.tipoItem) === "SERVICO" &&
            item.modoPrecificacao === "PRECO_DIRETO"
        )
        .reduce((total, item) => total + item.valorTotal, 0)
    );

    return {
      ref: frente.ref,
      nome: frente.nome?.trim() || "Frente",
      custoDireto: custoDiretoFrente,
      custoCalculadoServicosCompostos: servicosCompostos.length > 0 ? custoDiretoFrente : 0,
      custoBaseUtilizado,
      vendaMateriais,
      vendaServicosDiretos,
      vendaServicosCompostos,
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
  const custoTotal = roundEconomicValue(custoDiretoTotal + custoIndireto);
  const possuiServicoComposto = custoBaseMotor > 0;
  const basePendenteLegado = roundEconomicValue(
    !possuiServicoComposto && (frentes.length === 0 || frentesPendentes > 0)
      ? custoDiretoPendente + custoIndireto
      : 0
  );
  const margemValorLegado = roundEconomicValue(basePendenteLegado * (margemPercentual / 100));
  const impostosValorLegado = roundEconomicValue(
    (basePendenteLegado + margemValorLegado) * (impostosPercentual / 100)
  );
  const precoSugeridoPendentes = possuiServicoComposto
    ? roundEconomicValue(frentes.reduce((total, frente) => total + frente.vendaServicosCompostos, 0))
    : roundEconomicValue(basePendenteLegado + margemValorLegado + impostosValorLegado);
  const valorConsolidado = roundEconomicValue(
    valorComercialInformado + (possuiServicoComposto ? 0 : precoSugeridoPendentes)
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
    margemValor: possuiServicoComposto ? margemValorMotor : margemValorLegado,
    impostosValor: possuiServicoComposto ? impostosValorMotor : impostosValorLegado,
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
