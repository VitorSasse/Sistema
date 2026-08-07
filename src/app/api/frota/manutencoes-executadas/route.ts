import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { parseOptionalDateOnlyStart } from "@/lib/utils/date";
import { manutencaoExecutadaSchema } from "@/lib/validators/frota/manutencao-executada";

function parseNullableNumber(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function normalizePayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    planoId: payload.planoId || null,
    agendaId: payload.agendaId || null,
    horimetroMomento: parseNullableNumber(payload.horimetroMomento),
    kmMomento: parseNullableNumber(payload.kmMomento),
    custo: parseNullableNumber(payload.custo),
    executadoPorId: payload.executadoPorId || null,
    itensServicos: Array.isArray(payload.itensServicos)
      ? payload.itensServicos.map((item) => {
          const current = item as Record<string, unknown>;

          return {
            ...current,
            quantidade: parseNullableNumber(current.quantidade)
          };
        })
      : []
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = requireActiveTenantEmpresaId();
  const items = await prisma.manutencaoExecutada.findMany({
    where: {
      empresaId
    },
    include: {
      equipamento: {
        select: {
          id: true,
          descricao: true,
          placaOuTag: true
        }
      },
      plano: {
        select: {
          id: true,
          titulo: true,
          tipoManutencao: true
        }
      },
      itensServicos: {
        orderBy: [{ createdAt: "asc" }]
      }
    },
    orderBy: [{ dataExecucao: "desc" }, { createdAt: "desc" }],
    take: 100
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = manutencaoExecutadaSchema.safeParse(normalizePayload(payload));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const empresaId = requireActiveTenantEmpresaId();
  const equipamento = await prisma.equipamento.findFirst({
    where: {
      id: parsed.data.equipamentoId,
      empresaId,
      status: "ATIVO"
    },
    select: {
      id: true
    }
  });

  if (!equipamento) {
    return NextResponse.json({ message: "Equipamento nao encontrado ou inativo." }, { status: 404 });
  }

  if (parsed.data.planoId) {
    const plano = await prisma.planoManutencao.findFirst({
      where: {
        id: parsed.data.planoId,
        empresaId,
        equipamentoId: parsed.data.equipamentoId
      },
      select: {
        id: true
      }
    });

    if (!plano) {
      return NextResponse.json({ message: "Plano de manutencao nao encontrado para o equipamento." }, { status: 404 });
    }
  }

  const created = await prisma.manutencaoExecutada.create({
    data: {
      empresaId,
      equipamentoId: parsed.data.equipamentoId,
      planoId: parsed.data.planoId ?? null,
      agendaId: parsed.data.agendaId ?? null,
      dataExecucao: parseOptionalDateOnlyStart(parsed.data.dataExecucao) ?? new Date(parsed.data.dataExecucao),
      tipoManutencao: parsed.data.tipoManutencao,
      descricaoServico: parsed.data.descricaoServico,
      horimetroMomento: parsed.data.horimetroMomento ?? null,
      kmMomento: parsed.data.kmMomento ?? null,
      pecasTrocadas: Prisma.JsonNull,
      fornecedorOficina: parsed.data.fornecedorOficina?.trim() || null,
      custo: parsed.data.custo ?? null,
      observacao: parsed.data.observacao?.trim() || null,
      executadoPorId: parsed.data.executadoPorId ?? null,
      registradoPorId: session.user.id,
      itensServicos: {
        create: parsed.data.itensServicos.map((item) => ({
          empresaId,
          tipo: item.tipo,
          descricao: item.descricao,
          quantidade: item.quantidade ?? null,
          unidade: item.unidade,
          observacao: item.observacao
        }))
      }
    },
    include: {
      equipamento: {
        select: {
          id: true,
          descricao: true,
          placaOuTag: true
        }
      },
      plano: {
        select: {
          id: true,
          titulo: true,
          tipoManutencao: true
        }
      },
      itensServicos: {
        orderBy: [{ createdAt: "asc" }]
      }
    }
  });

  return NextResponse.json(created, { status: 201 });
}
