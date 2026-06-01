import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MonthlyRow = {
  monthNumber: number;
  totalFaturado: Prisma.Decimal | null;
  totalAFaturar: Prisma.Decimal | null;
  totalGeral: Prisma.Decimal | null;
  totalMedicoes: bigint;
  totalMedicoesConcluidas: bigint;
  totalMedicoesAFaturar: bigint;
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
          medicao.status,
          DATE_TRUNC('month', MAX(item."data")) AS competencia,
          COALESCE(medicao."valorTotal", 0) - COALESCE(medicao."descontoValor", 0) AS "valorLiquido"
        FROM "Medicao" medicao
        INNER JOIN "MedicaoItem" item
          ON item."medicaoId" = medicao.id
         AND item."deletedAt" IS NULL
        WHERE medicao."deletedAt" IS NULL
          AND medicao.status <> 'CANCELADA'::"StatusMedicao"
        GROUP BY medicao.id, medicao.status
        HAVING MAX(item."data") >= ${period.start}
           AND MAX(item."data") <= ${period.end}
      )
      SELECT
        EXTRACT(MONTH FROM competencia)::int AS "monthNumber",
        COALESCE(SUM(CASE WHEN status = 'CONCLUIDA'::"StatusMedicao" THEN "valorLiquido" ELSE 0 END), 0) AS "totalFaturado",
        COALESCE(SUM(CASE WHEN status <> 'CONCLUIDA'::"StatusMedicao" THEN "valorLiquido" ELSE 0 END), 0) AS "totalAFaturar",
        COALESCE(SUM("valorLiquido"), 0) AS "totalGeral",
        COUNT(*) AS "totalMedicoes",
        COUNT(CASE WHEN status = 'CONCLUIDA'::"StatusMedicao" THEN 1 END) AS "totalMedicoesConcluidas",
        COUNT(CASE WHEN status <> 'CONCLUIDA'::"StatusMedicao" THEN 1 END) AS "totalMedicoesAFaturar"
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
          AND medicao.status <> 'CANCELADA'::"StatusMedicao"
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
      totalAFaturar: Number(row?.totalAFaturar ?? 0),
      totalGeral: Number(row?.totalGeral ?? 0),
      totalMedicoes: Number(row?.totalMedicoes ?? 0),
      totalMedicoesConcluidas: Number(row?.totalMedicoesConcluidas ?? 0),
      totalMedicoesAFaturar: Number(row?.totalMedicoesAFaturar ?? 0)
    };
  });

  const totalFaturadoAno = Number(
    months.reduce((acc, item) => acc + item.totalFaturado, 0).toFixed(2)
  );
  const totalAFaturarAno = Number(
    months.reduce((acc, item) => acc + item.totalAFaturar, 0).toFixed(2)
  );
  const totalGeralAno = Number(
    months.reduce((acc, item) => acc + item.totalGeral, 0).toFixed(2)
  );
  const totalMedicoes = months.reduce((acc, item) => acc + item.totalMedicoes, 0);
  const totalMedicoesConcluidas = months.reduce((acc, item) => acc + item.totalMedicoesConcluidas, 0);
  const totalMedicoesAFaturar = months.reduce((acc, item) => acc + item.totalMedicoesAFaturar, 0);
  const monthsConsidered = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
  const mediaMensal = monthsConsidered > 0 ? Number((totalGeralAno / monthsConsidered).toFixed(2)) : 0;
  const melhorMes = [...months].sort((a, b) => b.totalGeral - a.totalGeral)[0] ?? {
    monthNumber: 1,
    label: "JAN",
    totalFaturado: 0,
    totalAFaturar: 0,
    totalGeral: 0,
    totalMedicoes: 0,
    totalMedicoesConcluidas: 0,
    totalMedicoesAFaturar: 0
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
      totalAFaturarAno,
      totalGeralAno,
      mediaMensal,
      totalMedicoes,
      totalMedicoesConcluidas,
      totalMedicoesAFaturar,
      monthsConsidered,
      melhorMes: {
        label: melhorMes.label,
        totalFaturado: melhorMes.totalFaturado,
        totalAFaturar: melhorMes.totalAFaturar,
        totalGeral: melhorMes.totalGeral,
        totalMedicoes: melhorMes.totalMedicoes
      }
    },
    monthly: months.map((item) => ({
      ...item,
      mediaMensal
    }))
  });
}
