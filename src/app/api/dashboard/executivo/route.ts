import { Prisma, StatusAgendaProgramacao, TipoRecurso } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { measurePerformanceStep } from "@/lib/performance/request-context";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { parseOptionalDateOnlyStart } from "@/lib/utils/date";

const allowedPresets = [
  "current_month",
  "previous_month",
  "last_30_days",
  "custom"
] as const;

const dashboardStatuses = [
  "PROGRAMADO",
  "FINALIZADO",
  "OPERANDO",
  "DISPONIVEL",
  "SEM_FRENTE",
  "MANUTENCAO",
  "FALTA",
  "FERIAS",
  "FERIADO",
  "CHUVA"
] as const;

type PeriodPreset = (typeof allowedPresets)[number];
type DashboardStatus = (typeof dashboardStatuses)[number];
type MaintenanceClass = "preventiva" | "corretiva" | "externa";
type LossGroup = "PRODUTIVO" | "CONTROLAVEL" | "TECNICO" | "ADMINISTRATIVO" | "EXTERNO";
type ExecutiveScope = "fixos" | "complementares";

type MedicaoPeriodRow = {
  id: string;
};

function parseIdList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseScope(value: string | null): ExecutiveScope {
  return value === "complementares" ? "complementares" : "fixos";
}

type ScheduleEntry = {
  id: string;
  equipamentoId: string;
  obraId: string | null;
  obraLabel: string | null;
  local: string | null;
  observacoes: string | null;
  status: DashboardStatus;
  turno: string | null;
  dataInicio: Date;
  dataFim: Date;
};

type DayCandidate = {
  status: DashboardStatus;
  turno: string | null;
  obraId: string | null;
  obraLabel: string | null;
  maintenanceClass: MaintenanceClass | null;
};

type HeatCell = {
  date: string;
  label: string;
  status: string;
  tone: "produtivo" | "ocioso" | "manutencao" | "admin" | "externo" | "folga";
};

type EquipmentAggregate = {
  equipamentoId: string;
  descricao: string;
  placaOuTag: string;
  tipoRecurso: TipoRecurso;
  calendarHours: number;
  availableHours: number;
  operatedHours: number;
  controllableIdleHours: number;
  impactControllableIdleHours: number;
  technicalHours: number;
  impactTechnicalHours: number;
  adminHours: number;
  externalHours: number;
  preventiveHours: number;
  correctiveHours: number;
  externalMaintenanceHours: number;
  measuredValue: number;
  measuredDays: Set<string>;
  dailyReferenceValue: number;
  hourlyReferenceValue: number;
  estimatedLoss: number;
  productiveDays: Set<string>;
  heatCells: HeatCell[];
};

type WorksiteAggregate = {
  obraId: string;
  label: string;
  productiveHours: number;
  measuredValue: number;
  equipamentos: Set<string>;
};

type FailureAggregate = {
  equipamentoId: string;
  descricao: string;
  placaOuTag: string;
  tipoRecurso: TipoRecurso;
  count: number;
  totalCost: number;
  lastExecution: Date;
  types: Set<string>;
};

const CARGA_EQUIVALENT_HOURS = 0.75;

const turnHours: Record<string, number> = {
  MANHA: 4,
  TARDE: 4,
  NOITE: 4,
  INTEGRAL: 8
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDateInput(value: string | null) {
  return parseOptionalDateOnlyStart(value);
}

function resolvePeriod(searchParams: URLSearchParams) {
  const presetParam = searchParams.get("period");
  const preset: PeriodPreset = allowedPresets.includes(presetParam as PeriodPreset)
    ? (presetParam as PeriodPreset)
    : "current_month";

  const now = new Date();

  if (preset === "previous_month") {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      preset,
      start: startOfMonth(previousMonth),
      end: endOfMonth(previousMonth),
      label: previousMonth.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      })
    };
  }

  if (preset === "last_30_days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return {
      preset,
      start,
      end,
      label: "Ultimos 30 dias"
    };
  }

  if (preset === "custom") {
    const startInput = parseDateInput(searchParams.get("start"));
    const endInput = parseDateInput(searchParams.get("end"));

    if (!startInput || !endInput) {
      return null;
    }

    return {
      preset,
      start: new Date(
        startInput.getFullYear(),
        startInput.getMonth(),
        startInput.getDate(),
        0,
        0,
        0,
        0
      ),
      end: new Date(
        endInput.getFullYear(),
        endInput.getMonth(),
        endInput.getDate(),
        23,
        59,
        59,
        999
      ),
      label: `${startInput.toLocaleDateString("pt-BR")} a ${endInput.toLocaleDateString("pt-BR")}`
    };
  }

  return {
    preset: "current_month" as const,
    start: startOfMonth(now),
    end: endOfMonth(now),
    label: now.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    })
  };
}

function toDateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDayLabel(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function toWeekLabel(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    weekday: "short"
  });
}

