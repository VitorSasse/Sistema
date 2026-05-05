import { StatusAgendaProgramacao, TipoControleEquipamento } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dashboardStatuses = [
  "OPERANDO",
  "DISPONIVEL",
  "SEM_FRENTE",
  "MANUTENCAO",
  "FALTA",
  "FERIAS",
  "CHUVA"
] as const;

type DashboardStatus = (typeof dashboardStatuses)[number];

function toDateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(base: Date) {
  const date = toDateOnly(base);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date;
}

function endOfWeek(base: Date) {
  const date = startOfWeek(base);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function endOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
}

function enumerateDays(start: Date, end: Date) {
  const cursor = new Date(start);
  const days: Date[] = [];

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function normalizeProgramacaoStatus(status: StatusAgendaProgramacao): DashboardStatus {
  if (status === "PROGRAMADO" || status === "FINALIZADO") {
    return "DISPONIVEL";
  }

  if (status === "EM_EXECUCAO") {
    return "OPERANDO";
  }

  return status as DashboardStatus;
}

function getFallbackStatus(statusOperacional: string): DashboardStatus {
  if (statusOperacional === "EM_MANUTENCAO") {
    return "MANUTENCAO";
  }

  if (statusOperacional === "PARADO") {
    return "SEM_FRENTE";
  }

  return "DISPONIVEL";
}

function getRevisionSummary(params: {
  tipoControle: TipoControleEquipamento;
  horimetroAtual: number | null;
  kmAtual: number | null;
  planos: Array<{
    criterioControle: string;
    periodicidadeValor: number;
    toleranciaValor: number;
    proximaExecucaoEm: Date | null;
    proximoHorimetro: number | null;
    proximoKm: number | null;
  }>;
}) {
  if (params.planos.length === 0) {
    return {
      status: "SEM_PLANO" as const,
      label: "Sem plano"
    };
  }

  const today = toDateOnly(new Date());
  let nearestRisk: "EM_DIA" | "PROXIMA" | "VENCIDA" = "EM_DIA";

  function markProxima() {
    if (nearestRisk === "EM_DIA") {
      nearestRisk = "PROXIMA";
    }
  }

  for (const plano of params.planos) {
    if (plano.criterioControle === "DIAS" && plano.proximaExecucaoEm) {
      const diffDays = Math.ceil(
        (toDateOnly(plano.proximaExecucaoEm).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (diffDays < 0) {
        nearestRisk = "VENCIDA";
        break;
      }

      if (diffDays <= 3) {
        markProxima();
      }
    }

    if (plano.criterioControle === "HORIMETRO" && plano.proximoHorimetro !== null) {
      const leituraAtual = params.horimetroAtual ?? 0;
      const tolerancia = Math.max(plano.toleranciaValor, Math.ceil(plano.periodicidadeValor * 0.1));
      const distancia = plano.proximoHorimetro - leituraAtual;

      if (distancia < 0) {
        nearestRisk = "VENCIDA";
        break;
      }

      if (distancia <= tolerancia) {
        markProxima();
      }
    }

    if (plano.criterioControle === "KM" && plano.proximoKm !== null) {
      const leituraAtual = params.kmAtual ?? 0;
      const tolerancia = Math.max(plano.toleranciaValor, Math.ceil(plano.periodicidadeValor * 0.1));
      const distancia = plano.proximoKm - leituraAtual;

      if (distancia < 0) {
        nearestRisk = "VENCIDA";
        break;
      }

      if (distancia <= tolerancia) {
        markProxima();
      }
    }
  }

  return {
    status: nearestRisk,
    label:
      {
        EM_DIA: "Revisao em dia",
        PROXIMA: "Revisao proxima",
        VENCIDA: "Revisao vencida"
      }[nearestRisk]
  };
}

function getRowPriority(status: DashboardStatus, revisionStatus: string) {
  const statusWeight: Record<DashboardStatus, number> = {
    MANUTENCAO: 0,
    FALTA: 1,
    SEM_FRENTE: 2,
    CHUVA: 3,
    FERIAS: 4,
    OPERANDO: 5,
    DISPONIVEL: 6
  };

  const revisionWeight =
    revisionStatus === "VENCIDA" ? -2 : revisionStatus === "PROXIMA" ? -1 : 0;

  return statusWeight[status] + revisionWeight;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const clienteId = searchParams.get("clienteId");
  const obraId = searchParams.get("obraId");
  const statusFilter = searchParams.get("status") as DashboardStatus | null;
  const view = (searchParams.get("view") ?? "SEMANA").toUpperCase();
  const referenceDate = new Date(`${searchParams.get("date") ?? new Date().toISOString().slice(0, 10)}T00:00:00`);

  const rangeStart =
    view === "HOJE" ? toDateOnly(referenceDate) : view === "MES" ? startOfMonth(referenceDate) : startOfWeek(referenceDate);
  const rangeEnd =
    view === "HOJE"
      ? new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59, 999)
      : view === "MES"
        ? endOfMonth(referenceDate)
        : endOfWeek(referenceDate);

  const [clientes, obras, equipamentos, programacoes] = await Promise.all([
    prisma.cliente.findMany({
      where: { status: "ATIVO" },
      select: { id: true, codigo: true, nome: true },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.obra.findMany({
      where: {
        status: "ATIVO",
        clienteId: clienteId || undefined
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        clienteId: true,
        cliente: {
          select: {
            id: true,
            codigo: true,
            nome: true
          }
        }
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.equipamento.findMany({
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        descricao: true,
        placaOuTag: true,
        tipoRecurso: true,
        tipoControle: true,
        statusOperacional: true,
        horimetroAtual: true,
        kmAtual: true,
        planosManutencao: {
          where: {
            status: "ATIVO"
          },
          select: {
            criterioControle: true,
            periodicidadeValor: true,
            toleranciaValor: true,
            proximaExecucaoEm: true,
            proximoHorimetro: true,
            proximoKm: true
          }
        }
      },
      orderBy: [{ descricao: "asc" }]
    }),
    prisma.agendaProgramacao.findMany({
      where: {
        deletedAt: null,
        obra: clienteId
          ? {
              clienteId
            }
          : undefined,
        obraId: obraId || undefined,
        dataInicio: {
          lte: rangeEnd
        },
        dataFim: {
          gte: rangeStart
        }
      },
      select: {
        id: true,
        equipamentoId: true,
        obraId: true,
        local: true,
        dataInicio: true,
        dataFim: true,
        turno: true,
        status: true,
        observacoes: true,
        obra: {
          select: {
            id: true,
            codigo: true,
            nome: true,
            clienteId: true,
            cliente: {
              select: {
                id: true,
                codigo: true,
                nome: true
              }
            }
          }
        }
      },
      orderBy: [{ dataInicio: "asc" }, { createdAt: "asc" }]
    })
  ]);

  const days = enumerateDays(rangeStart, toDateOnly(rangeEnd));
  const focusDate = days.some((day) => day.getTime() === toDateOnly(new Date()).getTime())
    ? toDateOnly(new Date())
    : days[0];

  const mappedRows = equipamentos
    .map((equipamento) => {
      const revision = getRevisionSummary({
        tipoControle: equipamento.tipoControle,
        horimetroAtual: equipamento.horimetroAtual ? Number(equipamento.horimetroAtual) : null,
        kmAtual: equipamento.kmAtual ? Number(equipamento.kmAtual) : null,
        planos: equipamento.planosManutencao.map((plano) => ({
          criterioControle: plano.criterioControle,
          periodicidadeValor: plano.periodicidadeValor,
          toleranciaValor: plano.toleranciaValor,
          proximaExecucaoEm: plano.proximaExecucaoEm,
          proximoHorimetro: plano.proximoHorimetro ? Number(plano.proximoHorimetro) : null,
          proximoKm: plano.proximoKm ? Number(plano.proximoKm) : null
        }))
      });

      const programacoesEquipamento = programacoes.filter(
        (item) => item.equipamentoId === equipamento.id
      );

      const cells = days.map((day) => {
        const found = programacoesEquipamento.find((item) => {
          const itemStart = toDateOnly(item.dataInicio).getTime();
          const itemEnd = toDateOnly(item.dataFim).getTime();
          return day.getTime() >= itemStart && day.getTime() <= itemEnd;
        });

        const mappedStatus = found
          ? normalizeProgramacaoStatus(found.status)
          : getFallbackStatus(equipamento.statusOperacional);

        return {
          date: day.toISOString(),
          programacaoId: found?.id ?? null,
          status: mappedStatus,
          obraId: found?.obraId ?? null,
          obraNome: found?.obra?.nome ?? null,
          clienteId: found?.obra?.clienteId ?? null,
          clienteNome: found?.obra?.cliente.nome ?? null,
          obraCodigo: found?.obra?.codigo ?? null,
          local: found?.local ?? null,
          turno: found?.turno ?? null,
          observacoes: found?.observacoes ?? null
        };
      });

      const focusCell =
        cells.find((cell) => toDateOnly(new Date(cell.date)).getTime() === focusDate.getTime()) ??
        cells[0];

      return {
        equipamento: {
          id: equipamento.id,
          descricao: equipamento.descricao,
          placaOuTag: equipamento.placaOuTag,
          tipoRecurso: equipamento.tipoRecurso,
          statusOperacional: equipamento.statusOperacional
        },
        revision,
        focusStatus: focusCell.status,
        priority: getRowPriority(focusCell.status, revision.status),
        cells
      };
    })
    .sort((a, b) => a.priority - b.priority || a.equipamento.descricao.localeCompare(b.equipamento.descricao));

  const summary = dashboardStatuses.map((status) => ({
    status,
    count: mappedRows.filter((row) => row.focusStatus === status).length
  }));

  const rows = mappedRows.filter((row) => !statusFilter || row.focusStatus === statusFilter);

  return NextResponse.json({
    filters: {
      clienteId,
      obraId,
      status: statusFilter,
      view,
      referenceDate: referenceDate.toISOString()
    },
    range: {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
      focusDate: focusDate.toISOString()
    },
    days: days.map((day) => day.toISOString()),
    clients: clientes,
    obras,
    summary,
    rows
  });
}
