import type { NumeroTecnico } from "./contracts";

function toNumber(value: NumeroTecnico) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundEconomicValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcularResultadoEconomicoNucleo(params: {
  receita: NumeroTecnico;
  custo: NumeroTecnico;
}) {
  const receita = roundEconomicValue(Math.max(0, toNumber(params.receita)));
  const custo = roundEconomicValue(Math.max(0, toNumber(params.custo)));
  const resultado = roundEconomicValue(receita - custo);
  const margemPercentual =
    receita > 0 ? roundEconomicValue((resultado / receita) * 100) : null;

  return {
    receita,
    custo,
    resultado,
    margemPercentual
  };
}
