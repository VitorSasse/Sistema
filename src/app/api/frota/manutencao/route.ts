import { CriterioControleManutencao } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withPerformanceMonitoring } from "@/lib/performance/route";
import { prisma } from "@/lib/prisma";
import {
  calcularProximaManutencao,
  selecionarPlanosManutencaoRelevantes
} from "@/server/services/frota/plano-service";

type PanelStatus = "VENCIDA" | "ATENCAO" | "EM_DIA" | "SEM_BASE" | "SEM_PLANO";

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseIdList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStatusWeight(status: PanelStatus) {
  switch (status) {
    case "VENCIDA":
      return 0;
    case "ATENCAO":
      return 1;
    case "SEM_BASE":
      return 2;
    case "SEM_PLANO":
      return 3;
    default:
      return 4;
  }
}

function buildProjection(
  plano: {
    id: string;
    titulo: string;
    tipoManutencao: string;
    criterioControle: CriterioControleManutencao;
    periodicidadeValor: number;
    toleranciaValor: number;
    ultimaExecucaoEm: Date | null;
    ultimaLeituraHorimetro: unknown;
    ultimaLeituraKm: unknown;
    proximaExecucaoEm: Date | null;
    proximoHorimetro: unknown;
    proximoKm: unknown;
  },
  equipamento: {
    horimetroAtual: unknown;
    kmAtual: unknown;
  }
) {
  const tolerance =
    plano.toleranciaValor > 0
      ? plano.toleranciaValor
      : Math.max(1, Math.round(plano.periodicidadeValor * 0.1));

  if (plano.criterioControle === "HORIMETRO") {
    const atual = toNumber(equipamento.horimetroAtual);
    const base = toNumber(plano.ultimaLeituraHorimetro);
    const target =
      toNumber(plano.proximoHorimetro) ??
      (base !== null ? base + plano.periodicidadeValor : null);

    if (atual === null || target === null) {
      return {
        status: "SEM_BASE" as PanelStatus,
        unidade: "h",
        restanteNumero: null,
        restanteLabel: "Sem leitura para calcular",
        alvoLabel: target !== null ? `${target.toFixed(2)} h` : "Sem meta",
        leituraAtualLabel: atual !== null ? `${atual.toFixed(2)} h` : "Sem leitura",
        progresso: null,
        urgencia: Number.POSITIVE_INFINITY
      };
    }

    const restante = Number((target - atual).toFixed(2));
    const progresso =
      base !== null && plano.periodicidadeValor > 0
        ? clamp(((atual - base) / plano.periodicidadeValor) * 100, 0, 100)
        : clamp((atual / target) * 100, 0, 100);

    return {
      status:
        restante <= 0 ? ("VENCIDA" as PanelStatus) : restante <= tolerance ? ("ATENCAO" as PanelStatus) : ("EM_DIA" as PanelStatus),
      unidade: "h",
      restanteNumero: restante,
      restanteLabel:
        restante <= 0
          ? `${Math.abs(restante).toFixed(2)} h atrasada`
          : `${restante.toFixed(2)} h restantes`,
      alvoLabel: `${target.toFixed(2)} h`,
      leituraAtualLabel: `${atual.toFixed(2)} h`,
      progresso,
      urgencia: restante
    };
  }

  if (plano.criterioControle === "KM") {
    const atual = toNumber(equipamento.kmAtual);
    const base = toNumber(plano.ultimaLeituraKm);
    const target =
      toNumber(plano.proximoKm) ??
      (base !== null ? base + plano.periodicidadeValor : null);

    if (atual === null || target === null) {
      return {
        status: "SEM_BASE" as PanelStatus,
        unidade: "km",
        restanteNumero: null,
        restanteLabel: "Sem leitura para calcular",
        alvoLabel: target !== null ? `${target.toFixed(1)} km` : "Sem meta",
        leituraAtualLabel: atual !== null ? `${atual.toFixed(1)} km` : "Sem leitura",
        progresso: null,
        urgencia: Number.POSITIVE_INFINITY
      };
    }

    const restante = Number((target - atual).toFixed(1));
    const progresso =
      base !== null && plano.periodicidadeValor > 0
        ? clamp(((atual - base) / plano.periodicidadeValor) * 100, 0, 100)
        : clamp((atual / target) * 100, 0, 100);

    return {
      status:
        restante <= 0 ? ("VENCIDA" as PanelStatus) : restante <= tolerance ? ("ATENCAO" as PanelStatus) : ("EM_DIA" as PanelStatus),
      unidade: "km",
      restanteNumero: restante,
      restanteLabel:
        restante <= 0
          ? `${Math.abs(restante).toFixed(1)} km atrasado`
          : `${restante.toFixed(1)} km restantes`,
      alvoLabel: `${target.toFixed(1)} km`,
      leituraAtualLabel: `${atual.toFixed(1)} km`,
      progresso,
      urgencia: restante
    };
  }

  const projection =
    plano.proximaExecucaoEm
      ? { proximaExecucaoEm: plano.proximaExecucaoEm }
      : calcularProximaManutencao({
          criterioControle: plano.criterioControle,
          periodicidadeValor: plano.periodicidadeValor,
          ultimaExecucaoEm: plano.ultimaExecucaoEm
        });

  const proximaExecucaoEm = projection.proximaExecucaoEm ?? null;

  if (!proximaExecucaoEm) {
    return {
      status: "SEM_BASE" as PanelStatus,
      unidade: "dias",
      restanteNumero: null,
      restanteLabel: "Sem data para calcular",
      alvoLabel: "Sem data prevista",
      leituraAtualLabel: plano.ultimaExecucaoEm
        ? plano.ultimaExecucaoEm.toLocaleDateString("pt-BR")
        : "Sem ultima execucao",
      progresso: null,
      urgencia: Number.POSITIVE_INFINITY
    };
  }

  const hoje = startOfToday();
  const alvo = new Date(proximaExecucaoEm);
  alvo.setHours(0, 0, 0, 0);
  const restante = Math.ceil((alvo.getTime() - hoje.getTime()) / 86400000);

  let progresso: number | null = null;
  if (plano.ultimaExecucaoEm && plano.periodicidadeValor > 0) {
    const base = new Date(plano.ultimaExecucaoEm);
    base.setHours(0, 0, 0, 0);
    const diasConsumidos = Math.max(
      0,
      Math.ceil((hoje.getTime() - base.getTime()) / 86400000)
    );
    progresso = clamp((diasConsumidos / plano.periodicidadeValor) * 100, 0, 100);
  }

  return {
    status:
      restante <= 0 ? ("VENCIDA" as PanelStatus) : restante <= tolerance ? ("ATENCAO" as PanelStatus) : ("EM_DIA" as PanelStatus),
    unidade: "dias",
    restanteNumero: restante,
    restanteLabel:
      restante <= 0
        ? `${Math.abs(restante)} dia(s) atrasado(s)`
        : `${restante} dia(s) restantes`,
    alvoLabel: alvo.toLocaleDateString("pt-BR"),
    leituraAtualLabel: plano.ultimaExecucaoEm
      ? plano.ultimaExecucaoEm.toLocaleDateString("pt-BR")
      : "Sem ultima execucao",
    progresso,
    urgencia: restante
  };
}