function enumerateDays(start: Date, end: Date) {
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const days: Date[] = [];

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function isWeekend(value: Date) {
  const day = value.getDay();
  return day === 0 || day === 6;
}

function normalizeProgramacaoStatus(status: StatusAgendaProgramacao): DashboardStatus {
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

function getStatusPriority(status: DashboardStatus) {
  const statusWeight: Record<DashboardStatus, number> = {
    MANUTENCAO: 0,
    FALTA: 1,
    FERIADO: 2,
    SEM_FRENTE: 3,
    CHUVA: 4,
    FERIAS: 5,
    OPERANDO: 6,
    FINALIZADO: 7,
    PROGRAMADO: 8,
    DISPONIVEL: 9
  };

  return statusWeight[status];
}

function classifyMaintenanceSource(input: { observacoes: string | null; local: string | null }) {
  const source = `${input.observacoes ?? ""} ${input.local ?? ""}`.toLowerCase();

  if (source.includes("oficina") || source.includes("extern") || source.includes("terceir")) {
    return "externa" as const;
  }

  if (source.includes("prevent")) {
    return "preventiva" as const;
  }

  return "corretiva" as const;
}

function resolveHeatTone(status: string): HeatCell["tone"] {
  if (status === "OPERANDO") return "produtivo";
  if (status === "MANUTENCAO") return "manutencao";
  if (status === "FERIADO" || status === "FERIAS") return "admin";
  if (status === "CHUVA") return "externo";
  if (status === "FOLGA") return "folga";
  return "ocioso";
}

function resolveLossStatusMeta(status: DashboardStatus): {
  group: LossGroup;
  key: string;
  label: string;
} {
  switch (status) {
    case "PROGRAMADO":
      return { group: "PRODUTIVO", key: "programado", label: "Programado" };
    case "FINALIZADO":
      return { group: "PRODUTIVO", key: "finalizado", label: "Finalizado" };
    case "OPERANDO":
      return { group: "PRODUTIVO", key: "operando", label: "Operando" };
    case "DISPONIVEL":
      return {
        group: "CONTROLAVEL",
        key: "disponivel",
        label: "Disponivel sem alocacao"
      };
    case "SEM_FRENTE":
      return { group: "CONTROLAVEL", key: "sem_frente", label: "Sem frente" };
    case "FALTA":
      return {
        group: "CONTROLAVEL",
        key: "falta_operador",
        label: "Aguardando operador"
      };
    case "MANUTENCAO":
      return { group: "TECNICO", key: "manutencao", label: "Manutencao" };
    case "FERIADO":
      return { group: "ADMINISTRATIVO", key: "feriado", label: "Feriado" };
    case "FERIAS":
      return { group: "ADMINISTRATIVO", key: "ferias", label: "Ferias" };
    case "CHUVA":
      return { group: "EXTERNO", key: "chuva", label: "Chuva" };
    default:
      return { group: "CONTROLAVEL", key: "outros", label: "Outros" };
  }
}

function shouldCountAsOperationalLoss(segment: {
  status: DashboardStatus;
  obraId: string | null;
}) {
  if (segment.status === "DISPONIVEL" && segment.obraId) {
    return false;
  }

  return true;
}

function formatMonthShort(value: Date) {
  return value
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "")
    .toUpperCase();
}

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/dashboard/executivo" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para visualizar o dashboard executivo." }, { status: 409 });
  }

  const period = resolvePeriod(request.nextUrl.searchParams);

  if (!period) {
    return NextResponse.json({ message: "Periodo personalizado invalido." }, { status: 400 });
  }

  if (period.end < period.start) {
    return NextResponse.json(
      { message: "O periodo final nao pode ser menor que o inicial." },
      { status: 400 }
    );
  }

  const selectedEquipmentIds = parseIdList(request.nextUrl.searchParams.get("equipmentIds"));
  const scope = parseScope(request.nextUrl.searchParams.get("scope"));
  const complementar = scope === "complementares";

  const days = enumerateDays(period.start, period.end);
  const businessDays = days.filter((day) => !isWeekend(day));
  const heatmapDays = days.map((day) => ({
    date: toDateKey(day),
    label: toDayLabel(day),
    weekLabel: toWeekLabel(day).replace(".", "").toUpperCase(),
    weekend: isWeekend(day)
  }));

  const medicaoIdsPeriodo = await measurePerformanceStep("loadMeasurementIds", () => prisma.$queryRaw<MedicaoPeriodRow[]>(Prisma.sql`
    SELECT
      medicao.id
    FROM "Medicao" medicao
    INNER JOIN "MedicaoItem" item
      ON item."medicaoId" = medicao.id
     AND item."deletedAt" IS NULL
     AND item."empresaId" = ${empresaId}
    WHERE medicao."deletedAt" IS NULL
      AND medicao."empresaId" = ${empresaId}
      AND medicao.status <> 'CANCELADA'::"StatusMedicao"
    GROUP BY medicao.id
    HAVING MAX(item."data") >= ${period.start}
       AND MAX(item."data") <= ${period.end}
  `));

  const medicaoIds = medicaoIdsPeriodo.map((item) => item.id);

  const [
    equipamentos,
    programacoes,
    manutencoesExecutadas,
    precosHora,
    medicaoItems,
    lancamentosProdutivos
  ] = await measurePerformanceStep("loadDashboardData", () => Promise.all([
    prisma.equipamento.findMany({
      where: {
        status: "ATIVO",
        complementar,
        tipoRecurso: {
          in: ["CAMINHAO", "MAQUINA"]
        }
      },
      select: {
        id: true,
        descricao: true,
        placaOuTag: true,
        tipoRecurso: true,
        statusOperacional: true
      },
      orderBy: [{ tipoRecurso: "asc" }, { descricao: "asc" }, { placaOuTag: "asc" }]
    }),
    prisma.agendaProgramacao.findMany({
      where: {
        deletedAt: null,
        equipamento: {
          complementar,
          tipoRecurso: {
            in: ["CAMINHAO", "MAQUINA"]
          }
        },
        dataInicio: {
          lte: period.end
        },
        dataFim: {
          gte: period.start
        }
      },
      select: {
        id: true,
        equipamentoId: true,
        obraId: true,
        local: true,
        observacoes: true,
        dataInicio: true,
        dataFim: true,
        turno: true,
        status: true,
        obra: {
          select: {
            id: true,
            codigo: true,
            nome: true
          }
        }
      },
      orderBy: [{ dataInicio: "asc" }, { turno: "asc" }]
    }),
    prisma.manutencaoExecutada.findMany({
      where: {
        equipamento: {
          complementar,
          tipoRecurso: {
            in: ["CAMINHAO", "MAQUINA"]
          }
        },
        dataExecucao: {
          gte: period.start,
          lte: period.end
        }
      },
      select: {
        equipamentoId: true,
        dataExecucao: true,
        tipoManutencao: true,
        fornecedorOficina: true,
        custo: true,
        equipamento: {
          select: {
            descricao: true,
            placaOuTag: true,
            tipoRecurso: true
          }
        }
      }
    }),
    prisma.precoClienteObra.findMany({
      where: {
        status: "ATIVO",
        equipamentoId: {
          not: null
        },
        equipamento: {
          complementar,
          tipoRecurso: {
            in: ["CAMINHAO", "MAQUINA"]
          }
        },
        unidadeFaturamento: "HORA"
      },
      select: {
        equipamentoId: true,
        valorUnitario: true
      }
    }),
    medicaoIds.length === 0
      ? Promise.resolve([])
      : prisma.medicaoItem.findMany({
          where: {
            deletedAt: null,
            medicaoId: {
              in: medicaoIds
            },
            lancamento: {
              deletedAt: null,
              equipamento: {
                complementar,
                tipoRecurso: {
                  in: ["CAMINHAO", "MAQUINA"]
                }
              }
            }
          },
          select: {
            medicaoId: true,
            data: true,
            valorTotalItem: true,
            medicao: {
              select: {
                valorTotal: true,
                descontoValor: true,
                obraId: true,
                obra: {
                  select: {
                    id: true,
                    codigo: true,
                    nome: true
                  }
                }
              }
            },
            lancamento: {
              select: {
                obraId: true,
                obra: {
                  select: {
                    id: true,
                    codigo: true,
                    nome: true
                  }
                },
                equipamento: {
                  select: {
                    id: true,
                    descricao: true,
                    placaOuTag: true,
                    tipoRecurso: true
                  }
                }
              }
            }
          },
          orderBy: [{ data: "desc" }, { createdAt: "desc" }]
        }),
    prisma.lancamentoDiario.findMany({
      where: {
        deletedAt: null,
        statusValidacao: {
          not: "CANCELADO"
        },
        data: {
          gte: period.start,
          lte: period.end
        },
        obraId: {
          not: null
        },
        equipamento: {
          complementar,
          tipoRecurso: {
            in: ["CAMINHAO", "MAQUINA"]
          }
        }
      },
      select: {
        obraId: true,
        quantidadeApontada: true,
        unidadeApontada: true,
        equipamentoId: true,
        equipamento: {
          select: {
            tipoRecurso: true
          }
        },
        obra: {
          select: {
            id: true,
            codigo: true,
            nome: true
          }
        }
      }
    })
  ]));

  const relevantEquipmentIds = new Set<string>();

  for (const item of medicaoItems) {
    relevantEquipmentIds.add(item.lancamento.equipamento.id);
  }

  for (const item of programacoes) {
    relevantEquipmentIds.add(item.equipamentoId);
  }

  for (const item of manutencoesExecutadas) {
    relevantEquipmentIds.add(item.equipamentoId);
  }

  for (const item of lancamentosProdutivos) {
    relevantEquipmentIds.add(item.equipamentoId);
  }

  const equipamentosDisponiveis =
    scope === "complementares"
      ? equipamentos
      : equipamentos.filter((item) => relevantEquipmentIds.has(item.id));

  const equipamentoMap = new Map(
    equipamentosDisponiveis.map((item) => [
      item.id,
      {
        ...item,
        fallbackStatus: getFallbackStatus(item.statusOperacional)
      }
    ])
  );

  const sanitizedSelectedEquipmentIds = selectedEquipmentIds.filter((id) => equipamentoMap.has(id));

  const selectedEquipmentSet =
    sanitizedSelectedEquipmentIds.length > 0 ? new Set(sanitizedSelectedEquipmentIds) : null;
  const equipamentosFiltrados = selectedEquipmentSet
    ? equipamentosDisponiveis.filter((item) => selectedEquipmentSet.has(item.id))
    : equipamentosDisponiveis;

  const scheduleEntries: ScheduleEntry[] = programacoes
    .filter(
      (item) =>
        equipamentoMap.has(item.equipamentoId) &&
        (!selectedEquipmentSet || selectedEquipmentSet.has(item.equipamentoId))
    )
    .map((item) => ({
      id: item.id,
      equipamentoId: item.equipamentoId,
      obraId: item.obraId,
      obraLabel: item.obra ? `${item.obra.codigo} - ${item.obra.nome}` : null,
      local: item.local,
      observacoes: item.observacoes,
      status: normalizeProgramacaoStatus(item.status),
      turno: item.turno,
      dataInicio: item.dataInicio,
      dataFim: item.dataFim
    }));

  const scheduleCandidates = new Map<string, DayCandidate[]>();

  for (const entry of scheduleEntries) {
    const start = toDateOnly(entry.dataInicio);
    const end = toDateOnly(entry.dataFim);
    const overlapStart = start < period.start ? toDateOnly(period.start) : start;
    const overlapEnd = end > period.end ? toDateOnly(period.end) : end;

    for (const day of enumerateDays(overlapStart, overlapEnd)) {
      const dayKey = `${entry.equipamentoId}:${toDateKey(day)}`;
      const bucket = scheduleCandidates.get(dayKey) ?? [];
      bucket.push({
        status: entry.status,
        turno: entry.turno,
        obraId: entry.obraId,
        obraLabel: entry.obraLabel,
        maintenanceClass:
          entry.status === "MANUTENCAO"
            ? classifyMaintenanceSource({
                observacoes: entry.observacoes,
                local: entry.local
              })
            : null
      });
      scheduleCandidates.set(dayKey, bucket);
    }
  }

  const measuredValueByEquipment = new Map<string, number>();
  const measuredValueByWorksite = new Map<string, number>();
  const measuredDaysByEquipment = new Map<string, Set<string>>();
  const medicaoItemsByMedicao = new Map<string, typeof medicaoItems>();

  for (const item of medicaoItems) {
    const bucket = medicaoItemsByMedicao.get(item.medicaoId) ?? [];
    bucket.push(item);
    medicaoItemsByMedicao.set(item.medicaoId, bucket);
  }

  for (const groupedItems of medicaoItemsByMedicao.values()) {
    if (!groupedItems.length) continue;

    const gross = Number(groupedItems[0].medicao.valorTotal ?? 0);
    const discount = Number(groupedItems[0].medicao.descontoValor ?? 0);
    const net = Math.max(0, gross - discount);

    let allocated = 0;

    groupedItems.forEach((item, index) => {
      const itemGross = Number(item.valorTotalItem ?? 0);
      const isLast = index === groupedItems.length - 1;
      const allocatedValue =
        gross > 0 && discount > 0
          ? isLast
            ? Number((net - allocated).toFixed(2))
            : Number(((itemGross / gross) * net).toFixed(2))
          : itemGross;

      allocated = Number((allocated + allocatedValue).toFixed(2));

      const equipamentoId = item.lancamento.equipamento.id;
      if (selectedEquipmentSet && !selectedEquipmentSet.has(equipamentoId)) {
        return;
      }
      const currentValue = measuredValueByEquipment.get(equipamentoId) ?? 0;
      measuredValueByEquipment.set(
        equipamentoId,
        Number((currentValue + allocatedValue).toFixed(2))
      );
      const measuredDays = measuredDaysByEquipment.get(equipamentoId) ?? new Set<string>();
      measuredDays.add(toDateKey(item.data));
      measuredDaysByEquipment.set(equipamentoId, measuredDays);

      const obra = item.lancamento.obra ?? item.medicao.obra;
      if (obra) {
        const worksiteKey = obra.id;
        const currentWorksiteValue = measuredValueByWorksite.get(worksiteKey) ?? 0;
        measuredValueByWorksite.set(
          worksiteKey,
          Number((currentWorksiteValue + allocatedValue).toFixed(2))
        );
      }
    });
  }

  const averageHourlyPriceByEquipment = new Map<string, number>();
  const priceBuckets = new Map<string, number[]>();

  for (const price of precosHora) {
    if (!price.equipamentoId) continue;
    const bucket = priceBuckets.get(price.equipamentoId) ?? [];
    bucket.push(Number(price.valorUnitario ?? 0));
    priceBuckets.set(price.equipamentoId, bucket);
  }

  for (const [equipamentoId, values] of priceBuckets.entries()) {
    const average = values.reduce((acc, item) => acc + item, 0) / values.length;
    averageHourlyPriceByEquipment.set(equipamentoId, Number(average.toFixed(2)));
  }

  const lossBucketMap = new Map<
    string,
    { key: string; label: string; group: LossGroup; hours: number }
  >();
  const worksiteMap = new Map<string, WorksiteAggregate>();
  const equipmentAggregates = new Map<string, EquipmentAggregate>();

  for (const equipamento of equipamentosFiltrados) {
    const aggregate: EquipmentAggregate = {
      equipamentoId: equipamento.id,
      descricao: equipamento.descricao,
      placaOuTag: equipamento.placaOuTag,
      tipoRecurso: equipamento.tipoRecurso,
      calendarHours: businessDays.length * 8,
      availableHours: 0,
      operatedHours: 0,
      controllableIdleHours: 0,
      impactControllableIdleHours: 0,
      technicalHours: 0,
      impactTechnicalHours: 0,
      adminHours: 0,
      externalHours: 0,
      preventiveHours: 0,
      correctiveHours: 0,
      externalMaintenanceHours: 0,
      measuredValue: Number(measuredValueByEquipment.get(equipamento.id) ?? 0),
      measuredDays: new Set(measuredDaysByEquipment.get(equipamento.id) ?? []),
      dailyReferenceValue: 0,
      hourlyReferenceValue: 0,
      estimatedLoss: 0,
      productiveDays: new Set<string>(),
      heatCells: []
    };

    for (const day of days) {
      const dayKey = toDateKey(day);
      const candidateKey = `${equipamento.id}:${dayKey}`;
      const candidates = scheduleCandidates.get(candidateKey) ?? [];
      const fallbackStatus = equipamentoMap.get(equipamento.id)?.fallbackStatus ?? "DISPONIVEL";

      if (!isWeekend(day)) {
        const resolvedSegments: Array<{
          status: DashboardStatus;
          hours: number;
          obraId: string | null;
          obraLabel: string | null;
          maintenanceClass: MaintenanceClass | null;
          inferred: boolean;
        }> = [];

        const integralCandidates = candidates.filter(
          (item) => !item.turno || item.turno === "INTEGRAL"
        );

        if (integralCandidates.length > 0) {
          const chosen = [...integralCandidates].sort(
            (a, b) => getStatusPriority(a.status) - getStatusPriority(b.status)
          )[0];

          if (chosen) {
            resolvedSegments.push({
              status: chosen.status,
              hours: 8,
              obraId: chosen.obraId,
              obraLabel: chosen.obraLabel,
              maintenanceClass: chosen.maintenanceClass,
              inferred: false
            });
          }
        } else {
          const turnMap = new Map<string, DayCandidate>();

          for (const candidate of candidates) {
            const turn = candidate.turno ?? "INTEGRAL";
            const existing = turnMap.get(turn);

            if (!existing || getStatusPriority(candidate.status) < getStatusPriority(existing.status)) {
              turnMap.set(turn, candidate);
            }
          }

          let assignedHours = 0;

          for (const [turn, candidate] of turnMap.entries()) {
            const hours = turnHours[turn] ?? 4;
            const clampedHours = Math.min(hours, Math.max(0, 8 - assignedHours));

            if (clampedHours <= 0) continue;

            resolvedSegments.push({
              status: candidate.status,
              hours: clampedHours,
              obraId: candidate.obraId,
              obraLabel: candidate.obraLabel,
              maintenanceClass: candidate.maintenanceClass,
              inferred: false
            });

            assignedHours += clampedHours;
          }

          if (assignedHours < 8) {
            resolvedSegments.push({
              status: fallbackStatus,
              hours: 8 - assignedHours,
              obraId: null,
              obraLabel: null,
              maintenanceClass: fallbackStatus === "MANUTENCAO" ? "corretiva" : null,
              inferred: true
            });
          }
        }

        let heatStatus = fallbackStatus;
        let heatStatusHours = -1;

        for (const segment of resolvedSegments) {
          if (segment.hours > heatStatusHours) {
            heatStatus = segment.status;
            heatStatusHours = segment.hours;
          } else if (
            segment.hours === heatStatusHours &&
            getStatusPriority(segment.status) < getStatusPriority(heatStatus)
          ) {
            heatStatus = segment.status;
          }

          const meta = resolveLossStatusMeta(segment.status);
          const countAsLoss = shouldCountAsOperationalLoss(segment);

          if (segment.status === "OPERANDO") {
            aggregate.operatedHours += segment.hours;
            aggregate.productiveDays.add(dayKey);
          } else if (meta.group === "CONTROLAVEL" && countAsLoss) {
            aggregate.controllableIdleHours += segment.hours;
            if (!segment.inferred) {
              aggregate.impactControllableIdleHours += segment.hours;
            }
          } else if (meta.group === "TECNICO" && countAsLoss) {
            aggregate.technicalHours += segment.hours;
            if (!segment.inferred) {
              aggregate.impactTechnicalHours += segment.hours;
            }

            if (segment.maintenanceClass === "preventiva") {
              aggregate.preventiveHours += segment.hours;
            } else if (segment.maintenanceClass === "externa") {
              aggregate.externalMaintenanceHours += segment.hours;
            } else {
              aggregate.correctiveHours += segment.hours;
            }
          } else if (meta.group === "ADMINISTRATIVO" && countAsLoss) {
            aggregate.adminHours += segment.hours;
          } else if (meta.group === "EXTERNO" && countAsLoss) {
            aggregate.externalHours += segment.hours;
          }

          if (meta.group !== "PRODUTIVO" && countAsLoss && !segment.inferred) {
            const bucket = lossBucketMap.get(meta.key) ?? {
              key: meta.key,
              label: meta.label,
              group: meta.group,
              hours: 0
            };
            bucket.hours += segment.hours;
            lossBucketMap.set(meta.key, bucket);
          }
        }

        aggregate.availableHours = Number(
          (aggregate.calendarHours - aggregate.technicalHours).toFixed(2)
        );

        aggregate.heatCells.push({
          date: dayKey,
          label: toDayLabel(day),
          status:
            heatStatus === "PROGRAMADO"
              ? "Programado"
              : heatStatus === "FINALIZADO"
                ? "Finalizado"
                : heatStatus === "DISPONIVEL"
              ? "Disponivel"
              : heatStatus === "SEM_FRENTE"
                ? "Sem frente"
                : heatStatus === "MANUTENCAO"
                  ? "Manutencao"
                  : heatStatus === "FALTA"
                    ? "Falta"
                    : heatStatus === "FERIAS"
                      ? "Ferias"
                      : heatStatus === "FERIADO"
                        ? "Feriado"
                        : heatStatus === "CHUVA"
                          ? "Chuva"
                          : "Operando",
          tone: resolveHeatTone(heatStatus)
        });
      } else {
        const weekendStatus = [...candidates].sort(
          (a, b) => getStatusPriority(a.status) - getStatusPriority(b.status)
        )[0]?.status;

        aggregate.heatCells.push({
          date: dayKey,
          label: toDayLabel(day),
          status: weekendStatus ? weekendStatus.toLowerCase() : "Folga",
          tone: weekendStatus ? resolveHeatTone(weekendStatus) : "folga"
        });
      }
    }

    aggregate.availableHours = Number(
      Math.max(0, aggregate.calendarHours - aggregate.technicalHours).toFixed(2)
    );

    const explicitImpactHours = Number(
      (aggregate.impactControllableIdleHours + aggregate.impactTechnicalHours).toFixed(2)
    );
    const dailyReference =
      aggregate.measuredDays.size > 0
        ? Number((aggregate.measuredValue / aggregate.measuredDays.size).toFixed(2))
        : Number(((averageHourlyPriceByEquipment.get(equipamento.id) ?? 0) * 8).toFixed(2));
    const hourlyReference =
      dailyReference > 0 ? Number((dailyReference / 8).toFixed(2)) : 0;

    aggregate.dailyReferenceValue = dailyReference;
    aggregate.hourlyReferenceValue = hourlyReference;
    aggregate.estimatedLoss = Number(
      (((explicitImpactHours / 8) * dailyReference) || 0).toFixed(2)
    );

    equipmentAggregates.set(equipamento.id, aggregate);
  }

  for (const lancamento of lancamentosProdutivos) {
    if (selectedEquipmentSet && !selectedEquipmentSet.has(lancamento.equipamentoId)) continue;
    if (!lancamento.obraId || !lancamento.obra) continue;

    const quantidade = Number(lancamento.quantidadeApontada ?? 0);
    const productiveHours =
      lancamento.unidadeApontada === "HORA"
        ? quantidade
        : lancamento.unidadeApontada === "CARGA" &&
            lancamento.equipamento.tipoRecurso === "CAMINHAO"
          ? quantidade * CARGA_EQUIVALENT_HOURS
          : 0;

    if (productiveHours <= 0) continue;

    const worksite = worksiteMap.get(lancamento.obraId) ?? {
      obraId: lancamento.obraId,
      label: `${lancamento.obra.codigo} - ${lancamento.obra.nome}`,
      productiveHours: 0,
      measuredValue: 0,
      equipamentos: new Set<string>()
    };

    worksite.productiveHours = Number(
      (worksite.productiveHours + productiveHours).toFixed(2)
    );
    worksite.equipamentos.add(lancamento.equipamentoId);
    worksiteMap.set(lancamento.obraId, worksite);
  }

  for (const [obraId, value] of measuredValueByWorksite.entries()) {
    const worksite = worksiteMap.get(obraId);
    if (!worksite) continue;
    worksite.measuredValue = Number((worksite.measuredValue + value).toFixed(2));
    worksiteMap.set(obraId, worksite);
  }

  const failuresMap = new Map<string, FailureAggregate>();

  for (const item of manutencoesExecutadas) {
    if (selectedEquipmentSet && !selectedEquipmentSet.has(item.equipamentoId)) continue;
    const current = failuresMap.get(item.equipamentoId) ?? {
      equipamentoId: item.equipamentoId,
      descricao: item.equipamento.descricao,
      placaOuTag: item.equipamento.placaOuTag,
      tipoRecurso: item.equipamento.tipoRecurso,
      count: 0,
      totalCost: 0,
      lastExecution: item.dataExecucao,
      types: new Set<string>()
    };

    current.count += 1;
    current.totalCost = Number((current.totalCost + Number(item.custo ?? 0)).toFixed(2));
    current.types.add(item.tipoManutencao);

    if (item.dataExecucao > current.lastExecution) {
      current.lastExecution = item.dataExecucao;
    }

    failuresMap.set(item.equipamentoId, current);
  }

  const aggregates = Array.from(equipmentAggregates.values());

  const totalCalendarHours = Number(
    aggregates.reduce((acc, item) => acc + item.calendarHours, 0).toFixed(2)
  );
  const totalAvailableHours = Number(
    aggregates.reduce((acc, item) => acc + item.availableHours, 0).toFixed(2)
  );
  const totalOperatedHours = Number(
    aggregates.reduce((acc, item) => acc + item.operatedHours, 0).toFixed(2)
  );
  const totalTechnicalHours = Number(
    aggregates.reduce((acc, item) => acc + item.technicalHours, 0).toFixed(2)
  );
  const totalControllableHours = Number(
    aggregates.reduce((acc, item) => acc + item.controllableIdleHours, 0).toFixed(2)
  );
  const totalAdminHours = Number(
    aggregates.reduce((acc, item) => acc + item.adminHours, 0).toFixed(2)
  );
  const totalExternalHours = Number(
    aggregates.reduce((acc, item) => acc + item.externalHours, 0).toFixed(2)
  );
  const totalMeasuredValue = Number(
    aggregates.reduce((acc, item) => acc + item.measuredValue, 0).toFixed(2)
  );
  const totalEstimatedLoss = Number(
    aggregates.reduce((acc, item) => acc + item.estimatedLoss, 0).toFixed(2)
  );

  const utilizationRanking = aggregates
    .map((item) => {
      const utilizationPercent =
        item.availableHours > 0 ? Number(((item.operatedHours / item.availableHours) * 100).toFixed(2)) : 0;

      return {
        equipamentoId: item.equipamentoId,
        descricao: item.descricao,
        placaOuTag: item.placaOuTag,
        tipoRecurso: item.tipoRecurso,
        operatedHours: item.operatedHours,
        availableHours: item.availableHours,
        calendarHours: item.calendarHours,
        controllableIdleHours: item.controllableIdleHours,
        utilizationPercent,
        band:
          utilizationPercent > 80 ? "EXCELENTE" : utilizationPercent >= 65 ? "BOM" : "OCIOSO"
      };
    })
    .sort((a, b) => {
      if (b.utilizationPercent !== a.utilizationPercent) {
        return b.utilizationPercent - a.utilizationPercent;
      }

      return a.placaOuTag.localeCompare(b.placaOuTag);
    });

  const mechanicalRanking = aggregates
    .map((item) => {
      const mechanicalPercent =
        item.calendarHours > 0 ? Number(((item.availableHours / item.calendarHours) * 100).toFixed(2)) : 0;

      return {
        equipamentoId: item.equipamentoId,
        descricao: item.descricao,
        placaOuTag: item.placaOuTag,
        tipoRecurso: item.tipoRecurso,
        calendarHours: item.calendarHours,
        availableHours: item.availableHours,
        technicalHours: item.technicalHours,
        preventiveHours: item.preventiveHours,
        correctiveHours: item.correctiveHours,
        externalHours: item.externalMaintenanceHours,
        mechanicalPercent,
        band:
          mechanicalPercent > 90 ? "EXCELENTE" : mechanicalPercent >= 85 ? "ATENCAO" : "CRITICO"
      };
    })
    .sort((a, b) => {
      if (b.technicalHours !== a.technicalHours) {
        return b.technicalHours - a.technicalHours;
      }

      return a.placaOuTag.localeCompare(b.placaOuTag);
    });

  const totalLossHours = Number(
    Array.from(lossBucketMap.values())
      .reduce((acc, item) => acc + item.hours, 0)
      .toFixed(2)
  );

  const losses = Array.from(lossBucketMap.values())
    .map((item) => ({
      ...item,
      hours: Number(item.hours.toFixed(2)),
      percent:
        totalLossHours > 0 ? Number(((item.hours / totalLossHours) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => b.hours - a.hours);

  const financialRanking = aggregates
    .map((item) => ({
      equipamentoId: item.equipamentoId,
      descricao: item.descricao,
      placaOuTag: item.placaOuTag,
      tipoRecurso: item.tipoRecurso,
      controllableIdleHours: Number(item.impactControllableIdleHours.toFixed(2)),
      technicalHours: Number(item.impactTechnicalHours.toFixed(2)),
      idleHours: Number((item.impactControllableIdleHours + item.impactTechnicalHours).toFixed(2)),
      equivalentLostDays: Number(
        ((item.impactControllableIdleHours + item.impactTechnicalHours) / 8).toFixed(2)
      ),
      dailyReferenceValue: item.dailyReferenceValue,
      estimatedLoss: item.estimatedLoss
    }))
    .filter((item) => item.idleHours > 0)
    .sort((a, b) => {
      if (b.estimatedLoss !== a.estimatedLoss) {
        return b.estimatedLoss - a.estimatedLoss;
      }
      return b.idleHours - a.idleHours;
    });

  const worksites = Array.from(worksiteMap.values())
    .map((item) => ({
      obraId: item.obraId,
      label: item.label,
      productiveHours: Number(item.productiveHours.toFixed(2)),
      measuredValue: Number(item.measuredValue.toFixed(2)),
      equipmentsCount: item.equipamentos.size
    }))
    .sort((a, b) => {
      if (b.productiveHours !== a.productiveHours) return b.productiveHours - a.productiveHours;
      return b.measuredValue - a.measuredValue;
    });

  const failures = Array.from(failuresMap.values())
    .map((item) => ({
      equipamentoId: item.equipamentoId,
      descricao: item.descricao,
      placaOuTag: item.placaOuTag,
      tipoRecurso: item.tipoRecurso,
      count: item.count,
      totalCost: Number(item.totalCost.toFixed(2)),
      lastExecution: item.lastExecution.toISOString(),
      types: Array.from(item.types.values()).sort()
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.totalCost - a.totalCost;
    });

  const heatmapRows = aggregates
    .map((item) => ({
      equipamentoId: item.equipamentoId,
      label: `${item.placaOuTag} - ${item.descricao}`,
      tipoRecurso: item.tipoRecurso,
      concernHours: Number(
        (item.controllableIdleHours + item.technicalHours + item.adminHours + item.externalHours).toFixed(2)
      ),
      cells: item.heatCells
    }))
    .sort((a, b) => {
      if (b.concernHours !== a.concernHours) return b.concernHours - a.concernHours;
      return a.label.localeCompare(b.label);
    })
    .map(({ concernHours: _concernHours, ...item }) => item);

  const utilizationAverage =
    totalAvailableHours > 0 ? Number(((totalOperatedHours / totalAvailableHours) * 100).toFixed(2)) : 0;
  const mechanicalAverage =
    totalCalendarHours > 0 ? Number(((totalAvailableHours / totalCalendarHours) * 100).toFixed(2)) : 0;

  const utilizationBands = {
    excellent: utilizationRanking.filter((item) => item.band === "EXCELENTE").length,
    good: utilizationRanking.filter((item) => item.band === "BOM").length,
    idle: utilizationRanking.filter((item) => item.band === "OCIOSO").length
  };

  const mechanicalBands = {
    excellent: mechanicalRanking.filter((item) => item.band === "EXCELENTE").length,
    warning: mechanicalRanking.filter((item) => item.band === "ATENCAO").length,
    critical: mechanicalRanking.filter((item) => item.band === "CRITICO").length
  };

  const insights: string[] = [];
  const topLoss = losses[0];
  const topIdle = utilizationRanking.find((item) => item.band === "OCIOSO");
  const topWorksite = worksites[0];
  const topFailure = failures[0];

  if (topIdle) {
    insights.push(
      `${topIdle.placaOuTag} esta subutilizado com ${topIdle.utilizationPercent.toFixed(1).replace(".", ",")}% de uso real.`
    );
  }

  if (topLoss) {
    insights.push(
      `${topLoss.label} concentra ${topLoss.hours.toFixed(1).replace(".", ",")} h perdidas no periodo.`
    );
  }

  if (topWorksite) {
    insights.push(
      `${topWorksite.label} e a frente com maior consumo operacional (${topWorksite.productiveHours.toFixed(1).replace(".", ",")} h equivalentes).`
    );
  }

  if (topFailure) {
    insights.push(
      `${topFailure.placaOuTag} lidera recorrencia de falhas com ${topFailure.count} manutencao(oes) registrada(s).`
    );
  }

  if (totalEstimatedLoss > 0) {
    insights.push(
      `O impacto financeiro estimado da indisponibilidade no periodo soma R$ ${totalEstimatedLoss.toFixed(2).replace(".", ",")}.`
    );
  }

  return NextResponse.json({
    period: {
      preset: period.preset,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: period.label,
      monthKey: formatMonthShort(period.end)
    },
    filters: {
      scope,
      equipmentIds: sanitizedSelectedEquipmentIds,
      equipments: equipamentosDisponiveis.map((item) => ({
        id: item.id,
        label: `${item.placaOuTag} - ${item.descricao}`,
        type: item.tipoRecurso
      }))
    },
    summary: {
      totalEquipamentos: equipamentosFiltrados.length,
      totalHorasCalendario: totalCalendarHours,
      totalHorasDisponiveis: totalAvailableHours,
      totalHorasOperadas: totalOperatedHours,
      utilizacaoMedia: utilizationAverage,
      disponibilidadeMecanicaMedia: mechanicalAverage,
      horasOciosasControlaveis: totalControllableHours,
      horasTecnicas: totalTechnicalHours,
      horasAdministrativas: totalAdminHours,
      horasExternas: totalExternalHours,
      impactoFinanceiroEstimado: totalEstimatedLoss,
      valorMedidoRelaciondo: totalMeasuredValue,
      frentesAtivas: worksites.length
    },
    utilization: {
      summary: utilizationBands,
      ranking: utilizationRanking
    },
    mechanical: {
      summary: {
        ...mechanicalBands,
        preventiveHours: Number(
          aggregates.reduce((acc, item) => acc + item.preventiveHours, 0).toFixed(2)
        ),
        correctiveHours: Number(
          aggregates.reduce((acc, item) => acc + item.correctiveHours, 0).toFixed(2)
        ),
        externalHours: Number(
          aggregates.reduce((acc, item) => acc + item.externalMaintenanceHours, 0).toFixed(2)
        )
      },
      ranking: mechanicalRanking
    },
    losses: {
      totalHours: totalLossHours,
      buckets: losses
    },
    financial: {
      totalEstimatedLoss,
      ranking: financialRanking
    },
    worksites,
    failures,
    heatmap: {
      days: heatmapDays,
      rows: heatmapRows
    },
    insights
  });
  });
}
