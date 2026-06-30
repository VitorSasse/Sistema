import { NextRequest, NextResponse } from "next/server";
import { TipoRecurso } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedPresets = [
  "today",
  "current_week",
  "current_month",
  "previous_month",
  "current_year",
  "custom"
] as const;

type PeriodPreset = (typeof allowedPresets)[number];
type TipoControleFiltro = "TODOS" | "KM" | "HORIMETRO";
type MetodoCalculo = "LEITURA" | "APONTAMENTO" | "SEM_BASE" | "INCONSISTENTE";

type Option = {
  id: string;
  label: string;
  status?: string;
  clienteId?: string;
  tipo?: string;
};

type Period = {
  preset: PeriodPreset;
  start: Date;
  end: Date;
  label: string;
};

type LaunchMetric = {
  lancamentoId: string;
  data: Date;
  dateKey: string;
  fichaNumero: string;
  equipamentoId: string;
  equipamentoNome: string;
  tipoControle: "KM" | "HORIMETRO";
  tipoRecurso: string;
  obraId: string | null;
  obraNome: string;
  clienteId: string;
  clienteNome: string;
  colaboradorId: string;
  colaboradorNome: string;
  servicoNome: string;
  km: number;
  horas: number;
  leituraInicial: number | null;
  leituraFinal: number | null;
  metodo: MetodoCalculo;
  observacao: string | null;
};

type MovementAggregate = {
  id: string | null;
  nome: string;
  clienteNome?: string;
  tipoControle?: string;
  tipoRecurso?: string;
  totalKm: number;
  totalHoras: number;
  lancamentos: number;
  dias: Set<string>;
  equipamentos: Set<string>;
  obras: Set<string>;
};

type Inconsistency = {
  lancamentoId: string;
  data: string;
  equipamento: string;
  ficha: string;
  tipoControle: string;
  leituraAnterior: number;
  leituraInformada: number;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDateInput(value: string | null, end = false) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
}

function resolvePeriod(searchParams: URLSearchParams): Period | null {
  const requested = searchParams.get("period") as PeriodPreset | null;
  const preset = requested && allowedPresets.includes(requested) ? requested : "current_month";
  const now = new Date();

  if (preset === "today") {
    return {
      preset,
      start: startOfDay(now),
      end: endOfDay(now),
      label: "Hoje"
    };
  }

  if (preset === "current_week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset));
    const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
    return {
      preset,
      start,
      end,
      label: "Esta semana"
    };
  }

  if (preset === "previous_month") {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      preset,
      start: startOfMonth(previousMonth),
      end: endOfMonth(previousMonth),
      label: previousMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    };
  }

  if (preset === "current_year") {
    return {
      preset,
      start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      label: String(now.getFullYear())
    };
  }

  if (preset === "custom") {
    const start = parseDateInput(searchParams.get("start"));
    const end = parseDateInput(searchParams.get("end"), true);
    if (!start || !end) return null;
    return {
      preset,
      start,
      end,
      label: `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`
    };
  }

  return {
    preset: "current_month",
    start: startOfMonth(now),
    end: endOfMonth(now),
    label: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  };
}

function parseIdList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTipoControle(value: string | null): TipoControleFiltro {
  if (value === "KM" || value === "HORIMETRO") return value;
  return "TODOS";
}

function normalizeTipoRecursos(value: string | null) {
  const allowed: TipoRecurso[] = ["CAMINHAO", "MAQUINA", "CARRETA", "EQUIPAMENTO_APOIO", "OUTRO"];
  return parseIdList(value).filter((item) =>
    allowed.includes(item as TipoRecurso)
  ) as TipoRecurso[];
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "")
    .toUpperCase();
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

function buildMonthKeys(start: Date, end: Date) {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= limit) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
}

