import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";

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

type ClienteMensalRow = {
  clienteId: string;
  clienteNome: string;
  obraId: string | null;
  obraNome: string | null;
  obraCodigo: string | null;
  monthNumber: number;
  valorTotal: Prisma.Decimal | null;
};

const allMonthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);

function buildYearRange(year: number) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999)
  };
}

const monthLabels = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const valorBaseSql = Prisma.sql`GREATEST(COALESCE(medicao."valorTotal", 0) - COALESCE(medicao."descontoValor", 0), 0)`;
const valorLiquidoSql = valorBaseSql;

function parseSelectedMonths(value: string | null) {
  if (!value?.trim()) {
    return allMonthNumbers;
  }

  const months = Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 12)
    )
  ).sort((a, b) => a - b);

  return months.length > 0 ? months : allMonthNumbers;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para visualizar o faturamento mensal." }, { status: 409 });
  }

  const currentYear = new Date().getFullYear();
  const yearParam = Number(request.nextUrl.searchParams.get("year"));
  const selectedYear = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : currentYear;
  const selectedMonths = parseSelectedMonths(request.nextUrl.searchParams.get("months"));
  const period = buildYearRange(selectedYear);

  const [rows, yearRows, clientes, obras, clienteMensalRows] = await Promise.all([
    prisma.$queryRaw<MonthlyRow[]>(Prisma.sql`
      WITH medicoes_periodo AS (
        SELECT
          medicao.id,
          medicao.status,
          DATE_TRUNC('month', MAX(item."data")) AS competencia,
          ${valorLiquidoSql} AS "valorLiquido"
        FROM "Medicao" medicao
        INNER JOIN "MedicaoItem" item
          ON item."medicaoId" = medicao.id
         AND item."deletedAt" IS NULL
         AND item."empresaId" = ${empresaId}
        WHERE medicao."deletedAt" IS NULL
          AND medicao."empresaId" = ${empresaId}
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
         AND item."empresaId" = ${empresaId}
        WHERE medicao."deletedAt" IS NULL
          AND medicao."empresaId" = ${empresaId}
          AND medicao.status <> 'CANCELADA'::"StatusMedicao"
        GROUP BY medicao.id
      )
      SELECT DISTINCT EXTRACT(YEAR FROM competencia)::int AS year
      FROM competencias
      ORDER BY year DESC
    `),
    prisma.cliente.findMany({
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        nome: true,
        nomeFantasia: true,
        codigo: true
      },
      orderBy: {
        nome: "asc"
      }
    }),
    prisma.obra.findMany({
      where: {
        status: "ATIVO"
      },
      select: {
        id: true,
        codigo: true,
        nome: true,
        clienteId: true,
        cliente: {
          select: {
            nome: true,
            nomeFantasia: true
          }
        }
      },
      orderBy: {
        nome: "asc"
      }
    }),
    prisma.$queryRaw<ClienteMensalRow[]>(Prisma.sql`
      WITH medicoes_periodo AS (
        SELECT
          medicao.id,
          medicao."clienteId",
          cliente.nome AS "clienteNome",
          medicao."obraId",
          obra.nome AS "obraNome",
          obra.codigo AS "obraCodigo",
          DATE_TRUNC('month', MAX(item."data")) AS competencia,
          ${valorLiquidoSql} AS "valorLiquido"
        FROM "Medicao" medicao
        INNER JOIN "MedicaoItem" item
          ON item."medicaoId" = medicao.id
         AND item."deletedAt" IS NULL
         AND item."empresaId" = ${empresaId}
        INNER JOIN "Cliente" cliente
          ON cliente.id = medicao."clienteId"
         AND cliente."empresaId" = ${empresaId}
        LEFT JOIN "Obra" obra
          ON obra.id = medicao."obraId"
         AND obra."empresaId" = ${empresaId}
        WHERE medicao."deletedAt" IS NULL
          AND medicao."empresaId" = ${empresaId}
          AND medicao.status <> 'CANCELADA'::"StatusMedicao"
        GROUP BY medicao.id, medicao."clienteId", cliente.nome, medicao."obraId", obra.nome, obra.codigo
        HAVING MAX(item."data") >= ${period.start}
           AND MAX(item."data") <= ${period.end}
      )
      SELECT
        "clienteId",
        "clienteNome",
        "obraId",
        "obraNome",
        "obraCodigo",
        EXTRACT(MONTH FROM competencia)::int AS "monthNumber",
        COALESCE(SUM("valorLiquido"), 0) AS "valorTotal"
      FROM medicoes_periodo
      WHERE EXTRACT(MONTH FROM competencia)::int IN (${Prisma.join(selectedMonths)})
      GROUP BY "clienteId", "clienteNome", "obraId", "obraNome", "obraCodigo", EXTRACT(MONTH FROM competencia)
      ORDER BY "clienteNome" ASC, "obraNome" ASC, "monthNumber" ASC
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

  const filteredMonths = months.filter((item) => selectedMonths.includes(item.monthNumber));

  const totalFaturadoAno = Number(
    filteredMonths.reduce((acc, item) => acc + item.totalFaturado, 0).toFixed(2)
  );
  const totalAFaturarAno = Number(
    filteredMonths.reduce((acc, item) => acc + item.totalAFaturar, 0).toFixed(2)
  );
  const totalGeralAno = Number(
    filteredMonths.reduce((acc, item) => acc + item.totalGeral, 0).toFixed(2)
  );
  const totalMedicoes = filteredMonths.reduce((acc, item) => acc + item.totalMedicoes, 0);
  const totalMedicoesConcluidas = filteredMonths.reduce(
    (acc, item) => acc + item.totalMedicoesConcluidas,
    0
  );
  const totalMedicoesAFaturar = filteredMonths.reduce(
    (acc, item) => acc + item.totalMedicoesAFaturar,
    0
  );
  const monthsConsidered = filteredMonths.length;
  const mediaMensal = monthsConsidered > 0 ? Number((totalGeralAno / monthsConsidered).toFixed(2)) : 0;
  const melhorMes = [...filteredMonths].sort((a, b) => b.totalGeral - a.totalGeral)[0] ?? {
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

  const clientTotals = new Map<string, number>();
  const clientMonthValues = new Map<string, number>();
  const workTotals = new Map<string, number>();
  const workMonthValues = new Map<string, number>();

  for (const row of clienteMensalRows) {
    const value = Number(row.valorTotal ?? 0);
    const key = `${row.clienteId}:${row.monthNumber}`;
    const currentClientMonthValue = clientMonthValues.get(key) ?? 0;

    clientMonthValues.set(key, Number((currentClientMonthValue + value).toFixed(2)));
    clientTotals.set(row.clienteId, Number(((clientTotals.get(row.clienteId) ?? 0) + value).toFixed(2)));

    if (row.obraId) {
      const workKey = `${row.obraId}:${row.monthNumber}`;
      const currentWorkMonthValue = workMonthValues.get(workKey) ?? 0;

      workMonthValues.set(workKey, Number((currentWorkMonthValue + value).toFixed(2)));
      workTotals.set(row.obraId, Number(((workTotals.get(row.obraId) ?? 0) + value).toFixed(2)));
    }
  }

  const clientComparisonClients = clientes
    .map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      nomeFantasia: cliente.nomeFantasia,
      codigo: cliente.codigo,
      totalPeriodo: clientTotals.get(cliente.id) ?? 0
    }))
    .sort((first, second) => second.totalPeriodo - first.totalPeriodo || first.nome.localeCompare(second.nome));
  const clientComparisonWorks = obras
    .map((obra) => ({
      id: obra.id,
      nome: obra.nome,
      codigo: obra.codigo,
      clienteId: obra.clienteId,
      clienteNome: obra.cliente.nome,
      clienteNomeFantasia: obra.cliente.nomeFantasia,
      totalPeriodo: workTotals.get(obra.id) ?? 0
    }))
    .sort(
      (first, second) =>
        second.totalPeriodo - first.totalPeriodo ||
        (first.clienteNomeFantasia || first.clienteNome).localeCompare(
          second.clienteNomeFantasia || second.clienteNome
        ) ||
        first.nome.localeCompare(second.nome)
    );

  return NextResponse.json({
    period: {
      year: selectedYear,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: String(selectedYear)
    },
    filters: {
      availableYears: Array.from(new Set(availableYears)).sort((a, b) => b - a),
      selectedMonths,
      availableMonths: monthLabels.map((label, index) => ({
        monthNumber: index + 1,
        label
      }))
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
    monthly: filteredMonths.map((item) => ({
      ...item,
      mediaMensal
    })),
    clientComparison: {
      clients: clientComparisonClients,
      works: clientComparisonWorks,
      monthly: filteredMonths.map((month) => ({
        monthNumber: month.monthNumber,
        label: month.label,
        values: Object.fromEntries(
          clientComparisonClients.map((cliente) => [
            cliente.id,
            Number((clientMonthValues.get(`${cliente.id}:${month.monthNumber}`) ?? 0).toFixed(2))
          ])
        ),
        workValues: Object.fromEntries(
          clientComparisonWorks.map((obra) => [
            obra.id,
            Number((workMonthValues.get(`${obra.id}:${month.monthNumber}`) ?? 0).toFixed(2))
          ])
        )
      }))
    }
  });
}
