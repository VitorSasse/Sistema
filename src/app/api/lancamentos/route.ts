import { StatusCadastro, StatusLancamento } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiPermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import {
  calcularQuantidadeRomaneiosEsperada,
  formatarQuantidadeCarga,
  parseRomaneiosInput
} from "@/lib/utils/romaneios";
import { lancamentoSchema } from "@/lib/validators/lancamento";
import { sincronizarLeituraPorLancamento } from "@/server/services/frota/leitura-sync";
import { substituirRomaneiosDoLancamento } from "@/server/services/lancamentos/romaneios";
import { obterOuCriarRecursoTecnicoPadrao } from "@/server/services/lancamentos/recurso-tecnico";

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

function getQuantidadeCargasDoLancamento(data: {
  quantidadeApontada: number | string;
  unidadeApontada: string;
  quantidadeFaturada: number | string;
  unidadeFaturada: string;
}) {
  if (data.unidadeFaturada === "CARGA") {
    return Number(data.quantidadeFaturada);
  }

  if (data.unidadeApontada === "CARGA") {
    return Number(data.quantidadeApontada);
  }

  return null;
}

function validateRomaneiosPorCarga(data: {
  possuiRomaneio?: boolean;
  romaneios: string[];
  quantidadeApontada: number | string;
  unidadeApontada: string;
  quantidadeFaturada: number | string;
  unidadeFaturada: string;
}) {
  if (!data.possuiRomaneio) {
    return null;
  }

  const quantidadeCargas = getQuantidadeCargasDoLancamento(data);

  if (quantidadeCargas === null) {
    return "Romaneios so podem ser exigidos quando a unidade apontada ou faturada for Carga.";
  }

  const romaneiosEsperados = calcularQuantidadeRomaneiosEsperada(quantidadeCargas);

  if (romaneiosEsperados === null) {
    return "A quantidade de cargas deve ser maior que zero para validar romaneios.";
  }

  if (data.romaneios.length !== romaneiosEsperados) {
    return `A quantidade de romaneios (${data.romaneios.length}) precisa bater com a quantidade esperada (${romaneiosEsperados}) para ${formatarQuantidadeCarga(quantidadeCargas)} carga(s).`;
  }

  return null;
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
      romaneios: {
        where: { deletedAt: null },
        orderBy: { numero: "asc" },
        select: { numero: true }
      },
      ficha: {
        include: {
          romaneios: {
            where: { deletedAt: null },
            orderBy: { numero: "asc" },
            select: { numero: true }
          },
          _count: {
            select: {
              lancamentos: true
            }
          }
        }
      },
      cliente: true,
      obra: true,
      servico: true,
      material: true,
      equipamento: true,
      colaborador: true
    },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }]
  });

  const normalizedItems = items.map((item) => ({
    ...item,
    romaneios:
      item.romaneios.length > 0
        ? item.romaneios
        : item.ficha._count.lancamentos <= 1
          ? item.ficha.romaneios
          : []
  }));

  return NextResponse.json({ items: normalizedItems });
}

