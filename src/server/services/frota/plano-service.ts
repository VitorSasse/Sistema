import { CriterioControleManutencao, Prisma } from "@prisma/client";

type PlanoProjectionInput = {
  criterioControle: CriterioControleManutencao;
  periodicidadeValor: number;
  ultimaExecucaoEm?: Date | null;
  ultimaLeituraHorimetro?: Prisma.Decimal | number | null;
  ultimaLeituraKm?: Prisma.Decimal | number | null;
};

type PlanoManutencaoSnapshot = {
  tipoManutencao?: string | null;
  criterioControle: CriterioControleManutencao;
  periodicidadeValor: number;
  ultimaExecucaoEm?: Date | null;
  ultimaLeituraHorimetro?: Prisma.Decimal | number | null;
  ultimaLeituraKm?: Prisma.Decimal | number | null;
  proximaExecucaoEm?: Date | null;
  proximoHorimetro?: Prisma.Decimal | number | null;
  proximoKm?: Prisma.Decimal | number | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
};

function toNullableNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPlanoGroupKey(input: PlanoManutencaoSnapshot) {
  const tipoManutencao = input.tipoManutencao?.trim().toLocaleLowerCase("pt-BR") || "sem-tipo";
  return `${tipoManutencao}::${input.criterioControle}`;
}

function getPlanoRecencyScore(input: PlanoManutencaoSnapshot) {
  if (input.criterioControle === "DIAS") {
    return (
      input.ultimaExecucaoEm?.getTime() ??
      input.proximaExecucaoEm?.getTime() ??
      input.updatedAt?.getTime() ??
      input.createdAt?.getTime() ??
      Number.NEGATIVE_INFINITY
    );
  }

  if (input.criterioControle === "HORIMETRO") {
    const leitura = toNullableNumber(input.ultimaLeituraHorimetro);
    if (leitura !== null) {
      return leitura;
    }

    const proximo = toNullableNumber(input.proximoHorimetro);
    if (proximo !== null) {
      return proximo - input.periodicidadeValor;
    }
  }

  if (input.criterioControle === "KM") {
    const leitura = toNullableNumber(input.ultimaLeituraKm);
    if (leitura !== null) {
      return leitura;
    }

    const proximo = toNullableNumber(input.proximoKm);
    if (proximo !== null) {
      return proximo - input.periodicidadeValor;
    }
  }

  return input.updatedAt?.getTime() ?? input.createdAt?.getTime() ?? Number.NEGATIVE_INFINITY;
}

function comparePlanoRecency(left: PlanoManutencaoSnapshot, right: PlanoManutencaoSnapshot) {
  const scoreDelta = getPlanoRecencyScore(left) - getPlanoRecencyScore(right);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const leftUpdated = left.updatedAt?.getTime() ?? left.createdAt?.getTime() ?? 0;
  const rightUpdated = right.updatedAt?.getTime() ?? right.createdAt?.getTime() ?? 0;
  if (leftUpdated !== rightUpdated) {
    return leftUpdated - rightUpdated;
  }

  const leftDue =
    left.proximaExecucaoEm?.getTime() ??
    toNullableNumber(left.proximoHorimetro) ??
    toNullableNumber(left.proximoKm) ??
    Number.NEGATIVE_INFINITY;
  const rightDue =
    right.proximaExecucaoEm?.getTime() ??
    toNullableNumber(right.proximoHorimetro) ??
    toNullableNumber(right.proximoKm) ??
    Number.NEGATIVE_INFINITY;

  return leftDue - rightDue;
}

export function selecionarPlanosManutencaoRelevantes<T extends PlanoManutencaoSnapshot>(planos: T[]) {
  const selected = new Map<string, T>();

  for (const plano of planos) {
    const key = getPlanoGroupKey(plano);
    const current = selected.get(key);

    if (!current || comparePlanoRecency(plano, current) > 0) {
      selected.set(key, plano);
    }
  }

  return Array.from(selected.values());
}

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
