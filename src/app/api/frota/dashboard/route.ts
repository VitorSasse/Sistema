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

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo"
});

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
  return dayKeyFormatter.format(value);
}

function resolveProduction(
  unidadeApontada: "CARGA" | "HORA" | "M3" | "DIARIA",
  unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA",
  quantidadeApontada: number,
  quantidadeFaturada: number,
  capacidadeM3: number
) {
  const cargas =
    unidadeApontada === "CARGA"
      ? quantidadeApontada
      : unidadeFaturada === "CARGA"
        ? quantidadeFaturada
        : 0;

  const totalM3 =
    unidadeApontada === "M3"
      ? quantidadeApontada
      : unidadeFaturada === "M3"
        ? quantidadeFaturada
        : cargas > 0 && capacidadeM3 > 0
          ? cargas * capacidadeM3
          : 0;

  return {
    cargas: Number(cargas.toFixed(2)),
    totalM3: Number(totalM3.toFixed(2))
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

  const selectedEquipamentoId = request.nextUrl.searchParams.get("equipamentoId");

  const equipamentos = await prisma.equipamento.findMany({
    where: {
      tipoRecurso: "CAMINHAO",
      complementar: false
    },
    select: {
      id: true,
      descricao: true,
      placaOuTag: true
    },
    orderBy: [{ descricao: "asc" }, { placaOuTag: "asc" }]
  });

  if (selectedEquipamentoId && !equipamentos.some((item) => item.id === selectedEquipamentoId)) {
    return NextResponse.json({ message: "Caminhao invalido para o filtro." }, { status: 400 });
  }

  const lancamentos = await prisma.lancamentoDiario.findMany({
    where: {
      deletedAt: null,
      statusValidacao: {
        not: "CANCELADO"
      },
      data: {
        gte: period.start,
        lte: period.end
      },
      equipamento: {
        tipoRecurso: "CAMINHAO",
        complementar: false,
        ...(selectedEquipamentoId ? { id: selectedEquipamentoId } : {})
      }
    },
    select: {
      data: true,
      quantidadeApontada: true,
      quantidadeFaturada: true,
      unidadeApontada: true,
      unidadeFaturada: true,
      equipamento: {
        select: {
          id: true,
          descricao: true,
          placaOuTag: true,
          capacidadeM3: true
        }
      }
    },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }]
  });

  const rankingMap = new Map<
    string,
    {
      equipamentoId: string;
      descricao: string;
      placaOuTag: string;
      totalM3: number;
      totalCargas: number;
      dias: Set<string>;
      ultimoLancamento: Date;
    }
  >();
  const daysWithProduction = new Set<string>();

  for (const lancamento of lancamentos) {
    const capacidadeM3 = Number(lancamento.equipamento.capacidadeM3 ?? 0);
    const quantidadeApontada = Number(lancamento.quantidadeApontada ?? 0);
    const quantidadeFaturada = Number(lancamento.quantidadeFaturada ?? 0);
    const production = resolveProduction(
      lancamento.unidadeApontada,
      lancamento.unidadeFaturada,
      quantidadeApontada,
      quantidadeFaturada,
      capacidadeM3
    );

    if (production.totalM3 <= 0 && production.cargas <= 0) {
      continue;
    }

    const dayKey = toDayKey(lancamento.data);
    daysWithProduction.add(dayKey);

    const current =
      rankingMap.get(lancamento.equipamento.id) ??
      {
        equipamentoId: lancamento.equipamento.id,
        descricao: lancamento.equipamento.descricao,
        placaOuTag: lancamento.equipamento.placaOuTag,
        totalM3: 0,
        totalCargas: 0,
        dias: new Set<string>(),
        ultimoLancamento: lancamento.data
      };

    current.totalM3 = Number((current.totalM3 + production.totalM3).toFixed(2));
    current.totalCargas = Number((current.totalCargas + production.cargas).toFixed(2));
    current.dias.add(dayKey);

    if (lancamento.data > current.ultimoLancamento) {
      current.ultimoLancamento = lancamento.data;
    }

    rankingMap.set(lancamento.equipamento.id, current);
  }

  const ranking = Array.from(rankingMap.values())
    .map((item) => {
      const diasComProducao = item.dias.size;
      return {
        equipamentoId: item.equipamentoId,
        descricao: item.descricao,
        placaOuTag: item.placaOuTag,
        totalM3: item.totalM3,
        totalCargas: item.totalCargas,
        diasComProducao,
        mediaM3PorDia:
          diasComProducao > 0 ? Number((item.totalM3 / diasComProducao).toFixed(2)) : 0,
        ultimoLancamento: item.ultimoLancamento.toISOString()
      };
    })
    .sort((a, b) => {
      if (b.totalM3 !== a.totalM3) return b.totalM3 - a.totalM3;
      if (b.totalCargas !== a.totalCargas) return b.totalCargas - a.totalCargas;
      return a.placaOuTag.localeCompare(b.placaOuTag);
    });

  const totalM3 = Number(
    ranking.reduce((acc, item) => acc + item.totalM3, 0).toFixed(2)
  );
  const totalCargas = Number(
    ranking.reduce((acc, item) => acc + item.totalCargas, 0).toFixed(2)
  );
  const caminhoesComProducao = ranking.length;
  const diasComProducao = daysWithProduction.size;

  return NextResponse.json({
    period: {
      preset: period.preset,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: period.label
    },
    filters: {
      equipamentoId: selectedEquipamentoId,
      equipamentos: equipamentos.map((item) => ({
        id: item.id,
        label: `${item.placaOuTag} - ${item.descricao}`
      }))
    },
    summary: {
      totalM3,
      totalCargas,
      caminhoesComProducao,
      diasComProducao,
      mediaM3PorCaminhao:
        caminhoesComProducao > 0 ? Number((totalM3 / caminhoesComProducao).toFixed(2)) : 0,
      mediaM3PorDia: diasComProducao > 0 ? Number((totalM3 / diasComProducao).toFixed(2)) : 0
    },
    ranking
  });
}
