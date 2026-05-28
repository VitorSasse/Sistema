import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedPresets = [
  "current_month",
  "previous_month",
  "last_30_days",
  "custom"
] as const;

type PeriodPreset = (typeof allowedPresets)[number];
type SectionType = "CAMINHAO" | "MAQUINA";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDateInput(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
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

function toDayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

type RawItem = {
  data: Date;
  valorTotalItem: number;
  equipamento: {
    id: string;
    descricao: string;
    placaOuTag: string;
    tipoRecurso: SectionType;
  };
};

function buildSection(
  items: RawItem[],
  selectedEquipamentoId: string | null,
  type: SectionType
) {
  const filteredItems = items.filter(
    (item) =>
      item.equipamento.tipoRecurso === type &&
      (!selectedEquipamentoId || item.equipamento.id === selectedEquipamentoId)
  );

  const rankingMap = new Map<
    string,
    {
      equipamentoId: string;
      descricao: string;
      placaOuTag: string;
      totalValor: number;
      totalItens: number;
      dias: Set<string>;
      ultimoLancamento: Date;
    }
  >();

  const daysWithProduction = new Set<string>();

  for (const item of filteredItems) {
    const dayKey = toDayKey(item.data);
    daysWithProduction.add(dayKey);

    const current =
      rankingMap.get(item.equipamento.id) ??
      {
        equipamentoId: item.equipamento.id,
        descricao: item.equipamento.descricao,
        placaOuTag: item.equipamento.placaOuTag,
        totalValor: 0,
        totalItens: 0,
        dias: new Set<string>(),
        ultimoLancamento: item.data
      };

    current.totalValor = Number((current.totalValor + item.valorTotalItem).toFixed(2));
    current.totalItens += 1;
    current.dias.add(dayKey);

    if (item.data > current.ultimoLancamento) {
      current.ultimoLancamento = item.data;
    }

    rankingMap.set(item.equipamento.id, current);
  }

  const ranking = Array.from(rankingMap.values())
    .map((item) => {
      const diasComProducao = item.dias.size;
      return {
        equipamentoId: item.equipamentoId,
        descricao: item.descricao,
        placaOuTag: item.placaOuTag,
        totalValor: item.totalValor,
        totalItens: item.totalItens,
        diasComProducao,
        mediaValorPorDia:
          diasComProducao > 0 ? Number((item.totalValor / diasComProducao).toFixed(2)) : 0,
        ultimoLancamento: item.ultimoLancamento.toISOString()
      };
    })
    .sort((a, b) => {
      if (b.totalValor !== a.totalValor) return b.totalValor - a.totalValor;
      if (b.totalItens !== a.totalItens) return b.totalItens - a.totalItens;
      return a.placaOuTag.localeCompare(b.placaOuTag);
    });

  const totalValor = Number(ranking.reduce((acc, item) => acc + item.totalValor, 0).toFixed(2));
  const totalItens = ranking.reduce((acc, item) => acc + item.totalItens, 0);
  const equipamentosComProducao = ranking.length;
  const diasComProducao = daysWithProduction.size;

  return {
    filteredItems,
    summary: {
      totalValor,
      totalItens,
      equipamentosComProducao,
      diasComProducao,
      mediaValorPorEquipamento:
        equipamentosComProducao > 0
          ? Number((totalValor / equipamentosComProducao).toFixed(2))
          : 0,
      mediaValorPorDia:
        diasComProducao > 0 ? Number((totalValor / diasComProducao).toFixed(2)) : 0
    },
    ranking
  };
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
    return NextResponse.json(
      { message: "O periodo final nao pode ser menor que o inicial." },
      { status: 400 }
    );
  }

  const selectedCaminhaoId = request.nextUrl.searchParams.get("caminhaoId");
  const selectedMaquinaId = request.nextUrl.searchParams.get("maquinaId");

  const [equipamentos, items] = await Promise.all([
    prisma.equipamento.findMany({
      where: {
        complementar: false,
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
      orderBy: [{ descricao: "asc" }, { placaOuTag: "asc" }]
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
            complementar: false,
            tipoRecurso: {
              in: ["CAMINHAO", "MAQUINA"]
            }
          }
        }
      },
      select: {
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
      orderBy: [{ data: "desc" }, { createdAt: "desc" }]
    })
  ]);

  const caminhoes = equipamentos.filter((item) => item.tipoRecurso === "CAMINHAO");
  const maquinas = equipamentos.filter((item) => item.tipoRecurso === "MAQUINA");

  if (selectedCaminhaoId && !caminhoes.some((item) => item.id === selectedCaminhaoId)) {
    return NextResponse.json({ message: "Caminhao invalido para o filtro." }, { status: 400 });
  }

  if (selectedMaquinaId && !maquinas.some((item) => item.id === selectedMaquinaId)) {
    return NextResponse.json({ message: "Maquina invalida para o filtro." }, { status: 400 });
  }

  const rawItems: RawItem[] = items.map((item) => ({
    data: item.data,
    valorTotalItem: (() => {
      const itemGross = Number(item.valorTotalItem ?? 0);
      const medicaoGross = Number(item.medicao.valorTotal ?? 0);
      const medicaoDiscount = Number(item.medicao.descontoValor ?? 0);

      if (medicaoGross <= 0 || medicaoDiscount <= 0) {
        return itemGross;
      }

      const netFactor = Math.max(0, (medicaoGross - medicaoDiscount) / medicaoGross);
      return Number((itemGross * netFactor).toFixed(2));
    })(),
    equipamento: {
      id: item.lancamento.equipamento.id,
      descricao: item.lancamento.equipamento.descricao,
      placaOuTag: item.lancamento.equipamento.placaOuTag,
      tipoRecurso: item.lancamento.equipamento.tipoRecurso as SectionType
    }
  }));

  const caminhaoSection = buildSection(rawItems, selectedCaminhaoId, "CAMINHAO");
  const maquinaSection = buildSection(rawItems, selectedMaquinaId, "MAQUINA");

  const overallItems = [...caminhaoSection.filteredItems, ...maquinaSection.filteredItems];
  const overallDays = new Set(overallItems.map((item) => toDayKey(item.data)));
  const overallEquipamentos = new Set(overallItems.map((item) => item.equipamento.id));
  const totalValorGeral = Number(
    overallItems.reduce((acc, item) => acc + item.valorTotalItem, 0).toFixed(2)
  );

  return NextResponse.json({
    period: {
      preset: period.preset,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: period.label
    },
    filters: {
      caminhaoId: selectedCaminhaoId,
      maquinaId: selectedMaquinaId,
      caminhoes: caminhoes.map((item) => ({
        id: item.id,
        label: `${item.placaOuTag} - ${item.descricao}`
      })),
      maquinas: maquinas.map((item) => ({
        id: item.id,
        label: `${item.placaOuTag} - ${item.descricao}`
      }))
    },
    summary: {
      totalValorGeral,
      totalItens: overallItems.length,
      equipamentosComProducao: overallEquipamentos.size,
      diasComProducao: overallDays.size
    },
    caminhoes: {
      summary: caminhaoSection.summary,
      ranking: caminhaoSection.ranking
    },
    maquinas: {
      summary: maquinaSection.summary,
      ranking: maquinaSection.ranking
    }
  });
}
