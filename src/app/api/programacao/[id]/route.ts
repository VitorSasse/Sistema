import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { programacaoSchema } from "@/lib/validators/programacao";
import {
  existeConflitoProgramacao,
  mapProgramacaoData,
  validarRelacionamentosProgramacao
} from "@/server/services/programacao/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = programacaoSchema.safeParse({
    ...payload,
    obraId: payload.obraId || "",
    local: payload.local || "",
    turno: payload.turno || null,
    observacoes: payload.observacoes || ""
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos para programacao.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existente = await prisma.agendaProgramacao.findFirst({
    where: {
      id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!existente) {
    return NextResponse.json({ message: "Programacao nao encontrada." }, { status: 404 });
  }

  try {
    await validarRelacionamentosProgramacao(prisma, parsed.data);

    const data = mapProgramacaoData(parsed.data);
    const conflito = await existeConflitoProgramacao(prisma, {
      equipamentoId: data.equipamentoId,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
      excludeId: id
    });

    if (conflito) {
      return NextResponse.json(
        {
          message: `Este equipamento ja esta programado entre ${conflito.dataInicio.toLocaleDateString("pt-BR")} e ${conflito.dataFim.toLocaleDateString("pt-BR")}.`
        },
        { status: 409 }
      );
    }

    const updated = await prisma.agendaProgramacao.update({
      where: { id },
      data,
      include: {
        equipamento: {
          select: {
            id: true,
            descricao: true,
            placaOuTag: true,
            tipoRecurso: true,
            statusOperacional: true
          }
        },
        obra: {
          select: {
            id: true,
            codigo: true,
            nome: true,
            cliente: {
              select: {
                id: true,
                nome: true,
                codigo: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EQUIPAMENTO_INVALIDO") {
        return NextResponse.json(
          { message: "Selecione um equipamento ativo e valido para programacao." },
          { status: 400 }
        );
      }

      if (error.message === "OBRA_INVALIDA") {
        return NextResponse.json(
          { message: "Selecione uma obra ativa e valida para programacao." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar a programacao.", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const deleted = await prisma.agendaProgramacao.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });

    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel excluir a programacao.", detail: String(error) },
      { status: 500 }
    );
  }
}
