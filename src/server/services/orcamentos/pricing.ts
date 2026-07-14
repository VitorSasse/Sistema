import { ModoCustoOrcamento, TipoItemOrcamento, TipoOrcamento } from "@prisma/client";
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
  return toMoney(Number(input.quantidade) * Number(input.valorUnitario));
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
  return {
    frentes: frentes.map((frente) => ({
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
      .filter((item) => item.tipoItem === TipoItemOrcamento.RECURSO)
      .map((item) => ({
        ref: item.tempId?.trim() || `${getItemFrenteRef(item)}:item:${item.ordem}`,
        frenteRef: getItemFrenteRef(item),
        categoria: item.categoriaRecurso,
        descricao: item.descricao,
        quantidade: item.quantidade,
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
  const consolidacao = calcularConsolidacaoEconomica({
    frentes: motorCustos.frentes.map((frente) => ({
      ref: frente.ref,
      nome: frente.nome,
      custoDireto: frente.custoDireto
    })),
    servicos: escopo.itens.map((item) => ({
      frenteRef: getItemFrenteRef(item),
      tipoItem: item.tipoItem,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario
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
  return input.tipo === TipoOrcamento.OPERACIONAL
    ? buildOperationalSnapshot(input, options?.cenario)
    : buildCommercialSnapshot(input);
}

export function buildOrcamentoTotals(input: OrcamentoInput) {
  return buildPricingSnapshot(input).totals;
}
