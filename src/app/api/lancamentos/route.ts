import { StatusCadastro, StatusLancamento } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { lancamentoSchema } from "@/lib/validators/lancamento";
import { sincronizarLeituraPorLancamento } from "@/server/services/frota/leitura-sync";

function normalizeDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function parseNullableNumber(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const periodoInicial = request.nextUrl.searchParams.get("periodoInicial");
  const periodoFinal = request.nextUrl.searchParams.get("periodoFinal");
  const fichaNumero = request.nextUrl.searchParams.get("fichaNumero");
  const clienteId = request.nextUrl.searchParams.get("clienteId");
  const obraId = request.nextUrl.searchParams.get("obraId");
  const servicoId = request.nextUrl.searchParams.get("servicoId");
  const equipamentoId = request.nextUrl.searchParams.get("equipamentoId");
  const colaboradorId = request.nextUrl.searchParams.get("colaboradorId");
  const status = request.nextUrl.searchParams.get("status");
  const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true";

  const dataFilter = (() => {
    if (periodoInicial && periodoFinal) {
      return {
        gte: startOfDay(normalizeDate(periodoInicial)),
        lte: endOfDay(normalizeDate(periodoFinal))
      };
    }

    if (periodoInicial) {
      return {
        gte: startOfDay(normalizeDate(periodoInicial))
      };
    }

    if (periodoFinal) {
      return {
        lte: endOfDay(normalizeDate(periodoFinal))
      };
    }

    if (dateParam) {
      const referenceDate = normalizeDate(dateParam);
      return {
        gte: startOfDay(referenceDate),
        lte: endOfDay(referenceDate)
      };
    }

    return undefined;
  })();

  const items = await prisma.lancamentoDiario.findMany({
    where: {
      data: dataFilter,
      clienteId: clienteId || undefined,
      obraId: obraId || undefined,
      servicoId: servicoId || undefined,
      equipamentoId: equipamentoId || undefined,
      colaboradorId: colaboradorId || undefined,
      statusValidacao: status ? (status as StatusLancamento) : undefined,
      ficha: fichaNumero
        ? {
            numero: {
              contains: fichaNumero,
              mode: "insensitive"
            }
          }
        : undefined,
      deletedAt: includeDeleted || status === StatusLancamento.CANCELADO ? undefined : null
    },
    include: {
      ficha: true,
      cliente: true,
      obra: true,
      servico: true,
      material: true,
      equipamento: true,
      colaborador: true
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const normalizedPayload = {
    ...payload,
    obraId: payload.obraId || null,
    materialId: payload.materialId || null,
    quantidadeApontada: parseDecimalInput(payload.quantidadeApontada),
    quantidadeFaturada: parseDecimalInput(payload.quantidadeFaturada),
    horimetroInformado: parseNullableNumber(payload.horimetroInformado),
    kmInformado: parseNullableNumber(payload.kmInformado)
  };
  const parsed = lancamentoSchema.safeParse(normalizedPayload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const dataReferencia = normalizeDate(parsed.data.data);

  const [cliente, obra, servico, material, equipamento, colaborador] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: parsed.data.clienteId } }),
    parsed.data.obraId ? prisma.obra.findUnique({ where: { id: parsed.data.obraId } }) : Promise.resolve(null),
    prisma.servico.findUnique({ where: { id: parsed.data.servicoId } }),
    parsed.data.materialId
      ? prisma.material.findUnique({ where: { id: parsed.data.materialId } })
      : Promise.resolve(null),
    prisma.equipamento.findUnique({ where: { id: parsed.data.equipamentoId } }),
    prisma.colaborador.findUnique({ where: { id: parsed.data.colaboradorId } })
  ]);

  if (!cliente || cliente.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Cliente invalido ou inativo." }, { status: 400 });
  }

  if (obra) {
    if (obra.clienteId !== cliente.id) {
      return NextResponse.json({ message: "A obra nao pertence ao cliente selecionado." }, { status: 400 });
    }

    if (obra.status !== StatusCadastro.ATIVO || !obra.liberadaParaLancamento) {
      return NextResponse.json(
        { message: "A obra esta inativa ou bloqueada para lancamento." },
        { status: 400 }
      );
    }
  }

  if (!servico || servico.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Servico invalido ou inativo." }, { status: 400 });
  }

  if (servico.exigeMaterial && !material) {
    return NextResponse.json({ message: "Este servico exige material vinculado." }, { status: 400 });
  }

  if (material && material.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Material invalido ou inativo." }, { status: 400 });
  }

  if (!equipamento || equipamento.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Equipamento invalido ou inativo." }, { status: 400 });
  }

  if (!colaborador || colaborador.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Colaborador invalido ou inativo." }, { status: 400 });
  }

  const duplicate = await prisma.lancamentoDiario.findFirst({
    where: {
      data: dataReferencia,
      clienteId: cliente.id,
      obraId: parsed.data.obraId ?? null,
      servicoId: servico.id,
      materialId: parsed.data.materialId ?? null,
      equipamentoId: equipamento.id,
      colaboradorId: colaborador.id,
      quantidadeApontada: parsed.data.quantidadeApontada,
      unidadeApontada: parsed.data.unidadeApontada,
      quantidadeFaturada: parsed.data.quantidadeFaturada,
      unidadeFaturada: parsed.data.unidadeFaturada,
      ficha: {
        numero: parsed.data.fichaNumero
      },
      deletedAt: null
    }
  });

  if (duplicate) {
    return NextResponse.json(
      { message: "Ja existe um lancamento identico para esta ficha, cliente, obra e composicao informada." },
      { status: 409 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let ficha = await tx.ficha.findFirst({
        where: {
          numero: parsed.data.fichaNumero,
          data: dataReferencia,
          clienteId: cliente.id,
          obraId: parsed.data.obraId ?? null
        }
      });

      if (!ficha) {
        ficha = await tx.ficha.create({
          data: {
            numero: parsed.data.fichaNumero,
            data: dataReferencia,
            clienteId: cliente.id,
            obraId: parsed.data.obraId ?? null,
            observacao: parsed.data.fichaObservacao || null,
            criadoPorId: session.user.id
          }
        });
      } else {
        ficha = await tx.ficha.update({
          where: { id: ficha.id },
          data: {
            observacao: parsed.data.fichaObservacao || null
          }
        });
      }

      const statusValidacao = parsed.data.obraId
        ? StatusLancamento.NAO_MEDIDO
        : StatusLancamento.PENDENTE_OBRA;

      const lancamento = await tx.lancamentoDiario.create({
        data: {
          fichaId: ficha.id,
          data: dataReferencia,
          clienteId: cliente.id,
          obraId: parsed.data.obraId ?? null,
          servicoId: servico.id,
          materialId: parsed.data.materialId ?? null,
          equipamentoId: equipamento.id,
          colaboradorId: colaborador.id,
          quantidadeApontada: parsed.data.quantidadeApontada,
          unidadeApontada: parsed.data.unidadeApontada,
          quantidadeFaturada: parsed.data.quantidadeFaturada,
          unidadeFaturada: parsed.data.unidadeFaturada,
          horimetroInformado: parsed.data.horimetroInformado ?? null,
          kmInformado: parsed.data.kmInformado ?? null,
          observacao: parsed.data.observacao || null,
          statusValidacao,
          criadoPorId: session.user.id
        },
        include: {
          ficha: true,
          cliente: true,
          obra: true,
          servico: true,
          material: true,
          equipamento: true,
          colaborador: true
        }
      });

      await sincronizarLeituraPorLancamento(tx, {
        equipamentoId: equipamento.id,
        lancamentoDiarioId: lancamento.id,
        usuarioId: session.user.id,
        dataLeitura: dataReferencia,
        horimetroInformado:
          parsed.data.horimetroInformado === null || parsed.data.horimetroInformado === undefined
            ? null
            : Number(parsed.data.horimetroInformado),
        kmInformado:
          parsed.data.kmInformado === null || parsed.data.kmInformado === undefined
            ? null
            : Number(parsed.data.kmInformado),
        observacao: parsed.data.observacao || null
      });

      return lancamento;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel salvar o lancamento." },
      { status: 409 }
    );
  }
}
