import {
  FormaApresentacaoComercialItem,
  ModoCustoOrcamento,
  NaturezaFrenteOrcamento,
  TipoItemOrcamento
} from "@prisma/client";
import { calcularMotorCustos } from "@/lib/orcamentos/cost-engine";
import { calcularConsolidacaoEconomica } from "@/lib/orcamentos/economic-engine";
import type { OrcamentoInput } from "@/lib/validators/orcamento";

type OrcamentoItemInput = OrcamentoInput["itens"][number];
type OrcamentoCenarioInput = OrcamentoInput["cenarios"][number];

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcularValorItem(input: OrcamentoItemInput) {
  if (input.formaApresentacaoComercial === FormaApresentacaoComercialItem.PRECO_UNITARIO_REFERENCIAL) {
    return 0;
  }

  const quantidade = Math.max(0, Number(input.quantidade) || 0);
  const precoAplicado = Math.max(
    0,
    Number(input.precoAplicado ?? 0) ||
      (input.modoPrecificacao === "COMPOSICAO" &&
      !input.precoVendaSobrescrito &&
      Number(input.precoCompra ?? 0) > 0
        ? Number(input.precoCompra ?? 0) *
          (1 + Math.max(0, Number(input.markupPercentual ?? 0)) / 100)
        : Number(input.valorUnitario ?? 0))
  );

  return toMoney(quantidade * precoAplicado);
}

export function calcularCustoItem(input: OrcamentoItemInput) {
  return toMoney(Number(input.quantidade) * Number(input.custoUnitario));
}

function getFrenteRef(frente: OrcamentoInput["frentes"][number]) {
  return frente.tempId?.trim() || `ordem:${frente.ordem}`;
}

function getItemFrenteRef(item: OrcamentoItemInput) {
  return item.frenteTempId?.trim() || (item.frenteOrdem ? `ordem:${item.frenteOrdem}` : "");
}

function getNaturezaFrente(frente: OrcamentoInput["frentes"][number]) {
  return frente.natureza ?? NaturezaFrenteOrcamento.OPERACIONAL;
}

function pertenceAoCenario(
  frente: OrcamentoInput["frentes"][number],
  cenario: OrcamentoCenarioInput
) {
  if (cenario.tempId?.trim() && frente.cenarioTempId?.trim()) {
    return frente.cenarioTempId.trim() === cenario.tempId.trim();
  }

  return frente.cenarioOrdem === cenario.ordem || (!frente.cenarioTempId?.trim() && cenario.isPadrao);
}

function getEscopoOperacional(
  input: OrcamentoInput,
  cenario?: OrcamentoCenarioInput | null
) {
  const cenarioAtivo = cenario ?? input.cenarios.find((item) => item.isPadrao) ?? input.cenarios[0];
  const frentes = cenarioAtivo
    ? input.frentes.filter((frente) => pertenceAoCenario(frente, cenarioAtivo))
    : input.frentes;
  const frenteRefs = new Set(frentes.map(getFrenteRef));
  const itens = input.itens.filter((item) => frenteRefs.has(getItemFrenteRef(item)));

  return { frentes, itens, cenario: cenarioAtivo ?? null };
}

