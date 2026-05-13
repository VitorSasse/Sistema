import { Prisma, PrismaClient, StatusAgendaProgramacao, TurnoAgendaProgramacao } from "@prisma/client";
import type { ProgramacaoInput } from "@/lib/validators/programacao";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function buildProgramacaoWhere(filters: {
  clienteId?: string | null;
  equipamentoId?: string | null;
  obraId?: string | null;
  status?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
}): Prisma.AgendaProgramacaoWhereInput {
  const status =
    filters.status &&
    Object.values(StatusAgendaProgramacao).includes(filters.status as StatusAgendaProgramacao)
      ? (filters.status as StatusAgendaProgramacao)
      : undefined;

  return {
    deletedAt: null,
    obra: filters.clienteId
      ? {
          clienteId: filters.clienteId
        }
      : undefined,
    equipamentoId: filters.equipamentoId || undefined,
    obraId: filters.obraId || undefined,
    status,
    dataInicio:
      filters.dataInicio || filters.dataFim
        ? {
            lte: filters.dataFim ? endOfDay(filters.dataFim) : undefined
          }
        : undefined,
    dataFim:
      filters.dataInicio || filters.dataFim
        ? {
            gte: filters.dataInicio ? startOfDay(filters.dataInicio) : undefined
          }
        : undefined
  };
}

export function listarProgramacoes(
  db: DbClient,
  filters: {
    clienteId?: string | null;
    equipamentoId?: string | null;
    obraId?: string | null;
    status?: string | null;
    dataInicio?: string | null;
    dataFim?: string | null;
  }
) {
  return db.agendaProgramacao.findMany({
    where: buildProgramacaoWhere(filters),
    include: {
      equipamento: {
        select: {
          id: true,
          descricao: true,
          placaOuTag: true,
          tipoRecurso: true,
          statusOperacional: true
        }
      },
      obra: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          clienteId: true,
          cliente: {
            select: {
              id: true,
              nome: true,
              codigo: true
            }
          }
        }
      }
    },
    orderBy: [{ dataInicio: "asc" }, { equipamento: { descricao: "asc" } }]
  });
}

export async function validarRelacionamentosProgramacao(db: DbClient, input: ProgramacaoInput) {
  const [equipamento, obra] = await Promise.all([
    db.equipamento.findUnique({
      where: { id: input.equipamentoId },
      select: { id: true, status: true }
    }),
    input.obraId
      ? db.obra.findUnique({
          where: { id: input.obraId },
          select: { id: true, status: true }
        })
      : Promise.resolve(null)
  ]);

  if (!equipamento || equipamento.status !== "ATIVO") {
    throw new Error("EQUIPAMENTO_INVALIDO");
  }

  if (input.obraId) {
    if (!obra || obra.status !== "ATIVO") {
      throw new Error("OBRA_INVALIDA");
    }
  }
}

export async function existeConflitoProgramacao(
  db: DbClient,
  params: {
    equipamentoId: string;
    dataInicio: Date;
    dataFim: Date;
    turno?: TurnoAgendaProgramacao | null;
    excludeId?: string;
  }
) {
  const conflitos = await db.agendaProgramacao.findMany({
    where: {
      id: params.excludeId ? { not: params.excludeId } : undefined,
      deletedAt: null,
      equipamentoId: params.equipamentoId,
      dataInicio: {
        lte: params.dataFim
      },
      dataFim: {
        gte: params.dataInicio
      }
    },
    include: {
      obra: {
        select: {
          nome: true
        }
      }
    },
    orderBy: [{ dataInicio: "asc" }, { turno: "asc" }, { createdAt: "asc" }]
  });

  const conflito = conflitos.find((item) => {
    const sameStart = item.dataInicio.getTime() === params.dataInicio.getTime();
    const sameEnd = item.dataFim.getTime() === params.dataFim.getTime();
    const sameSingleDayRange = sameStart && sameEnd;
    const currentTurno = item.turno ?? TurnoAgendaProgramacao.INTEGRAL;
    const nextTurno = params.turno ?? TurnoAgendaProgramacao.INTEGRAL;

    if (!sameSingleDayRange) {
      return true;
    }

    if (
      currentTurno === TurnoAgendaProgramacao.INTEGRAL ||
      nextTurno === TurnoAgendaProgramacao.INTEGRAL
    ) {
      return true;
    }

    return currentTurno === nextTurno;
  });

  return conflito ?? null;
}

export function mapProgramacaoData(input: ProgramacaoInput) {
  return {
    equipamentoId: input.equipamentoId,
    obraId: input.obraId || null,
    local: input.local || null,
    dataInicio: startOfDay(input.dataInicio),
    dataFim: endOfDay(input.dataFim),
    turno: input.turno ?? TurnoAgendaProgramacao.INTEGRAL,
    status: input.status,
    observacoes: input.observacoes || null
  };
}
