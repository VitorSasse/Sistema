import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SectionType = "CAMINHAO" | "MAQUINA";

type RawItem = {
  data: Date;
  medicaoId: string;
  valorTotalItem: number;
  equipamento: {
    id: string;
    descricao: string;
    placaOuTag: string;
    tipoRecurso: SectionType;
  };
};

const allMonthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);
const monthLabels = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function buildYearRange(year: number) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999)
  };
}

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

function toDayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

type AvailableYearRow = {
  year: number;
};

async function loadFleetMeasuredItems(period: { start: Date; end: Date }) {
  const [equipamentos, yearItems, yearRows] = await Promise.all([
    prisma.equipamento.findMany({
      where: {
        status: "ATIVO",
        tipoRecurso: {
          in: ["CAMINHAO", "MAQUINA"]
        }
      },
      select: {
        id: true,
        tipoRecurso: true,
        descricao: true,
        placaOuTag: true
      },
      orderBy: [{ tipoRecurso: "asc" }, { placaOuTag: "asc" }, { descricao: "asc" }]
    }),
    prisma.medicaoItem.findMany({
      where: {
        deletedAt: null,
        data: {
          gte: period.start,
          lte: period.end
        },
        medicao: {
          deletedAt: null,
          status: {
            not: "CANCELADA"
          }
        },
        lancamento: {
          deletedAt: null,
          equipamento: {
            tipoRecurso: {
              in: ["CAMINHAO", "MAQUINA"]
            }
          }
        }
      },
      select: {
        id: true,
        medicaoId: true
      }
    }),
    prisma.$queryRaw<AvailableYearRow[]>(Prisma.sql`
      SELECT DISTINCT EXTRACT(YEAR FROM item."data")::int AS year
      FROM "MedicaoItem" item
      INNER JOIN "Medicao" medicao
        ON medicao.id = item."medicaoId"
       AND medicao."deletedAt" IS NULL
       AND medicao.status <> 'CANCELADA'::"StatusMedicao"
      INNER JOIN "LancamentoDiario" lancamento
        ON lancamento.id = item."lancamentoId"
       AND lancamento."deletedAt" IS NULL
      INNER JOIN "Equipamento" equipamento
        ON equipamento.id = lancamento."equipamentoId"
       AND equipamento."tipoRecurso" IN ('CAMINHAO'::"TipoRecurso", 'MAQUINA'::"TipoRecurso")
      WHERE item."deletedAt" IS NULL
      ORDER BY year DESC
    `)
  ]);

  const medicaoIds = Array.from(new Set(yearItems.map((item) => item.medicaoId)));
  const itemIdsNoPeriodo = new Set(yearItems.map((item) => item.id));

  const items =
    medicaoIds.length === 0
      ? []
      : await prisma.medicaoItem.findMany({
          where: {
            deletedAt: null,
            medicaoId: {
              in: medicaoIds
            },
            lancamento: {
              deletedAt: null,
              equipamento: {
                tipoRecurso: {
                  in: ["CAMINHAO", "MAQUINA"]
                }
              }
            }
          },
          select: {
            id: true,
            medicaoId: true,
            data: true,
            valorTotalItem: true,
            medicao: {
              select: {
                valorTotal: true,
                descontoValor: true
              }
            },
            lancamento: {
              select: {
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
          orderBy: [{ data: "asc" }, { createdAt: "asc" }]
        });

  const itemsByMedicao = new Map<string, typeof items>();
  for (const item of items) {
    const current = itemsByMedicao.get(item.medicaoId) ?? [];
    current.push(item);
    itemsByMedicao.set(item.medicaoId, current);
  }

  const rawItems: RawItem[] = [];

  for (const medicaoItems of itemsByMedicao.values()) {
    if (!medicaoItems.length) continue;

    const medicaoGross = Number(medicaoItems[0].medicao.valorTotal ?? 0);
    const medicaoDiscount = Number(medicaoItems[0].medicao.descontoValor ?? 0);
    const medicaoNet = Math.max(0, medicaoGross - medicaoDiscount);

    if (medicaoGross <= 0 || medicaoDiscount <= 0) {
      for (const item of medicaoItems) {
        if (!itemIdsNoPeriodo.has(item.id)) continue;

        rawItems.push({
          data: item.data,
          medicaoId: item.medicaoId,
          valorTotalItem: Number(item.valorTotalItem ?? 0),
          equipamento: {
            id: item.lancamento.equipamento.id,
            descricao: item.lancamento.equipamento.descricao,
            placaOuTag: item.lancamento.equipamento.placaOuTag,
            tipoRecurso: item.lancamento.equipamento.tipoRecurso as SectionType
          }
        });
      }

      continue;
    }

    let allocated = 0;

    medicaoItems.forEach((item, index) => {
      const itemGross = Number(item.valorTotalItem ?? 0);
      const isLast = index === medicaoItems.length - 1;
      const value = isLast
        ? Number((medicaoNet - allocated).toFixed(2))
        : Number(((itemGross / medicaoGross) * medicaoNet).toFixed(2));

      allocated = Number((allocated + value).toFixed(2));

      if (!itemIdsNoPeriodo.has(item.id)) {
        return;
      }

      rawItems.push({
        data: item.data,
        medicaoId: item.medicaoId,
        valorTotalItem: value,
        equipamento: {
          id: item.lancamento.equipamento.id,
          descricao: item.lancamento.equipamento.descricao,
          placaOuTag: item.lancamento.equipamento.placaOuTag,
          tipoRecurso: item.lancamento.equipamento.tipoRecurso as SectionType
        }
      });
    });
  }

  return {
    equipamentos,
    rawItems,
    availableYears: yearRows.map((item) => item.year)
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const currentYear = new Date().getFullYear();
  const yearParam = Number(request.nextUrl.searchParams.get("year"));
  const selectedYear = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : currentYear;
  const selectedMonths = parseSelectedMonths(request.nextUrl.searchParams.get("months"));
  const period = buildYearRange(selectedYear);
  const equipmentIdParam = request.nextUrl.searchParams.get("equipmentId")?.trim() ?? "";

  const { equipamentos, rawItems, availableYears } = await loadFleetMeasuredItems(period);

  const relevantEquipmentIds = new Set(rawItems.map((item) => item.equipamento.id));
  const equipmentOptions = equipamentos
    .filter((item) => relevantEquipmentIds.has(item.id))
    .map((item) => ({
      id: item.id,
      label: `${item.placaOuTag} - ${item.descricao}`,
      placaOuTag: item.placaOuTag,
      descricao: item.descricao,
      tipoRecurso: item.tipoRecurso as SectionType
    }));

  const selectedEquipmentId = equipmentOptions.some((item) => item.id === equipmentIdParam)
    ? equipmentIdParam
    : (equipmentOptions[0]?.id ?? "");

  const selectedEquipment =
    equipmentOptions.find((item) => item.id === selectedEquipmentId) ?? null;

  const selectedEquipmentItems = rawItems.filter(
    (item) =>
      item.equipamento.id === selectedEquipmentId &&
      selectedMonths.includes(item.data.getMonth() + 1)
  );

  const monthlyBase = monthLabels.map((label, index) => ({
    monthNumber: index + 1,
    label,
    totalValor: 0,
    totalItens: 0,
    totalMedicoes: 0,
    diasComProducao: 0
  }));

  const monthlyMap = new Map(
    monthlyBase.map((item) => [
      item.monthNumber,
      {
        ...item,
        dias: new Set<string>(),
        medicoes: new Set<string>()
      }
    ])
  );

  for (const item of selectedEquipmentItems) {
    const monthNumber = item.data.getMonth() + 1;
    const current = monthlyMap.get(monthNumber);
    if (!current) continue;

    current.totalValor = Number((current.totalValor + item.valorTotalItem).toFixed(2));
    current.totalItens += 1;
    current.dias.add(toDayKey(item.data));
    current.medicoes.add(item.medicaoId);
  }

  const monthly = selectedMonths
    .map((monthNumber) => {
      const item = monthlyMap.get(monthNumber);
      return {
        monthNumber,
        label: monthLabels[monthNumber - 1] ?? String(monthNumber),
        totalValor: Number(item?.totalValor ?? 0),
        totalItens: item?.totalItens ?? 0,
        totalMedicoes: item?.medicoes.size ?? 0,
        diasComProducao: item?.dias.size ?? 0
      };
    })
    .map((item, _index, collection) => {
      const mediaMensal =
        collection.length > 0
          ? Number(
              (
                collection.reduce((acc, current) => acc + current.totalValor, 0) /
                collection.length
              ).toFixed(2)
            )
          : 0;

      return {
        ...item,
        mediaMensal
      };
    });

  const totalValorPeriodo = Number(
    monthly.reduce((acc, item) => acc + item.totalValor, 0).toFixed(2)
  );
  const totalItensPeriodo = monthly.reduce((acc, item) => acc + item.totalItens, 0);
  const totalMedicoesPeriodo = monthly.reduce((acc, item) => acc + item.totalMedicoes, 0);
  const totalDiasPeriodo = monthly.reduce((acc, item) => acc + item.diasComProducao, 0);
  const monthsConsidered = monthly.length;
  const mediaMensal = monthsConsidered > 0 ? Number((totalValorPeriodo / monthsConsidered).toFixed(2)) : 0;
  const melhorMes = [...monthly].sort((a, b) => b.totalValor - a.totalValor)[0] ?? {
    monthNumber: 1,
    label: "JAN",
    totalValor: 0,
    totalItens: 0,
    totalMedicoes: 0,
    diasComProducao: 0,
    mediaMensal: 0
  };
  const mediaPorDia = totalDiasPeriodo > 0 ? Number((totalValorPeriodo / totalDiasPeriodo).toFixed(2)) : 0;

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
      equipmentId: selectedEquipmentId,
      availableYears: Array.from(new Set(availableYears)).sort((a, b) => b - a),
      selectedMonths,
      availableMonths: monthLabels.map((label, index) => ({
        monthNumber: index + 1,
        label
      })),
      equipments: equipmentOptions
    },
    selectedEquipment: selectedEquipment
      ? {
          id: selectedEquipment.id,
          label: selectedEquipment.label,
          placaOuTag: selectedEquipment.placaOuTag,
          descricao: selectedEquipment.descricao,
          tipoRecurso: selectedEquipment.tipoRecurso
        }
      : null,
    summary: {
      totalValorPeriodo,
      totalItensPeriodo,
      totalMedicoesPeriodo,
      totalDiasPeriodo,
      mediaMensal,
      mediaPorDia,
      monthsConsidered,
      melhorMes
    },
    monthly
  });
}