function buildCostEngineInput(
  frentes: OrcamentoInput["frentes"],
  itens: OrcamentoInput["itens"]
) {
  const frentesOperacionais = frentes.filter(
    (frente) => getNaturezaFrente(frente) !== NaturezaFrenteOrcamento.COMERCIAL
  );
  const refsOperacionais = new Set(frentesOperacionais.map(getFrenteRef));

  return {
    frentes: frentesOperacionais.map((frente) => ({
      ref: getFrenteRef(frente),
      nome: frente.nome,
      unidadeProducao: frente.unidadeProducao,
      quantidadePrevista: frente.quantidadePrevista,
      produtividadeDia: frente.produtividadeDia,
      prazoEstimadoDias: frente.prazoEstimadoDias,
      prazoTeoricoDias: frente.prazoTeoricoDias,
      prazoAdotadoDias: frente.prazoAdotadoDias,
      origemPrazo: frente.origemPrazo,
      modoCusto: frente.modoCusto,
      custoManual: frente.custoManual
    })),
    recursos: itens
      .filter(
        (item) =>
          item.tipoItem === TipoItemOrcamento.RECURSO &&
          refsOperacionais.has(getItemFrenteRef(item))
      )
      .map((item) => ({
        ref: item.tempId?.trim() || `${getItemFrenteRef(item)}:item:${item.ordem}`,
        frenteRef: getItemFrenteRef(item),
        categoria: item.categoriaRecurso,
        descricao: item.descricao,
        recursoNome: item.recursoNome,
        classeOperacional: item.classeOperacional,
        recursoReferenciaId: item.recursoReferenciaId,
        quantidade: item.quantidade,
        quantidadeOperacional: item.quantidadeOperacional,
        origemQuantidadeOperacional: item.origemQuantidadeOperacional,
        unidadeQuantidadeOperacional: item.unidadeQuantidadeOperacional,
        custoOperacional: item.custoUnitario,
        unidadeCusto: item.unidade,
        tipoCalculo: item.tipoCalculoRecurso,
        unidadeEconomicaCusto: item.unidadeEconomicaCusto,
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
        diasTrabalhadosMes: item.diasTrabalhadosMes
      }))
  };
}

function buildOperationalSnapshot(
  input: OrcamentoInput,
  cenario?: OrcamentoCenarioInput | null
) {
  const formacao = input.formacaoPreco;
  const escopo = getEscopoOperacional(input, cenario);
  const motorCustos = calcularMotorCustos(buildCostEngineInput(escopo.frentes, escopo.itens));
  const resultadoMotorPorRef = new Map(
    motorCustos.frentes.map((frente) => [frente.ref, frente])
  );
  const consolidacao = calcularConsolidacaoEconomica({
    frentes: escopo.frentes.map((frente) => ({
      ref: getFrenteRef(frente),
      nome: frente.nome,
      custoDireto:
        getNaturezaFrente(frente) === NaturezaFrenteOrcamento.COMERCIAL
          ? 0
          : resultadoMotorPorRef.get(getFrenteRef(frente))?.custoDireto ?? 0
    })),
    servicos: escopo.itens.map((item) => ({
      frenteRef: getItemFrenteRef(item),
      tipoItem: item.tipoItem,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      formaApresentacaoComercial: item.formaApresentacaoComercial,
      modoPrecificacao: item.modoPrecificacao,
      precoCompra: item.precoCompra,
      markupPercentual: item.markupPercentual,
      precoVendaSobrescrito: item.precoVendaSobrescrito,
      custoUnitario: item.custoUnitario,
      custoCalculadoOriginal: item.custoCalculadoOriginal,
      custoBaseSobrescrito: item.custoBaseSobrescrito,
      custoBaseAplicado: item.custoBaseAplicado,
      precoCalculado: item.precoCalculado,
      precoAplicado: item.precoAplicado
    })),
    custoDiretoLegado: formacao?.custoDireto,
    custoIndireto: formacao?.custoIndireto,
    margemPercentual: formacao?.margemPercentual,
    impostosPercentual: formacao?.impostosPercentual,
    ajusteComercial: formacao?.ajusteComercial,
    valorDesconto: input.valorDesconto,
    valorAcrescimo: input.valorAcrescimo
  });
  const modoCusto =
    formacao?.modoCusto ??
    (escopo.frentes.length > 0
      ? ModoCustoOrcamento.COMPLETO
      : ModoCustoOrcamento.SIMPLIFICADO);

  return {
    formacaoPreco: {
      modoCusto,
      custoDireto: consolidacao.custoDiretoTotal,
      custoIndireto: consolidacao.custoIndireto,
      impostosPercentual: toMoney(Number(formacao?.impostosPercentual ?? 0)),
      impostosValor: consolidacao.impostosValor,
      margemPercentual: toMoney(Number(formacao?.margemPercentual ?? 0)),
      margemValor: consolidacao.margemValor,
      precoSugerido: consolidacao.precoSugeridoPendentes,
      ajusteComercial: consolidacao.ajusteComercial,
      precoFinal: consolidacao.valorTotal,
      observacao: clean(formacao?.observacao)
    },
    totals: {
      valorSubtotal: consolidacao.valorSubtotal,
      valorDesconto: consolidacao.valorDesconto,
      valorAcrescimo: consolidacao.valorAcrescimo,
      valorTotal: consolidacao.valorTotal
    },
    consolidacao,
    motorCustos,
    cenario: escopo.cenario
  };
}