export async function POST(request: NextRequest) {
  const access = await validateApiPermission("lancamentos.create");

  if (!access.ok) {
    return access.response;
  }

  const session = access.session;

  const payload = (await request.json()) as Record<string, unknown>;
  const romaneiosPayload = parseRomaneiosInput(payload.romaneios);
  const possuiRomaneio =
    typeof payload.possuiRomaneio === "boolean" ? payload.possuiRomaneio : romaneiosPayload.length > 0;
  const normalizedPayload = {
    ...payload,
    obraId: payload.obraId || null,
    materialId: payload.materialId || null,
    equipamentoId: payload.equipamentoId || null,
    possuiRomaneio,
    romaneios: possuiRomaneio ? romaneiosPayload : [],
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

  const romaneioError = validateRomaneiosPorCarga(parsed.data);

  if (romaneioError) {
    return NextResponse.json({ message: romaneioError }, { status: 400 });
  }

  const dataReferencia = normalizeDate(parsed.data.data);

  const [cliente, obra, servico, material, colaborador] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: parsed.data.clienteId } }),
    parsed.data.obraId ? prisma.obra.findUnique({ where: { id: parsed.data.obraId } }) : Promise.resolve(null),
    prisma.servico.findUnique({ where: { id: parsed.data.servicoId } }),
    parsed.data.materialId
      ? prisma.material.findUnique({ where: { id: parsed.data.materialId } })
      : Promise.resolve(null),
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

  if (
    servico.faturamentoFechado &&
    (parsed.data.unidadeApontada !== "SERVICO" || parsed.data.unidadeFaturada !== "SERVICO")
  ) {
    return NextResponse.json(
      { message: "Servicos com faturamento fechado devem usar a unidade SERVICO." },
      { status: 400 }
    );
  }

  if (servico.servicoTecnico && parsed.data.materialId) {
    return NextResponse.json(
      { message: "Servicos tecnicos nao devem ser lancados com material vinculado." },
      { status: 400 }
    );
  }

  if (servico.exigeMaterial && !material) {
    return NextResponse.json({ message: "Este servico exige material vinculado." }, { status: 400 });
  }

  if (material && material.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Material invalido ou inativo." }, { status: 400 });
  }

  const equipamento = parsed.data.equipamentoId
    ? await prisma.equipamento.findUnique({ where: { id: parsed.data.equipamentoId } })
    : null;

  const equipamentoResolvido = servico.servicoTecnico
    ? equipamento ?? (await obterOuCriarRecursoTecnicoPadrao(prisma))
    : equipamento;

  if (!equipamentoResolvido || equipamentoResolvido.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Equipamento invalido ou inativo." }, { status: 400 });
  }

  if (
    servico.servicoTecnico &&
    equipamentoResolvido.tipoRecurso !== "EQUIPAMENTO_APOIO"
  ) {
    return NextResponse.json(
      {
        message:
          "Servicos tecnicos devem usar um recurso tecnico cadastrado como EQUIPAMENTO_APOIO."
      },
      { status: 400 }
    );
  }

  if (!servico.servicoTecnico && !parsed.data.equipamentoId) {
    return NextResponse.json(
      { message: "Selecione um equipamento valido para o lancamento operacional." },
      { status: 400 }
    );
  }

  if (!colaborador || colaborador.status !== StatusCadastro.ATIVO) {
    return NextResponse.json({ message: "Colaborador invalido ou inativo." }, { status: 400 });
  }

  const horimetroInformado = servico.servicoTecnico
    ? null
    : parsed.data.horimetroInformado ?? null;
  const kmInformado = servico.servicoTecnico ? null : parsed.data.kmInformado ?? null;

  const duplicate = await prisma.lancamentoDiario.findFirst({
    where: {
      data: dataReferencia,
      clienteId: cliente.id,
      obraId: parsed.data.obraId ?? null,
      servicoId: servico.id,
      materialId: parsed.data.materialId ?? null,
      equipamentoId: equipamentoResolvido.id,
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
            empresaId: requireActiveTenantEmpresaId(),
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
          empresaId: requireActiveTenantEmpresaId(),
          fichaId: ficha.id,
          data: dataReferencia,
          clienteId: cliente.id,
          obraId: parsed.data.obraId ?? null,
          servicoId: servico.id,
          materialId: parsed.data.materialId ?? null,
          equipamentoId: equipamentoResolvido.id,
          colaboradorId: colaborador.id,
          quantidadeApontada: parsed.data.quantidadeApontada,
          unidadeApontada: parsed.data.unidadeApontada,
          quantidadeFaturada: parsed.data.quantidadeFaturada,
          unidadeFaturada: parsed.data.unidadeFaturada,
          horimetroInformado,
          kmInformado,
          observacao: parsed.data.observacao || null,
          statusValidacao,
          criadoPorId: session.user.id
        },
        include: {
          romaneios: true,
          ficha: true,
          cliente: true,
          obra: true,
          servico: true,
          material: true,
          equipamento: true,
          colaborador: true
        }
        });

      await substituirRomaneiosDoLancamento(tx, lancamento.id, parsed.data.romaneios);

      if (!servico.servicoTecnico) {
        await sincronizarLeituraPorLancamento(tx, {
          equipamentoId: equipamentoResolvido.id,
          lancamentoDiarioId: lancamento.id,
          usuarioId: session.user.id,
          dataLeitura: dataReferencia,
          horimetroInformado: horimetroInformado === null ? null : Number(horimetroInformado),
          kmInformado: kmInformado === null ? null : Number(kmInformado),
          observacao: parsed.data.observacao || null
        });
      }

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
