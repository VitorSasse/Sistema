import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import { getActiveTenantEmpresaId } from "@/lib/tenant-store";
import { parseOptionalDateOnlyStart } from "@/lib/utils/date";

const allowedPresets = [
  "current_month",
  "previous_month",
  "last_3_months",
  "custom"
] as const;

type PeriodPreset = (typeof allowedPresets)[number];

type RankingRow = {
  clienteId: string;
  clienteCodigo: string;
  clienteNome: string;
  totalFaturado: Prisma.Decimal;
  totalAFaturar: Prisma.Decimal;
  totalGeral: Prisma.Decimal;
  totalMedicoes: bigint;
};

type TotalsRow = {
  totalFaturado: Prisma.Decimal | null;
  totalAFaturar: Prisma.Decimal | null;
  totalGeral: Prisma.Decimal | null;
  totalMedicoes: bigint;
  totalMedicoesConcluidas: bigint;
  totalMedicoesAFaturar: bigint;
  totalClientes: bigint;
};

type PermutaClienteRow = {
  clienteId: string;
  clienteCodigo: string;
  clienteNome: string;
  valorBase: Prisma.Decimal | null;
  valorPermuta: Prisma.Decimal | null;
  totalMedicoes: bigint;
};

const valorBaseSql = Prisma.sql`GREATEST(COALESCE(medicao."valorTotal", 0) - COALESCE(medicao."descontoValor", 0), 0)`;
const valorLiquidoSql = valorBaseSql;

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

  if (preset === "last_3_months") {
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    const end = endOfMonth(now);
    return {
      preset,
      start,
      end,
      label: "Ultimos 3 meses"
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

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/dashboard/faturamento", method: "GET" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = getActiveTenantEmpresaId();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa para visualizar o faturamento." }, { status: 409 });
  }

  const period = resolvePeriod(request.nextUrl.searchParams);

  if (!period) {
    return NextResponse.json(
      { message: "Periodo personalizado invalido." },
      { status: 400 }
    );
  }

  if (period.end < period.start) {
    return NextResponse.json(
      { message: "O periodo final nao pode ser menor que o inicial." },
      { status: 400 }
    );
  }

  const [ranking, totals, permutaClienteRows] = await Promise.all([
    prisma.$queryRaw<RankingRow[]>(Prisma.sql`
      WITH medicoes_periodo AS (
        SELECT
          medicao.id,
          medicao.status,
          medicao."clienteId",
          medicao."codigoMedicao",
          ${valorLiquidoSql} AS "valorLiquido"
        FROM "Medicao" medicao
        INNER JOIN "MedicaoItem" item
          ON item."medicaoId" = medicao.id
         AND item."deletedAt" IS NULL
         AND item."empresaId" = ${empresaId}
        WHERE medicao."deletedAt" IS NULL
          AND medicao."empresaId" = ${empresaId}
          AND medicao.status <> 'CANCELADA'::"StatusMedicao"
        GROUP BY medicao.id, medicao.status, medicao."clienteId"
        HAVING MAX(item."data") >= ${period.start}
           AND MAX(item."data") <= ${period.end}
      )
      SELECT
        cliente.id AS "clienteId",
        cliente.codigo AS "clienteCodigo",
        cliente.nome AS "clienteNome",
        COALESCE(SUM(CASE WHEN medicao.status = 'CONCLUIDA'::"StatusMedicao" THEN medicao."valorLiquido" ELSE 0 END), 0) AS "totalFaturado",
        COALESCE(SUM(CASE WHEN medicao.status <> 'CONCLUIDA'::"StatusMedicao" THEN medicao."valorLiquido" ELSE 0 END), 0) AS "totalAFaturar",
        COALESCE(SUM(medicao."valorLiquido"), 0) AS "totalGeral",
        COUNT(DISTINCT medicao.id) AS "totalMedicoes"
      FROM medicoes_periodo medicao
      INNER JOIN "Cliente" cliente
        ON cliente.id = medicao."clienteId"
       AND cliente."empresaId" = ${empresaId}
      GROUP BY cliente.id, cliente.codigo, cliente.nome
      ORDER BY "totalGeral" DESC, cliente.nome ASC
    `),
    prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
      WITH medicoes_periodo AS (
        SELECT
          medicao.id,
          medicao.status,
          medicao."clienteId",
          medicao."codigoMedicao",
          ${valorLiquidoSql} AS "valorLiquido"
        FROM "Medicao" medicao
        INNER JOIN "MedicaoItem" item
          ON item."medicaoId" = medicao.id
         AND item."deletedAt" IS NULL
         AND item."empresaId" = ${empresaId}
        WHERE medicao."deletedAt" IS NULL
          AND medicao."empresaId" = ${empresaId}
          AND medicao.status <> 'CANCELADA'::"StatusMedicao"
        GROUP BY medicao.id, medicao.status, medicao."clienteId"
        HAVING MAX(item."data") >= ${period.start}
           AND MAX(item."data") <= ${period.end}
      )
      SELECT
        COALESCE(SUM(CASE WHEN medicao.status = 'CONCLUIDA'::"StatusMedicao" THEN medicao."valorLiquido" ELSE 0 END), 0) AS "totalFaturado",
        COALESCE(SUM(CASE WHEN medicao.status <> 'CONCLUIDA'::"StatusMedicao" THEN medicao."valorLiquido" ELSE 0 END), 0) AS "totalAFaturar",
        COALESCE(SUM(medicao."valorLiquido"), 0) AS "totalGeral",
        COUNT(DISTINCT medicao.id) AS "totalMedicoes",
        COUNT(DISTINCT CASE WHEN medicao.status = 'CONCLUIDA'::"StatusMedicao" THEN medicao.id END) AS "totalMedicoesConcluidas",
        COUNT(DISTINCT CASE WHEN medicao.status <> 'CONCLUIDA'::"StatusMedicao" THEN medicao.id END) AS "totalMedicoesAFaturar",
        COUNT(DISTINCT medicao."clienteId") AS "totalClientes"
      FROM medicoes_periodo medicao
    `),
    prisma.$queryRaw<PermutaClienteRow[]>(Prisma.sql`
      WITH medicoes_periodo AS (
        SELECT
          medicao.id,
          medicao."clienteId",
          ${valorBaseSql} AS "valorBase",
          COALESCE(medicao."permutaPercentual", 0) AS "permutaPercentual"
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
      )
      SELECT
        cliente.id AS "clienteId",
        cliente.codigo AS "clienteCodigo",
        cliente.nome AS "clienteNome",
        COALESCE(SUM(medicao."valorBase"), 0) AS "valorBase",
        COALESCE(SUM(medicao."valorBase" * medicao."permutaPercentual" / 100), 0) AS "valorPermuta",
        COUNT(DISTINCT medicao.id) AS "totalMedicoes"
      FROM medicoes_periodo medicao
      INNER JOIN "Cliente" cliente
        ON cliente.id = medicao."clienteId"
       AND cliente."empresaId" = ${empresaId}
      GROUP BY cliente.id, cliente.codigo, cliente.nome
      HAVING COALESCE(SUM(medicao."valorBase"), 0) > 0
      ORDER BY "valorPermuta" DESC, "valorBase" DESC, cliente.nome ASC
    `)
  ]);

  const totalsRow = totals[0] ?? {
    totalFaturado: new Prisma.Decimal(0),
    totalAFaturar: new Prisma.Decimal(0),
    totalGeral: new Prisma.Decimal(0),
    totalMedicoes: BigInt(0),
    totalMedicoesConcluidas: BigInt(0),
    totalMedicoesAFaturar: BigInt(0),
    totalClientes: BigInt(0)
  };

  const totalFaturado = Number(totalsRow.totalFaturado ?? 0);
  const totalAFaturar = Number(totalsRow.totalAFaturar ?? 0);
  const totalGeral = Number(totalsRow.totalGeral ?? 0);
  const totalClientes = Number(totalsRow.totalClientes ?? 0);
  const totalMedicoes = Number(totalsRow.totalMedicoes ?? 0);
  const totalMedicoesConcluidas = Number(totalsRow.totalMedicoesConcluidas ?? 0);
  const totalMedicoesAFaturar = Number(totalsRow.totalMedicoesAFaturar ?? 0);

  const rankingItems = ranking.map((item, index) => {
    const totalClienteFaturado = Number(item.totalFaturado ?? 0);
    const totalClienteAFaturar = Number(item.totalAFaturar ?? 0);
    const totalCliente = Number(item.totalGeral ?? 0);
    const sharePercent = totalGeral > 0 ? (totalCliente / totalGeral) * 100 : 0;

    return {
      rank: index + 1,
      clienteId: item.clienteId,
      clienteCodigo: item.clienteCodigo,
      clienteNome: item.clienteNome,
      totalFaturado: totalClienteFaturado,
      totalAFaturar: totalClienteAFaturar,
      totalGeral: totalCliente,
      totalMedicoes: Number(item.totalMedicoes),
      sharePercent
    };
  });

  const permutaClientes = permutaClienteRows.map((item) => {
    const valorBase = Number(item.valorBase ?? 0);
    const valorPermuta = Number(item.valorPermuta ?? 0);
    const percentualPermuta = valorBase > 0 ? (valorPermuta / valorBase) * 100 : 0;

    return {
      clienteId: item.clienteId,
      clienteCodigo: item.clienteCodigo,
      clienteNome: item.clienteNome,
      valorBase,
      valorPermuta,
      valorNaoPermuta: Math.max(0, valorBase - valorPermuta),
      percentualPermuta,
      totalMedicoes: Number(item.totalMedicoes)
    };
  });

  const totalValorBasePermuta = permutaClientes.reduce(
    (acc, item) => acc + item.valorBase,
    0
  );
  const totalValorPermuta = permutaClientes.reduce(
    (acc, item) => acc + item.valorPermuta,
    0
  );
  const percentualPermutaGeral =
    totalValorBasePermuta > 0 ? (totalValorPermuta / totalValorBasePermuta) * 100 : 0;

  return NextResponse.json({
    period: {
      preset: period.preset,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: period.label
    },
    summary: {
      totalFaturado,
      totalAFaturar,
      totalGeral,
      totalMedicoes,
      totalMedicoesConcluidas,
      totalMedicoesAFaturar,
      totalClientes,
      ticketMedioPorCliente: totalClientes > 0 ? totalGeral / totalClientes : 0
    },
    ranking: rankingItems,
    permuta: {
      percentualGeral: percentualPermutaGeral,
      valorPermuta: totalValorPermuta,
      valorNaoPermuta: Math.max(0, totalValorBasePermuta - totalValorPermuta),
      valorBase: totalValorBasePermuta,
      totalMedicoesComPermuta: permutaClientes.filter((item) => item.valorPermuta > 0).length,
      clientes: permutaClientes
    }
  });
  });
}