function buildCommercialSnapshot(input: OrcamentoInput) {
  const formacao = input.formacaoPreco;
  const subtotalItens = toMoney(
    input.itens.reduce((sum, item) => sum + calcularValorItem(item), 0)
  );
  const custoDiretoItens = toMoney(
    input.itens.reduce((sum, item) => sum + calcularCustoItem(item), 0)
  );
  const custoDiretoManual = toMoney(Number(formacao?.custoDireto ?? 0));
  const custoDireto = custoDiretoItens > 0 ? custoDiretoItens : custoDiretoManual;
  const custoIndireto = toMoney(Number(formacao?.custoIndireto ?? 0));
  const baseCustos = toMoney(custoDireto + custoIndireto);
  const margemPercentual = toMoney(Number(formacao?.margemPercentual ?? 0));
  const margemManual = toMoney(Number(formacao?.margemValor ?? 0));
  const margemValor = margemManual > 0 ? margemManual : toMoney(baseCustos * (margemPercentual / 100));
  const impostosPercentual = toMoney(Number(formacao?.impostosPercentual ?? 0));
  const impostosManual = toMoney(Number(formacao?.impostosValor ?? 0));
  const impostosValor = impostosManual > 0
    ? impostosManual
    : toMoney((baseCustos + margemValor) * (impostosPercentual / 100));
  const precoSugeridoCalculado = toMoney(baseCustos + margemValor + impostosValor);
  const precoSugeridoManual = toMoney(Number(formacao?.precoSugerido ?? 0));
  const precoSugerido = precoSugeridoManual > 0 ? precoSugeridoManual : precoSugeridoCalculado;
  const precoFinalManual = toMoney(Number(formacao?.precoFinal ?? 0));
  const valorSubtotal = precoFinalManual > 0
    ? precoFinalManual
    : subtotalItens > 0
      ? subtotalItens
      : precoSugerido;
  const valorDesconto = toMoney(Number(input.valorDesconto ?? 0));
  const valorAcrescimo = toMoney(Number(input.valorAcrescimo ?? 0));
  const valorTotal = toMoney(Math.max(0, valorSubtotal - valorDesconto + valorAcrescimo));

  return {
    formacaoPreco: {
      modoCusto: formacao?.modoCusto ?? ModoCustoOrcamento.SIMPLIFICADO,
      custoDireto,
      custoIndireto,
      impostosPercentual,
      impostosValor,
      margemPercentual,
      margemValor,
      precoSugerido,
      ajusteComercial: toMoney(Number(formacao?.ajusteComercial ?? 0)),
      precoFinal: valorTotal,
      observacao: clean(formacao?.observacao)
    },
    totals: { valorSubtotal, valorDesconto, valorAcrescimo, valorTotal },
    consolidacao: null,
    motorCustos: null,
    cenario: null
  };
}

export function buildPricingSnapshot(
  input: OrcamentoInput,
  options?: { cenario?: OrcamentoCenarioInput | null }
) {
  return input.frentes.length > 0
    ? buildOperationalSnapshot(input, options?.cenario)
    : buildCommercialSnapshot(input);
}

export function buildOrcamentoTotals(input: OrcamentoInput) {
  return buildPricingSnapshot(input).totals;
}