function round(value: number, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function addMetric(aggregate: MovementAggregate, metric: LaunchMetric) {
  aggregate.totalKm = round(aggregate.totalKm + metric.km, 2);
  aggregate.totalHoras = round(aggregate.totalHoras + metric.horas, 2);
  aggregate.lancamentos += 1;
  if (metric.km > 0 || metric.horas > 0) aggregate.dias.add(metric.dateKey);
  aggregate.equipamentos.add(metric.equipamentoId);
  if (metric.obraId) aggregate.obras.add(metric.obraId);
}

function emptyAggregate(input: {
  id: string | null;
  nome: string;
  clienteNome?: string;
  tipoControle?: string;
  tipoRecurso?: string;
}): MovementAggregate {
  return {
    id: input.id,
    nome: input.nome,
    clienteNome: input.clienteNome,
    tipoControle: input.tipoControle,
    tipoRecurso: input.tipoRecurso,
    totalKm: 0,
    totalHoras: 0,
    lancamentos: 0,
    dias: new Set<string>(),
    equipamentos: new Set<string>(),
    obras: new Set<string>()
  };
}

function average(values: number[]) {
  const useful = values.filter((value) => value > 0);
  if (!useful.length) return 0;
  return useful.reduce((acc, value) => acc + value, 0) / useful.length;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const period = resolvePeriod(request.nextUrl.searchParams);

  if (!period) {
    return NextResponse.json({ message: "Periodo personalizado invalido." }, { status: 400 });
  }

  if (period.end < period.start) {
    return NextResponse.json({ message: "O periodo final nao pode ser menor que o inicial." }, { status: 400 });
  }

  const equipamentoIds = parseIdList(request.nextUrl.searchParams.get("equipamentoIds"));
  const obraIds = parseIdList(request.nextUrl.searchParams.get("obraIds"));
  const clienteIds = parseIdList(request.nextUrl.searchParams.get("clienteIds"));
  const colaboradorIds = parseIdList(request.nextUrl.searchParams.get("colaboradorIds"));
  const tipoControle = parseTipoControle(request.nextUrl.searchParams.get("tipoControle"));
  const tipoRecursos = normalizeTipoRecursos(request.nextUrl.searchParams.get("tipoRecursos"));

  const [
    equipamentosOptions,
    obrasOptions,
    clientesOptions,
    colaboradoresOptions,
    lancamentosPeriodo
  ] = await Promise.all([
    prisma.equipamento.findMany({
      select: {
        id: true,
        placaOuTag: true,
        descricao: true,
        tipoRecurso: true,
        tipoControle: true,
        status: true
      },
      orderBy: [{ tipoRecurso: "asc" }, { placaOuTag: "asc" }]
    }),
    prisma.obra.findMany({
      select: {
        id: true,
        codigo: true,
        nome: true,
        clienteId: true,
        status: true
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.cliente.findMany({
      select: {
        id: true,
        codigo: true,
        nome: true,
        status: true
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.colaborador.findMany({
      select: {
        id: true,
        codigo: true,
        nome: true,
        apelido: true,
        funcao: true,
        status: true
      },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.lancamentoDiario.findMany({
      where: {
        deletedAt: null,
        statusValidacao: { not: "CANCELADO" },
        data: { gte: period.start, lte: period.end },
        ...(equipamentoIds.length ? { equipamentoId: { in: equipamentoIds } } : {}),
        ...(obraIds.length ? { obraId: { in: obraIds } } : {}),
        ...(clienteIds.length ? { clienteId: { in: clienteIds } } : {}),
        ...(colaboradorIds.length ? { colaboradorId: { in: colaboradorIds } } : {}),
        equipamento: {
          ...(tipoControle !== "TODOS" ? { tipoControle } : {}),
          ...(tipoRecursos.length ? { tipoRecurso: { in: tipoRecursos } } : {})
        }
      },
      select: {
        id: true,
        data: true,
        fichaId: true,
        equipamentoId: true,
        obraId: true,
        clienteId: true,
        colaboradorId: true,
        quantidadeApontada: true,
        unidadeApontada: true,
        horimetroInformado: true,
        kmInformado: true,
        observacao: true,
        createdAt: true,
        updatedAt: true,
        ficha: { select: { numero: true } },
        equipamento: {
          select: {
            id: true,
            placaOuTag: true,
            descricao: true,
            tipoControle: true,
            tipoRecurso: true,
            status: true
          }
        },
        obra: {
          select: {
            id: true,
            codigo: true,
            nome: true,
            cliente: { select: { id: true, codigo: true, nome: true } }
          }
        },
        cliente: { select: { id: true, codigo: true, nome: true } },
        colaborador: { select: { id: true, codigo: true, nome: true, apelido: true } },
        servico: { select: { id: true, codigo: true, tipoServico: true } }
      },
      orderBy: [{ data: "asc" }, { createdAt: "asc" }]
    })
  ]);

  const periodEquipmentIds = Array.from(new Set([
    ...lancamentosPeriodo.map((item) => item.equipamentoId),
    ...equipamentoIds
  ]));

  const history =
    periodEquipmentIds.length > 0
      ? await prisma.lancamentoDiario.findMany({
          where: {
            deletedAt: null,
            statusValidacao: { not: "CANCELADO" },
            equipamentoId: { in: periodEquipmentIds },
            data: { lte: period.end },
            OR: [{ horimetroInformado: { not: null } }, { kmInformado: { not: null } }]
          },
          select: {
            id: true,
            data: true,
            equipamentoId: true,
            horimetroInformado: true,
            kmInformado: true,
            createdAt: true,
            equipamento: {
              select: {
                tipoControle: true
              }
            }
          },
          orderBy: [{ equipamentoId: "asc" }, { data: "asc" }, { createdAt: "asc" }]
        })
      : [];

  const periodLaunchById = new Map(lancamentosPeriodo.map((item) => [item.id, item]));
  const maxReadingByEquipment = new Map<string, number>();
  const movementByLaunchId = new Map<string, {
    valor: number;
    leituraInicial: number | null;
    leituraFinal: number | null;
    metodo: MetodoCalculo;
  }>();
  const inconsistencies: Inconsistency[] = [];

  for (const reading of history) {
    const control = reading.equipamento.tipoControle;
    const finalValue =
      control === "KM"
        ? reading.kmInformado === null
          ? null
          : Number(reading.kmInformado)
        : reading.horimetroInformado === null
          ? null
          : Number(reading.horimetroInformado);

    if (finalValue === null || !Number.isFinite(finalValue)) continue;

    const previous = maxReadingByEquipment.get(reading.equipamentoId);
    const periodLaunch = periodLaunchById.get(reading.id);

    if (previous === undefined) {
      if (periodLaunch) {
        movementByLaunchId.set(reading.id, {
          valor: 0,
          leituraInicial: null,
          leituraFinal: finalValue,
          metodo: "SEM_BASE"
        });
      }
      maxReadingByEquipment.set(reading.equipamentoId, finalValue);
      continue;
    }

    if (finalValue < previous) {
      if (periodLaunch) {
        inconsistencies.push({
          lancamentoId: reading.id,
          data: periodLaunch.data.toISOString(),
          equipamento: `${periodLaunch.equipamento.placaOuTag} - ${periodLaunch.equipamento.descricao}`,
          ficha: periodLaunch.ficha.numero,
          tipoControle: control,
          leituraAnterior: previous,
          leituraInformada: finalValue
        });
        movementByLaunchId.set(reading.id, {
          valor: 0,
          leituraInicial: previous,
          leituraFinal: finalValue,
          metodo: "INCONSISTENTE"
        });
      }
      continue;
    }

    const delta = round(finalValue - previous, control === "KM" ? 1 : 2);
    if (periodLaunch) {
      movementByLaunchId.set(reading.id, {
        valor: delta,
        leituraInicial: previous,
        leituraFinal: finalValue,
        metodo: "LEITURA"
      });
    }
    maxReadingByEquipment.set(reading.equipamentoId, Math.max(previous, finalValue));
  }

  const metrics: LaunchMetric[] = lancamentosPeriodo.map((lancamento) => {
    const tipoControleLancamento = lancamento.equipamento.tipoControle;
    const movement = movementByLaunchId.get(lancamento.id);
    const quantidade = Number(lancamento.quantidadeApontada ?? 0);
    const fallbackHoras =
      tipoControleLancamento === "HORIMETRO" && lancamento.unidadeApontada === "HORA"
        ? round(quantidade, 2)
        : 0;

    const valor =
      movement?.metodo === "LEITURA" || movement?.metodo === "INCONSISTENTE"
        ? movement.valor
        : fallbackHoras > 0
          ? fallbackHoras
          : 0;
    const metodo: MetodoCalculo =
      movement?.metodo === "LEITURA" || movement?.metodo === "INCONSISTENTE"
        ? movement.metodo
        : fallbackHoras > 0
          ? "APONTAMENTO"
          : movement?.metodo ?? "SEM_BASE";

    return {
      lancamentoId: lancamento.id,
      data: lancamento.data,
      dateKey: toDateKey(lancamento.data),
      fichaNumero: lancamento.ficha.numero,
      equipamentoId: lancamento.equipamentoId,
      equipamentoNome: `${lancamento.equipamento.placaOuTag} - ${lancamento.equipamento.descricao}`,
      tipoControle: tipoControleLancamento,
      tipoRecurso: lancamento.equipamento.tipoRecurso,
      obraId: lancamento.obraId,
      obraNome: lancamento.obra
        ? `${lancamento.obra.codigo} - ${lancamento.obra.nome}`
        : "Obra nao vinculada",
      clienteId: lancamento.clienteId,
      clienteNome: `${lancamento.cliente.codigo} - ${lancamento.cliente.nome}`,
      colaboradorId: lancamento.colaboradorId,
      colaboradorNome: lancamento.colaborador.apelido || lancamento.colaborador.nome,
      servicoNome: `${lancamento.servico.codigo} - ${lancamento.servico.tipoServico}`,
      km: tipoControleLancamento === "KM" ? round(valor, 1) : 0,
      horas: tipoControleLancamento === "HORIMETRO" ? round(valor, 2) : 0,
      leituraInicial: movement?.leituraInicial ?? null,
      leituraFinal: movement?.leituraFinal ?? (
        tipoControleLancamento === "KM"
          ? lancamento.kmInformado === null
            ? null
            : Number(lancamento.kmInformado)
          : lancamento.horimetroInformado === null
            ? null
            : Number(lancamento.horimetroInformado)
      ),
      metodo,
      observacao: lancamento.observacao
    };
  });

  const byEquipment = new Map<string, MovementAggregate>();
  const byWorksite = new Map<string, MovementAggregate>();
  const byClient = new Map<string, MovementAggregate>();
  const daily = new Map(
    enumerateDays(period.start, period.end).map((day) => [
      toDateKey(day),
      {
        key: toDateKey(day),
        label: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        km: 0,
        horas: 0,
        lancamentos: 0
      }
    ])
  );
  const monthly = new Map(
    buildMonthKeys(period.start, period.end).map((key) => [
      key,
      {
        key,
        label: monthLabel(key),
        km: 0,
        horas: 0,
        lancamentos: 0
      }
    ])
  );

  for (const metric of metrics) {
    const equipment = byEquipment.get(metric.equipamentoId) ?? emptyAggregate({
      id: metric.equipamentoId,
      nome: metric.equipamentoNome,
      tipoControle: metric.tipoControle,
      tipoRecurso: metric.tipoRecurso
    });
    addMetric(equipment, metric);
    byEquipment.set(metric.equipamentoId, equipment);

    const obraKey = metric.obraId ?? "SEM_OBRA";
    const worksite = byWorksite.get(obraKey) ?? emptyAggregate({
      id: metric.obraId,
      nome: metric.obraNome,
      clienteNome: metric.clienteNome
    });
    addMetric(worksite, metric);
    byWorksite.set(obraKey, worksite);

    const client = byClient.get(metric.clienteId) ?? emptyAggregate({
      id: metric.clienteId,
      nome: metric.clienteNome
    });
    addMetric(client, metric);
    byClient.set(metric.clienteId, client);

    const dayRow = daily.get(metric.dateKey);
    if (dayRow) {
      dayRow.km = round(dayRow.km + metric.km, 1);
      dayRow.horas = round(dayRow.horas + metric.horas, 2);
      dayRow.lancamentos += 1;
    }

    const monthRow = monthly.get(monthKey(metric.data));
    if (monthRow) {
      monthRow.km = round(monthRow.km + metric.km, 1);
      monthRow.horas = round(monthRow.horas + metric.horas, 2);
      monthRow.lancamentos += 1;
    }
  }

  const equipmentRows = Array.from(byEquipment.values())
    .map((item) => ({
      equipamentoId: item.id,
      nome: item.nome,
      tipoControle: item.tipoControle ?? "-",
      tipoRecurso: item.tipoRecurso ?? "-",
      totalKm: item.totalKm,
      totalHoras: item.totalHoras,
      diasTrabalhados: item.dias.size,
      obras: item.obras.size,
      lancamentos: item.lancamentos
    }))
    .sort((a, b) => b.totalKm + b.totalHoras - (a.totalKm + a.totalHoras));

  const worksiteRows = Array.from(byWorksite.values())
    .map((item) => ({
      obraId: item.id,
      nome: item.nome,
      clienteNome: item.clienteNome ?? "-",
      totalKm: item.totalKm,
      totalHoras: item.totalHoras,
      equipamentos: item.equipamentos.size,
      diasMovimento: item.dias.size,
      lancamentos: item.lancamentos
    }))
    .sort((a, b) => b.totalKm + b.totalHoras - (a.totalKm + a.totalHoras));

  const clientRows = Array.from(byClient.values())
    .map((item) => ({
      clienteId: item.id,
      nome: item.nome,
      totalKm: item.totalKm,
      totalHoras: item.totalHoras,
      obras: item.obras.size,
      equipamentos: item.equipamentos.size,
      sharePercent: 0
    }))
    .sort((a, b) => b.totalKm + b.totalHoras - (a.totalKm + a.totalHoras));

  const totalKm = round(metrics.reduce((acc, item) => acc + item.km, 0), 1);
  const totalHoras = round(metrics.reduce((acc, item) => acc + item.horas, 0), 2);
  const totalMovementReference = totalKm + totalHoras;
  const clientsWithShare = clientRows.map((item) => ({
    ...item,
    sharePercent:
      totalMovementReference > 0
        ? round(((item.totalKm + item.totalHoras) / totalMovementReference) * 100, 2)
        : 0
  }));

  const topKmEquipment = equipmentRows.filter((item) => item.totalKm > 0).sort((a, b) => b.totalKm - a.totalKm)[0] ?? null;
  const topHourEquipment = equipmentRows.filter((item) => item.totalHoras > 0).sort((a, b) => b.totalHoras - a.totalHoras)[0] ?? null;
  const topWorksite = worksiteRows[0] ?? null;
  const topClient = clientsWithShare[0] ?? null;
  const periodDays = Math.max(1, enumerateDays(period.start, period.end).length);

  const noMovementEquipments = equipamentosOptions
    .filter((item) => {
      if (item.status !== "ATIVO") return false;
      if (equipamentoIds.length && !equipamentoIds.includes(item.id)) return false;
      if (tipoControle !== "TODOS" && item.tipoControle !== tipoControle) return false;
      if (tipoRecursos.length && !tipoRecursos.includes(item.tipoRecurso)) return false;
      return !byEquipment.has(item.id);
    })
    .slice(0, 8)
    .map((item) => `${item.placaOuTag} - ${item.descricao}`);

  const kmAverageByEquipment = average(equipmentRows.map((item) => item.totalKm));
  const hourAverageByEquipment = average(equipmentRows.map((item) => item.totalHoras));
  const highKm = equipmentRows.find((item) => item.totalKm > 0 && kmAverageByEquipment > 0 && item.totalKm >= kmAverageByEquipment * 1.6);
  const highHour = equipmentRows.find((item) => item.totalHoras > 0 && hourAverageByEquipment > 0 && item.totalHoras >= hourAverageByEquipment * 1.6);
  const concentratedWorksite =
    topWorksite && totalMovementReference > 0
      ? round(((topWorksite.totalKm + topWorksite.totalHoras) / totalMovementReference) * 100, 1)
      : 0;

  const insights: Array<{ tone: "info" | "warning" | "danger"; title: string; message: string }> = [];

  if (!metrics.length) {
    insights.push({
      tone: "warning",
      title: "Nenhum movimento encontrado",
      message: "Nao existem lancamentos validos para os filtros aplicados."
    });
  }

  if (noMovementEquipments.length > 0) {
    insights.push({
      tone: "info",
      title: "Equipamentos sem lancamento",
      message: noMovementEquipments.join(", ")
    });
  }

  if (highKm) {
    insights.push({
      tone: "warning",
      title: "KM acima da media",
      message: `${highKm.nome} rodou ${highKm.totalKm.toLocaleString("pt-BR")} km no periodo.`
    });
  }

  if (highHour) {
    insights.push({
      tone: "warning",
      title: "Horas acima da media",
      message: `${highHour.nome} trabalhou ${highHour.totalHoras.toLocaleString("pt-BR")} h no periodo.`
    });
  }

  if (concentratedWorksite >= 35 && topWorksite) {
    insights.push({
      tone: "info",
      title: "Concentracao por obra",
      message: `${topWorksite.nome} concentrou ${concentratedWorksite.toLocaleString("pt-BR")}% do uso da frota no periodo.`
    });
  }

  if (inconsistencies.length > 0) {
    insights.push({
      tone: "danger",
      title: "Possivel inconsistencia de leitura",
      message: `${inconsistencies.length} lancamento(s) possuem leitura final menor que a leitura anterior.`
    });
  }

  const heatDays = enumerateDays(period.start, period.end).map((day) => ({
    key: toDateKey(day),
    label: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    weekday: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()
  }));
  const heatMetricsByEquipmentDay = new Map<string, LaunchMetric[]>();

  for (const metric of metrics) {
    const key = `${metric.equipamentoId}:${metric.dateKey}`;
    const bucket = heatMetricsByEquipmentDay.get(key) ?? [];
    bucket.push(metric);
    heatMetricsByEquipmentDay.set(key, bucket);
  }

  const heatmapRows = equipmentRows.slice(0, 24).map((equipment) => {
    const maxKm = Math.max(1, ...heatDays.map((day) => {
      const list = heatMetricsByEquipmentDay.get(`${equipment.equipamentoId}:${day.key}`) ?? [];
      return list.reduce((acc, item) => acc + item.km, 0);
    }));
    const maxHoras = Math.max(1, ...heatDays.map((day) => {
      const list = heatMetricsByEquipmentDay.get(`${equipment.equipamentoId}:${day.key}`) ?? [];
      return list.reduce((acc, item) => acc + item.horas, 0);
    }));

    return {
      equipamentoId: equipment.equipamentoId,
      label: equipment.nome,
      tipoControle: equipment.tipoControle,
      totalKm: equipment.totalKm,
      totalHoras: equipment.totalHoras,
      cells: heatDays.map((day) => {
        const list = heatMetricsByEquipmentDay.get(`${equipment.equipamentoId}:${day.key}`) ?? [];
        const km = round(list.reduce((acc, item) => acc + item.km, 0), 1);
        const horas = round(list.reduce((acc, item) => acc + item.horas, 0), 2);
        const obra = list[0]?.obraNome ?? "";
        const value = equipment.tipoControle === "KM" ? km : horas;
        const max = equipment.tipoControle === "KM" ? maxKm : maxHoras;
        return {
          key: day.key,
          value,
          km,
          horas,
          obra,
          intensity: value <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((value / max) * 4)))
        };
      })
    };
  });

  const missingInitialCount = metrics.filter((item) => item.metodo === "SEM_BASE").length;
  const fallbackCount = metrics.filter((item) => item.metodo === "APONTAMENTO").length;

  return NextResponse.json({
    period: {
      preset: period.preset,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: period.label
    },
    filters: {
      equipamentoIds,
      obraIds,
      clienteIds,
      colaboradorIds,
      tipoControle,
      tipoRecursos,
      equipamentos: equipamentosOptions.map<Option>((item) => ({
        id: item.id,
        label: `${item.placaOuTag} - ${item.descricao}`,
        status: item.status,
        tipo: item.tipoRecurso
      })),
      obras: obrasOptions.map<Option>((item) => ({
        id: item.id,
        label: `${item.codigo} - ${item.nome}`,
        status: item.status,
        clienteId: item.clienteId
      })),
      clientes: clientesOptions.map<Option>((item) => ({
        id: item.id,
        label: `${item.codigo} - ${item.nome}`,
        status: item.status
      })),
      colaboradores: colaboradoresOptions.map<Option>((item) => ({
        id: item.id,
        label: `${item.codigo} - ${item.apelido || item.nome}`,
        status: item.status,
        tipo: item.funcao
      }))
    },
    summary: {
      totalKm,
      totalHoras,
      totalLancamentos: metrics.length,
      totalEquipamentos: byEquipment.size,
      totalObras: byWorksite.size,
      totalClientes: byClient.size,
      mediaKmDia: round(totalKm / periodDays, 1),
      mediaHorasDia: round(totalHoras / periodDays, 2),
      equipamentoMaiorKm: topKmEquipment
        ? { nome: topKmEquipment.nome, valor: topKmEquipment.totalKm }
        : null,
      equipamentoMaiorHoras: topHourEquipment
        ? { nome: topHourEquipment.nome, valor: topHourEquipment.totalHoras }
        : null,
      obraMaisAtiva: topWorksite
        ? { nome: topWorksite.nome, totalKm: topWorksite.totalKm, totalHoras: topWorksite.totalHoras }
        : null,
      clientePrincipal: topClient
        ? { nome: topClient.nome, totalKm: topClient.totalKm, totalHoras: topClient.totalHoras }
        : null,
      inconsistencias: inconsistencies.length,
      leiturasSemBase: missingInitialCount,
      calculosPorApontamento: fallbackCount
    },
    charts: {
      kmByEquipment: equipmentRows.filter((item) => item.totalKm > 0).sort((a, b) => b.totalKm - a.totalKm),
      hoursByEquipment: equipmentRows.filter((item) => item.totalHoras > 0).sort((a, b) => b.totalHoras - a.totalHoras),
      worksiteUsage: worksiteRows,
      daily: Array.from(daily.values()),
      monthly: Array.from(monthly.values()),
      clients: clientsWithShare
    },
    tables: {
      equipamentos: equipmentRows,
      obras: worksiteRows
    },
    heatmap: {
      days: heatDays,
      rows: heatmapRows
    },
    insights,
    inconsistencies,
    details: metrics.map((item) => ({
      data: item.data.toISOString(),
      ficha: item.fichaNumero,
      equipamento: item.equipamentoNome,
      tipoControle: item.tipoControle,
      tipoRecurso: item.tipoRecurso,
      obra: item.obraNome,
      cliente: item.clienteNome,
      colaborador: item.colaboradorNome,
      servico: item.servicoNome,
      km: item.km,
      horas: item.horas,
      leituraInicial: item.leituraInicial,
      leituraFinal: item.leituraFinal,
      metodo: item.metodo,
      observacao: item.observacao
    }))
  });
}
