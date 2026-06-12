import { CriterioControleManutencao, Prisma } from "@prisma/client";

type PlanoProjectionInput = {
  criterioControle: CriterioControleManutencao;
  periodicidadeValor: number;
  ultimaExecucaoEm?: Date | null;
  ultimaLeituraHorimetro?: Prisma.Decimal | number | null;
  ultimaLeituraKm?: Prisma.Decimal | number | null;
};

type PlanoManutencaoSnapshot = {
  titulo?: string | null;
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

type PlanoManutencaoContext = {
  horimetroAtual?: Prisma.Decimal | number | null;
  kmAtual?: Prisma.Decimal | number | null;
};

function toNullableNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPlanoGroupKey(input: PlanoManutencaoSnapshot) {
  return input.criterioControle;
}

export function isPlanoManutencaoConsistente(
  input: PlanoManutencaoSnapshot,
  context?: PlanoManutencaoContext
) {
  if (input.criterioControle === "DIAS") {
    if (input.ultimaExecucaoEm && input.proximaExecucaoEm) {
      return input.proximaExecucaoEm.getTime() > input.ultimaExecucaoEm.getTime();
    }

    return true;
  }

  if (input.criterioControle === "HORIMETRO") {
    const ultimaLeitura = toNullableNumber(input.ultimaLeituraHorimetro);
    const proximaLeitura = toNullableNumber(input.proximoHorimetro);
    const leituraAtual = toNullableNumber(context?.horimetroAtual);
    const limiteDivergencia = Math.max(
      1,
      Math.ceil(input.periodicidadeValor * 0.1)
    );

    if (
      ultimaLeitura !== null &&
      proximaLeitura !== null &&
      proximaLeitura <= ultimaLeitura
    ) {
      return false;
    }

    if (
      ultimaLeitura !== null &&
      leituraAtual !== null &&
      ultimaLeitura - leituraAtual > limiteDivergencia
    ) {
      return false;
    }

    return true;
  }

  const ultimaLeitura = toNullableNumber(input.ultimaLeituraKm);
  const proximaLeitura = toNullableNumber(input.proximoKm);
  const leituraAtual = toNullableNumber(context?.kmAtual);
  const limiteDivergencia = Math.max(
    1,
    Math.ceil(input.periodicidadeValor * 0.1)
  );

  if (ultimaLeitura !== null && proximaLeitura !== null && proximaLeitura <= ultimaLeitura) {
    return false;
  }

  if (
    ultimaLeitura !== null &&
    leituraAtual !== null &&
    ultimaLeitura - leituraAtual > limiteDivergencia
  ) {
    return false;
  }

  return true;
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

function comparePlanoRecency(
  left: PlanoManutencaoSnapshot,
  right: PlanoManutencaoSnapshot,
  context?: PlanoManutencaoContext
) {
  const leftConsistente = isPlanoManutencaoConsistente(left, context);
  const rightConsistente = isPlanoManutencaoConsistente(right, context);

  if (leftConsistente !== rightConsistente) {
    return leftConsistente ? 1 : -1;
  }

  const leftUpdated = left.updatedAt?.getTime() ?? left.createdAt?.getTime() ?? 0;
  const rightUpdated = right.updatedAt?.getTime() ?? right.createdAt?.getTime() ?? 0;
  if (leftUpdated !== rightUpdated) {
    return leftUpdated - rightUpdated;
  }

  const scoreDelta = getPlanoRecencyScore(left) - getPlanoRecencyScore(right);
  if (scoreDelta !== 0) {
    return scoreDelta;
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

export function selecionarPlanosManutencaoRelevantes<T extends PlanoManutencaoSnapshot>(
  planos: T[],
  context?: PlanoManutencaoContext
) {
  const selected = new Map<string, T>();

  for (const plano of planos) {
    const key = getPlanoGroupKey(plano);
    const current = selected.get(key);

    if (!current || comparePlanoRecency(plano, current, context) > 0) {
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
