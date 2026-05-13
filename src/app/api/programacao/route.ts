import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { programacaoSchema } from "@/lib/validators/programacao";
import {
  existeConflitoProgramacao,
  listarProgramacoes,
  mapProgramacaoData,
  validarRelacionamentosProgramacao
} from "@/server/services/programacao/service";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const items = await listarProgramacoes(prisma, {
    clienteId: searchParams.get("clienteId"),
    equipamentoId: searchParams.get("equipamentoId"),
    obraId: searchParams.get("obraId"),
    status: searchParams.get("status"),
    dataInicio: searchParams.get("dataInicio"),
    dataFim: searchParams.get("dataFim")
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

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

  try {
    await validarRelacionamentosProgramacao(prisma, parsed.data);

    const data = mapProgramacaoData(parsed.data);
    const conflito = await existeConflitoProgramacao(prisma, {
      equipamentoId: data.equipamentoId,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
      turno: data.turno
    });

    if (conflito) {
      return NextResponse.json(
        {
          message: `Este equipamento ja esta programado entre ${conflito.dataInicio.toLocaleDateString("pt-BR")} e ${conflito.dataFim.toLocaleDateString("pt-BR")}${conflito.turno ? ` no turno ${conflito.turno.toLowerCase()}` : ""}.`
        },
        { status: 409 }
      );
    }

    const created = await prisma.agendaProgramacao.create({
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

    return NextResponse.json(created, { status: 201 });
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
      { message: "Nao foi possivel criar a programacao.", detail: String(error) },
      { status: 500 }
    );
  }
}
