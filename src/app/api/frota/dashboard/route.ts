import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateInputValue, parseOptionalDateOnlyStart } from "@/lib/utils/date";

const allowedPresets = [
  "current_month",
  "previous_month",
  "last_30_days",
  "custom"
] as const;

type PeriodPreset = (typeof allowedPresets)[number];
type SectionType = "CAMINHAO" | "MAQUINA";

function parseIdList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function toDayKey(value: Date) {
  return formatDateInputValue(value);
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
  selectedEquipamentoIds: Set<string> | null,
  type: SectionType
) {
  const filteredItems = items.filter(
    (item) =>
      item.equipamento.tipoRecurso === type &&
      (!selectedEquipamentoIds || selectedEquipamentoIds.has(item.equipamento.id))
  );
  const valuedItems = filteredItems.filter((item) => item.valorTotalItem > 0);

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

  for (const item of valuedItems) {
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
    filteredItems: valuedItems,
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

  const selectedCaminhaoIds = parseIdList(request.nextUrl.searchParams.get("caminhaoIds"));
  const selectedMaquinaIds = parseIdList(request.nextUrl.searchParams.get("maquinaIds"));

  const [equipamentos, periodItems] = await Promise.all([
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
    })
  ]);

  const medicaoIds = Array.from(new Set(periodItems.map((item) => item.medicaoId)));
  const periodItemIds = new Set(periodItems.map((item) => item.id));

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
          orderBy: [{ data: "desc" }, { createdAt: "desc" }]
        });

  const caminhoes = equipamentos.filter((item) => item.tipoRecurso === "CAMINHAO");
  const maquinas = equipamentos.filter((item) => item.tipoRecurso === "MAQUINA");

  const rawItems: RawItem[] = [];
  const itemsByMedicao = new Map<string, typeof items>();

  for (const item of items) {
    const current = itemsByMedicao.get(item.medicaoId) ?? [];
    current.push(item);
    itemsByMedicao.set(item.medicaoId, current);
  }

  for (const medicaoItems of itemsByMedicao.values()) {
    if (!medicaoItems.length) continue;

    const medicaoGross = Number(medicaoItems[0].medicao.valorTotal ?? 0);
    const medicaoDiscount = Number(medicaoItems[0].medicao.descontoValor ?? 0);
    const medicaoNet = Math.max(0, medicaoGross - medicaoDiscount);

    if (medicaoGross <= 0 || medicaoDiscount <= 0) {
      for (const item of medicaoItems) {
        if (!periodItemIds.has(item.id)) continue;
        rawItems.push({
          data: item.data,
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
      if (!periodItemIds.has(item.id)) {
        return;
      }

      rawItems.push({
        data: item.data,
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

  const relevantEquipmentIds = new Set(rawItems.map((item) => item.equipamento.id));
  const caminhoesDisponiveis = caminhoes.filter((item) => relevantEquipmentIds.has(item.id));
  const maquinasDisponiveis = maquinas.filter((item) => relevantEquipmentIds.has(item.id));

  const sanitizedSelectedCaminhaoIds = selectedCaminhaoIds.filter((id) =>
    caminhoesDisponiveis.some((item) => item.id === id)
  );
  const sanitizedSelectedMaquinaIds = selectedMaquinaIds.filter((id) =>
    maquinasDisponiveis.some((item) => item.id === id)
  );

  const selectedCaminhaoSet =
    sanitizedSelectedCaminhaoIds.length > 0 ? new Set(sanitizedSelectedCaminhaoIds) : null;
  const selectedMaquinaSet =
    sanitizedSelectedMaquinaIds.length > 0 ? new Set(sanitizedSelectedMaquinaIds) : null;

  const caminhaoSection = buildSection(rawItems, selectedCaminhaoSet, "CAMINHAO");
  const maquinaSection = buildSection(rawItems, selectedMaquinaSet, "MAQUINA");

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
      caminhaoIds: sanitizedSelectedCaminhaoIds,
      maquinaIds: sanitizedSelectedMaquinaIds,
      caminhoes: caminhoesDisponiveis.map((item) => ({
        id: item.id,
        label: `${item.placaOuTag} - ${item.descricao}`
      })),
      maquinas: maquinasDisponiveis.map((item) => ({
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
