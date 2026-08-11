import type {
  EncargoEconomicoNucleoInput,
  NumeroTecnico,
  ResultadoEncargoEconomicoNucleo,
  StatusEncargosEconomicosNucleo
} from "./contracts";

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
  encargos?: EncargoEconomicoNucleoInput[];
}) {
  const receita = roundEconomicValue(Math.max(0, toNumber(params.receita)));
  const custo = roundEconomicValue(Math.max(0, toNumber(params.custo)));
  const encargos = calcularEncargosEconomicos(receita, params.encargos ?? []);
  const encargosEconomicos = roundEconomicValue(
    encargos.reduce((total, encargo) => total + encargo.valorCalculado, 0)
  );
  const custoTotalExecucao = roundEconomicValue(custo + encargosEconomicos);
  const resultado = roundEconomicValue(receita - custoTotalExecucao);
  const margemPercentual =
    receita > 0 ? roundEconomicValue((resultado / receita) * 100) : null;
  const statusEncargos = resolverStatusEncargos(encargos);

  return {
    receita,
    custo,
    encargosEconomicos,
    custoTotalExecucao,
    resultado,
    margemPercentual,
    statusEncargos,
    encargos
  };
}

function calcularEncargosEconomicos(
  receita: number,
  encargos: EncargoEconomicoNucleoInput[]
): ResultadoEncargoEconomicoNucleo[] {
  return encargos.map((encargo) => {
    const percentual = encargo.percentual === null || encargo.percentual === undefined || encargo.percentual === ""
      ? null
      : Math.max(0, toNumber(encargo.percentual));
    const valorInformado = encargo.valorInformado === null || encargo.valorInformado === undefined || encargo.valorInformado === ""
      ? null
      : Math.max(0, toNumber(encargo.valorInformado));
    const valorCalculado = encargo.formaCalculo === "PERCENTUAL_SOBRE_RECEITA"
      ? percentual === null
        ? 0
        : roundEconomicValue((receita * percentual) / 100)
      : valorInformado === null
        ? 0
        : roundEconomicValue(valorInformado);
    const status = encargo.formaCalculo === "PERCENTUAL_SOBRE_RECEITA"
      ? percentual === null
        ? "PENDENTE"
        : "CALCULADO"
      : valorInformado === null
        ? "PENDENTE"
        : "CALCULADO";

    return {
      id: encargo.id ?? null,
      tipo: encargo.tipo,
      descricao: encargo.descricao,
      formaCalculo: encargo.formaCalculo,
      percentual,
      valorInformado,
      valorCalculado,
      origem: encargo.origem ?? "MANUAL",
      observacao: encargo.observacao ?? null,
      status
    };
  });
}

function resolverStatusEncargos(encargos: ResultadoEncargoEconomicoNucleo[]): StatusEncargosEconomicosNucleo {
  if (!encargos.length) return "SEM_ENCARGOS";
  return encargos.some((encargo) => encargo.status === "PENDENTE")
    ? "ENCARGOS_PENDENTES"
    : "COM_ENCARGOS";
}
