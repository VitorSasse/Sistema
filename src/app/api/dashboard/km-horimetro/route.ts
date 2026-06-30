import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MonthStatus = "OK" | "SEM_DADOS" | "SEM_LEITURA_ANTERIOR" | "INCONSISTENTE" | "SEM_TIPO_CONTROLE";
type ControlType = "KM" | "HORIMETRO";

type ReadingPoint = {
  id: string;
  date: Date;
  value: number;
  origem: string;
  ficha: string | null;
  cliente: string | null;
  obra: string | null;
};

function parseYear(value: string | null) {
  const parsed = Number(value);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) return currentYear;
  return parsed;
}

function parseMonth(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) return fallback;
  return parsed;
}

function parseIdList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function round(value: number, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function getReadingValue(
  reading: {
    horimetroValor: unknown;
    kmValor: unknown;
  },
  controlType: ControlType
) {
  const raw = controlType === "KM" ? reading.kmValor : reading.horimetroValor;
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const now = new Date();
  const year = parseYear(request.nextUrl.searchParams.get("year"));
  const defaultEndMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const startMonth = parseMonth(request.nextUrl.searchParams.get("startMonth"), 1);
  const endMonth = parseMonth(request.nextUrl.searchParams.get("endMonth"), defaultEndMonth);
  const normalizedStartMonth = Math.min(startMonth, endMonth);
  const normalizedEndMonth = Math.max(startMonth, endMonth);
  const equipamentoIds = parseIdList(request.nextUrl.searchParams.get("equipamentoIds"));
  const periodStart = startOfMonth(year, normalizedStartMonth);
  const periodEnd = endOfMonth(year, normalizedEndMonth);
  const months = Array.from(
    { length: normalizedEndMonth - normalizedStartMonth + 1 },
    (_, index) => {
      const month = normalizedStartMonth + index;
      return {
        key: monthKey(year, month),
        label: monthLabel(year, month),
        month,
        start: startOfMonth(year, month),
        end: endOfMonth(year, month)
      };
    }
  );

  const [equipamentosOptions, equipamentos] = await Promise.all([
    prisma.equipamento.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true,
        placaOuTag: true,
        descricao: true,
        tipoControle: true,
        tipoRecurso: true,
        status: true
      },
      orderBy: [{ placaOuTag: "asc" }]
    }),
    prisma.equipamento.findMany({
      where: {
        status: "ATIVO",
        ...(equipamentoIds.length ? { id: { in: equipamentoIds } } : {})
      },
      select: {
        id: true,
        placaOuTag: true,
        descricao: true,
        tipoControle: true,
        tipoRecurso: true,
        status: true
      },
      orderBy: [{ placaOuTag: "asc" }]
    })
  ]);

  const selectedEquipmentIds = equipamentos.map((item) => item.id);
  const readings =
    selectedEquipmentIds.length > 0
      ? await prisma.leituraEquipamento.findMany({
          where: {
            equipamentoId: { in: selectedEquipmentIds },
            dataLeitura: { lte: periodEnd },
            OR: [{ horimetroValor: { not: null } }, { kmValor: { not: null } }]
          },
          select: {
            id: true,
            equipamentoId: true,
            dataLeitura: true,
            horimetroValor: true,
            kmValor: true,
            origem: true,
            createdAt: true,
            lancamentoDiario: {
              select: {
                ficha: { select: { numero: true } },
                cliente: { select: { codigo: true, nome: true } },
                obra: { select: { codigo: true, nome: true } }
              }
            }
          },
          orderBy: [{ equipamentoId: "asc" }, { dataLeitura: "asc" }, { createdAt: "asc" }]
        })
      : [];

  const readingsByEquipment = new Map<string, ReadingPoint[]>();

  for (const equipamento of equipamentos) {
    readingsByEquipment.set(equipamento.id, []);
  }

  for (const reading of readings) {
    const equipamento = equipamentos.find((item) => item.id === reading.equipamentoId);
    if (!equipamento) continue;

    const value = getReadingValue(reading, equipamento.tipoControle);
    if (value === null) continue;

    const bucket = readingsByEquipment.get(reading.equipamentoId) ?? [];
    bucket.push({
      id: reading.id,
      date: reading.dataLeitura,
      value,
      origem: reading.origem,
      ficha: reading.lancamentoDiario?.ficha.numero ?? null,
      cliente: reading.lancamentoDiario?.cliente
        ? `${reading.lancamentoDiario.cliente.codigo} - ${reading.lancamentoDiario.cliente.nome}`
        : null,
      obra: reading.lancamentoDiario?.obra
        ? `${reading.lancamentoDiario.obra.codigo} - ${reading.lancamentoDiario.obra.nome}`
        : null
    });
    readingsByEquipment.set(reading.equipamentoId, bucket);
  }

  let totalKm = 0;
  let totalHoras = 0;
  let totalInconsistencias = 0;
  let totalSemLeituraAnterior = 0;

  const rows = equipamentos.map((equipamento) => {
    const controlType = equipamento.tipoControle as ControlType;
    const equipmentReadings = readingsByEquipment.get(equipamento.id) ?? [];
    const precision = controlType === "KM" ? 1 : 2;
    let total = 0;
    let inconsistencias = 0;
    let semLeituraAnterior = 0;

    const monthValues = months.map((month) => {
      const previousReading = [...equipmentReadings]
        .filter((reading) => reading.date < month.start)
        .at(-1) ?? null;
      const monthReadings = equipmentReadings.filter(
        (reading) => reading.date >= month.start && reading.date <= month.end
      );

      if (monthReadings.length === 0) {
        return {
          key: month.key,
          label: month.label,
          value: 0,
          status: "SEM_DADOS" as MonthStatus,
          initialReading: previousReading?.value ?? null,
          finalReading: previousReading?.value ?? null,
          firstReadingDate: null,
          lastReadingDate: null,
          readingsCount: 0,
          clientes: [] as string[],
          obras: [] as string[],
          readings: [] as Array<{
            data: string;
            leitura: number;
            origem: string;
            ficha: string | null;
            cliente: string | null;
            obra: string | null;
          }>
        };
      }

      const firstMonthReading = monthReadings[0]!;
      const lastMonthReading = monthReadings[monthReadings.length - 1]!;
      const initialReading = previousReading ?? (monthReadings.length >= 2 ? firstMonthReading : null);
      const finalReading = lastMonthReading;

      if (!initialReading) {
        semLeituraAnterior += 1;
        totalSemLeituraAnterior += 1;
        return {
          key: month.key,
          label: month.label,
          value: 0,
          status: "SEM_LEITURA_ANTERIOR" as MonthStatus,
          initialReading: null,
          finalReading: finalReading.value,
          firstReadingDate: firstMonthReading.date.toISOString(),
          lastReadingDate: finalReading.date.toISOString(),
          readingsCount: monthReadings.length,
          clientes: Array.from(new Set(monthReadings.map((item) => item.cliente).filter(Boolean))) as string[],
          obras: Array.from(new Set(monthReadings.map((item) => item.obra).filter(Boolean))) as string[],
          readings: monthReadings.map((item) => ({
            data: item.date.toISOString(),
            leitura: item.value,
            origem: item.origem,
            ficha: item.ficha,
            cliente: item.cliente,
            obra: item.obra
          }))
        };
      }

      const variation = round(finalReading.value - initialReading.value, precision);

      if (variation < 0) {
        inconsistencias += 1;
        totalInconsistencias += 1;
        return {
          key: month.key,
          label: month.label,
          value: 0,
          status: "INCONSISTENTE" as MonthStatus,
          initialReading: initialReading.value,
          finalReading: finalReading.value,
          firstReadingDate: firstMonthReading.date.toISOString(),
          lastReadingDate: finalReading.date.toISOString(),
          readingsCount: monthReadings.length,
          clientes: Array.from(new Set(monthReadings.map((item) => item.cliente).filter(Boolean))) as string[],
          obras: Array.from(new Set(monthReadings.map((item) => item.obra).filter(Boolean))) as string[],
          readings: monthReadings.map((item) => ({
            data: item.date.toISOString(),
            leitura: item.value,
            origem: item.origem,
            ficha: item.ficha,
            cliente: item.cliente,
            obra: item.obra
          }))
        };
      }

      total = round(total + variation, precision);

      if (controlType === "KM") {
        totalKm = round(totalKm + variation, 1);
      } else {
        totalHoras = round(totalHoras + variation, 2);
      }

      return {
        key: month.key,
        label: month.label,
        value: variation,
        status: "OK" as MonthStatus,
        initialReading: initialReading.value,
        finalReading: finalReading.value,
        firstReadingDate: firstMonthReading.date.toISOString(),
        lastReadingDate: finalReading.date.toISOString(),
        readingsCount: monthReadings.length,
        clientes: Array.from(new Set(monthReadings.map((item) => item.cliente).filter(Boolean))) as string[],
        obras: Array.from(new Set(monthReadings.map((item) => item.obra).filter(Boolean))) as string[],
        readings: monthReadings.map((item) => ({
          data: item.date.toISOString(),
          leitura: item.value,
          origem: item.origem,
          ficha: item.ficha,
          cliente: item.cliente,
          obra: item.obra
        }))
      };
    });

    return {
      equipamentoId: equipamento.id,
      equipamento: `${equipamento.placaOuTag} - ${equipamento.descricao}`,
      tipoControle: controlType,
      tipoLabel: controlType === "KM" ? "KM" : "HORIMETRO",
      tipoRecurso: equipamento.tipoRecurso,
      unidade: controlType === "KM" ? "km" : "h",
      total,
      inconsistencias,
      semLeituraAnterior,
      months: monthValues
    };
  });

  const usefulRows = equipamentoIds.length
    ? rows
    : rows.filter(
        (row) =>
          row.total > 0 ||
          row.inconsistencias > 0 ||
          row.semLeituraAnterior > 0 ||
          row.months.some((month) => month.readingsCount > 0)
      );

  const monthlyTotals = months.map((month) => {
    let km = 0;
    let horas = 0;

    for (const row of usefulRows) {
      const current = row.months.find((item) => item.key === month.key);
      if (!current) continue;
      if (row.tipoControle === "KM") km = round(km + current.value, 1);
      if (row.tipoControle === "HORIMETRO") horas = round(horas + current.value, 2);
    }

    return {
      key: month.key,
      label: month.label,
      km,
      horas
    };
  });

  const topEquipment = [...usefulRows].sort((a, b) => b.total - a.total)[0] ?? null;

  return NextResponse.json({
    period: {
      year,
      startMonth: normalizedStartMonth,
      endMonth: normalizedEndMonth,
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      label: `${monthLabel(year, normalizedStartMonth)} a ${monthLabel(year, normalizedEndMonth)} de ${year}`
    },
    filters: {
      equipamentoIds,
      equipamentos: equipamentosOptions.map((item) => ({
        id: item.id,
        label: `${item.placaOuTag} - ${item.descricao}`,
        status: item.status,
        tipo: item.tipoControle
      }))
    },
    months: months.map((month) => ({
      key: month.key,
      label: month.label,
      month: month.month
    })),
    summary: {
      totalKm,
      totalHoras,
      totalEquipamentos: usefulRows.length,
      inconsistencias: totalInconsistencias,
      semLeituraAnterior: totalSemLeituraAnterior,
      equipamentoMaiorVariacao: topEquipment
        ? {
            equipamento: topEquipment.equipamento,
            tipoControle: topEquipment.tipoControle,
            unidade: topEquipment.unidade,
            total: topEquipment.total
          }
        : null
    },
    rows: usefulRows.sort((a, b) => b.total - a.total),
    chart: {
      monthlyTotals
    }
  });
}
