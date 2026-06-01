import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MonthlyRow = {
  monthNumber: number;
  totalFaturado: Prisma.Decimal | null;
  totalMedicoes: bigint;
};

type AvailableYearRow = {
  year: number;
};

function buildYearRange(year: number) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999)
  };
}

const monthLabels = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const currentYear = new Date().getFullYear();
  const yearParam = Number(request.nextUrl.searchParams.get("year"));
  const selectedYear = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : currentYear;
  const period = buildYearRange(selectedYear);

  const [rows, yearRows] = await Promise.all([
    prisma.$queryRaw<MonthlyRow[]>(Prisma.sql`
      WITH medicoes_periodo AS (
        SELECT
          medicao.id,
          DATE_TRUNC('month', MAX(item."data")) AS competencia,
          COALESCE(medicao."valorTotal", 0) - COALESCE(medicao."descontoValor", 0) AS "valorLiquido"
        FROM "Medicao" medicao
        INNER JOIN "MedicaoItem" item
          ON item."medicaoId" = medicao.id
         AND item."deletedAt" IS NULL
        WHERE medicao."deletedAt" IS NULL
          AND medicao.status = 'CONCLUIDA'::"StatusMedicao"
        GROUP BY medicao.id
        HAVING MAX(item."data") >= ${period.start}
           AND MAX(item."data") <= ${period.end}
      )
      SELECT
        EXTRACT(MONTH FROM competencia)::int AS "monthNumber",
        COALESCE(SUM("valorLiquido"), 0) AS "totalFaturado",
        COUNT(*) AS "totalMedicoes"
      FROM medicoes_periodo
      GROUP BY EXTRACT(MONTH FROM competencia)
      ORDER BY "monthNumber" ASC
    `),
    prisma.$queryRaw<AvailableYearRow[]>(Prisma.sql`
      WITH competencias AS (
        SELECT
          DATE_TRUNC('month', MAX(item."data")) AS competencia
        FROM "Medicao" medicao
        INNER JOIN "MedicaoItem" item
          ON item."medicaoId" = medicao.id
         AND item."deletedAt" IS NULL
        WHERE medicao."deletedAt" IS NULL
          AND medicao.status = 'CONCLUIDA'::"StatusMedicao"
        GROUP BY medicao.id
      )
      SELECT DISTINCT EXTRACT(YEAR FROM competencia)::int AS year
      FROM competencias
      ORDER BY year DESC
    `)
  ]);

  const rowMap = new Map(rows.map((item) => [item.monthNumber, item]));
  const months = monthLabels.map((label, index) => {
    const monthNumber = index + 1;
    const row = rowMap.get(monthNumber);
    return {
      monthNumber,
      label,
      totalFaturado: Number(row?.totalFaturado ?? 0),
      totalMedicoes: Number(row?.totalMedicoes ?? 0)
    };
  });

  const totalFaturadoAno = Number(
    months.reduce((acc, item) => acc + item.totalFaturado, 0).toFixed(2)
  );
  const totalMedicoes = months.reduce((acc, item) => acc + item.totalMedicoes, 0);
  const monthsConsidered = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
  const mediaMensal = monthsConsidered > 0 ? Number((totalFaturadoAno / monthsConsidered).toFixed(2)) : 0;
  const melhorMes = [...months].sort((a, b) => b.totalFaturado - a.totalFaturado)[0] ?? {
    monthNumber: 1,
    label: "JAN",
    totalFaturado: 0,
    totalMedicoes: 0
  };

  const availableYears = yearRows.map((item) => item.year);
  if (!availableYears.includes(selectedYear)) {
    availableYears.unshift(selectedYear);
  }

  return NextResponse.json({
    period: {
      year: selectedYear,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: String(selectedYear)
    },
    filters: {
      availableYears: Array.from(new Set(availableYears)).sort((a, b) => b - a)
    },
    summary: {
      totalFaturadoAno,
      mediaMensal,
      totalMedicoes,
      monthsConsidered,
      melhorMes: {
        label: melhorMes.label,
        totalFaturado: melhorMes.totalFaturado,
        totalMedicoes: melhorMes.totalMedicoes
      }
    },
    monthly: months.map((item) => ({
      ...item,
      mediaMensal
    }))
  });
}
