import { CriterioControleManutencao, Prisma } from "@prisma/client";

type PlanoProjectionInput = {
  criterioControle: CriterioControleManutencao;
  periodicidadeValor: number;
  ultimaExecucaoEm?: Date | null;
  ultimaLeituraHorimetro?: Prisma.Decimal | number | null;
  ultimaLeituraKm?: Prisma.Decimal | number | null;
};

export function calcularProximaManutencao(input: PlanoProjectionInput) {
  if (input.criterioControle === "DIAS") {
    const base = input.ultimaExecucaoEm ?? new Date();
    const proximaExecucaoEm = new Date(base);
    proximaExecucaoEm.setDate(proximaExecucaoEm.getDate() + input.periodicidadeValor);

    return {
      proximaExecucaoEm,
      proximoHorimetro: null,
      proximoKm: null
    };
  }

  if (input.criterioControle === "HORIMETRO") {
    const atual = input.ultimaLeituraHorimetro ? Number(input.ultimaLeituraHorimetro) : 0;
    return {
      proximaExecucaoEm: null,
      proximoHorimetro: atual + input.periodicidadeValor,
      proximoKm: null
    };
  }

  const atualKm = input.ultimaLeituraKm ? Number(input.ultimaLeituraKm) : 0;
  return {
    proximaExecucaoEm: null,
    proximoHorimetro: null,
    proximoKm: atualKm + input.periodicidadeValor
  };
}