export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(request, { route: "/api/frota/manutencao", method: "GET" }, async () => {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const equipamentoIds = parseIdList(searchParams.get("equipamentoIds"));
  const situacao = (searchParams.get("situacao")?.trim().toUpperCase() as PanelStatus | "TODAS") || "TODAS";

  const equipamentos = await prisma.equipamento.findMany({
    where: {
      status: "ATIVO",
      ...(equipamentoIds.length > 0 ? { id: { in: equipamentoIds } } : {})
    },
    select: {
      id: true,
      descricao: true,
      placaOuTag: true,
      tipoRecurso: true,
      tipoControle: true,
      statusOperacional: true,
      complementar: true,
      horimetroAtual: true,
      kmAtual: true,
      planosManutencao: {
        where: {
          status: "ATIVO"
        },
        select: {
          id: true,
          titulo: true,
          tipoManutencao: true,
          criterioControle: true,
          periodicidadeValor: true,
          toleranciaValor: true,
          ultimaExecucaoEm: true,
          ultimaLeituraHorimetro: true,
          ultimaLeituraKm: true,
          proximaExecucaoEm: true,
          proximoHorimetro: true,
          proximoKm: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: [{ descricao: "asc" }, { placaOuTag: "asc" }]
  });

  const equipamentosOptions = equipamentos.map((equipamento) => ({
    id: equipamento.id,
    label: `${equipamento.placaOuTag} - ${equipamento.descricao}`
  }));

  const items = equipamentos
    .map((equipamento) => {
      if (equipamento.planosManutencao.length === 0) {
        return {
          equipamentoId: equipamento.id,
          descricao: equipamento.descricao,
          placaOuTag: equipamento.placaOuTag,
          tipoRecurso: equipamento.tipoRecurso,
          tipoControle: equipamento.tipoControle,
          statusOperacional: equipamento.statusOperacional,
          complementar: equipamento.complementar,
          painelStatus: "SEM_PLANO" as PanelStatus,
          planoId: null,
          planoTitulo: "Sem plano preventivo",
          tipoManutencao: "Sem cadastro ativo",
          criterioControle: null,
          periodicidadeValor: null,
          toleranciaValor: null,
          restanteNumero: null,
          restanteLabel: "Sem plano preventivo ativo",
          unidadeRestante: null,
          alvoLabel: "Cadastre um plano para este equipamento",
          leituraAtualLabel:
            equipamento.tipoControle === "KM"
              ? toNumber(equipamento.kmAtual) !== null
                ? `${toNumber(equipamento.kmAtual)?.toFixed(1)} km`
                : "Sem leitura"
              : toNumber(equipamento.horimetroAtual) !== null
                ? `${toNumber(equipamento.horimetroAtual)?.toFixed(2)} h`
                : "Sem leitura",
          progresso: null,
          urgencia: Number.POSITIVE_INFINITY
        };
      }

      const relevantes = selecionarPlanosManutencaoRelevantes(equipamento.planosManutencao, {
        horimetroAtual: equipamento.horimetroAtual,
        kmAtual: equipamento.kmAtual
      });

      const projected = relevantes
        .map((plano) => {
          const projection = buildProjection(plano, equipamento);

          return {
            plano,
            ...projection
          };
        })
        .sort((left, right) => {
          const statusDelta =
            getStatusWeight(left.status) - getStatusWeight(right.status);

          if (statusDelta !== 0) {
            return statusDelta;
          }

          return left.urgencia - right.urgencia;
        })[0];

      return {
        equipamentoId: equipamento.id,
        descricao: equipamento.descricao,
        placaOuTag: equipamento.placaOuTag,
        tipoRecurso: equipamento.tipoRecurso,
        tipoControle: equipamento.tipoControle,
        statusOperacional: equipamento.statusOperacional,
        complementar: equipamento.complementar,
        painelStatus: projected.status,
        planoId: projected.plano.id,
        planoTitulo: projected.plano.titulo || projected.plano.tipoManutencao,
        tipoManutencao: projected.plano.tipoManutencao,
        criterioControle: projected.plano.criterioControle,
        periodicidadeValor: projected.plano.periodicidadeValor,
        toleranciaValor: projected.plano.toleranciaValor,
        restanteNumero: projected.restanteNumero,
        restanteLabel: projected.restanteLabel,
        unidadeRestante: projected.unidade,
        alvoLabel: projected.alvoLabel,
        leituraAtualLabel: projected.leituraAtualLabel,
        progresso: projected.progresso,
        urgencia: projected.urgencia
      };
    })
    .filter((item) => (situacao === "TODAS" ? true : item.painelStatus === situacao))
    .sort((left, right) => {
      const statusDelta =
        getStatusWeight(left.painelStatus) - getStatusWeight(right.painelStatus);

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return left.urgencia - right.urgencia;
    });

  const summary = {
    total: items.length,
    vencidas: items.filter((item) => item.painelStatus === "VENCIDA").length,
    atencao: items.filter((item) => item.painelStatus === "ATENCAO").length,
    emDia: items.filter((item) => item.painelStatus === "EM_DIA").length,
    semBase: items.filter((item) => item.painelStatus === "SEM_BASE").length,
    semPlano: items.filter((item) => item.painelStatus === "SEM_PLANO").length
  };

  return NextResponse.json({
    filters: {
      equipamentoIds,
      equipamentos: equipamentosOptions,
      situacao
    },
    summary,
    highlights: items.slice(0, 8),
    items
  });
  });
}
