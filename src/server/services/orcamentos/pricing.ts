import { ModoCustoOrcamento, TipoOrcamento } from "@prisma/client";
import type { OrcamentoInput } from "@/lib/validators/orcamento";

type OrcamentoItemInput = OrcamentoInput["itens"][number];

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

function calcularMargemEImpostos(input: OrcamentoInput, baseCustos: number) {
  const formacao = input.formacaoPreco;
  const margemPercentual = toMoney(Number(formacao?.margemPercentual ?? 0));
  const margemManual = toMoney(Number(formacao?.margemValor ?? 0));
  const margemValor =
    margemManual > 0 ? margemManual : toMoney(baseCustos * (margemPercentual / 100));
  const impostosPercentual = toMoney(Number(formacao?.impostosPercentual ?? 0));
  const impostosManual = toMoney(Number(formacao?.impostosValor ?? 0));
  const baseComMargem = toMoney(baseCustos + margemValor);
  const impostosValor =
    impostosManual > 0 ? impostosManual : toMoney(baseComMargem * (impostosPercentual / 100));

  return {
    margemPercentual,
    margemValor,
    impostosPercentual,
    impostosValor,
    baseComMargem
  };
}

function buildSnapshot(input: OrcamentoInput, config: { operacional: boolean }) {
  const formacao = input.formacaoPreco;
  const subtotalItens = toMoney(
    input.itens.reduce((sum, item) => sum + calcularValorItem(item), 0)
  );
  const itensParaCusto = config.operacional
    ? input.itens.filter((item) => item.frenteTempId || item.frenteOrdem)
    : input.itens;
  const custoDiretoItens = toMoney(
    itensParaCusto.reduce((sum, item) => sum + calcularCustoItem(item), 0)
  );
  const custoDiretoManual = toMoney(Number(formacao?.custoDireto ?? 0));
  const modoCusto =
    formacao?.modoCusto ??
    (config.operacional && custoDiretoItens > 0
      ? ModoCustoOrcamento.COMPLETO
      : ModoCustoOrcamento.SIMPLIFICADO);
  const custoDireto = config.operacional
    ? modoCusto === ModoCustoOrcamento.COMPLETO
      ? custoDiretoItens
      : custoDiretoManual
    : custoDiretoItens > 0
      ? custoDiretoItens
      : custoDiretoManual;
  const custoIndireto = toMoney(Number(formacao?.custoIndireto ?? 0));
  const baseCustos = toMoney(custoDireto + custoIndireto);
  const margem = calcularMargemEImpostos(input, baseCustos);
  const precoSugeridoCalculado = toMoney(margem.baseComMargem + margem.impostosValor);
  const precoSugeridoManual = config.operacional
    ? 0
    : toMoney(Number(formacao?.precoSugerido ?? 0));
  const precoSugerido =
    precoSugeridoManual > 0 ? precoSugeridoManual : precoSugeridoCalculado;
  const precoFinalManual = toMoney(Number(formacao?.precoFinal ?? 0));
  const valorSubtotal = toMoney(
    config.operacional
      ? precoFinalManual > 0
        ? precoFinalManual
        : precoSugerido
      : precoFinalManual > 0
        ? precoFinalManual
        : subtotalItens > 0
          ? subtotalItens
          : precoSugerido
  );
  const valorDesconto = toMoney(Number(input.valorDesconto ?? 0));
  const valorAcrescimo = toMoney(Number(input.valorAcrescimo ?? 0));
  const valorTotal = toMoney(Math.max(0, valorSubtotal - valorDesconto + valorAcrescimo));

  return {
    formacaoPreco: {
      modoCusto,
      custoDireto,
      custoIndireto,
      impostosPercentual: margem.impostosPercentual,
      impostosValor: margem.impostosValor,
      margemPercentual: margem.margemPercentual,
      margemValor: margem.margemValor,
      precoSugerido,
      precoFinal: valorTotal,
      observacao: clean(formacao?.observacao)
    },
    totals: {
      valorSubtotal,
      valorDesconto,
      valorAcrescimo,
      valorTotal
    }
  };
}

export function buildPricingSnapshot(input: OrcamentoInput) {
  return buildSnapshot(input, { operacional: input.tipo === TipoOrcamento.OPERACIONAL });
}

export function buildOrcamentoTotals(input: OrcamentoInput) {
  return buildPricingSnapshot(input).totals;
}
