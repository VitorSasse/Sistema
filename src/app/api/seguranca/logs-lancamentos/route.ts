import { TipoAlteracao } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { validateApiPermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyEnd, parseDateOnlyStart } from "@/lib/utils/date";

function parseDateQuery(value: string | null, endOfDay = false) {
  if (!value?.trim()) {
    return null;
  }

  const date = endOfDay ? parseDateOnlyEnd(value) : parseDateOnlyStart(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("pt-BR");
}

export async function GET(request: NextRequest) {
  const access = await validateApiPermission("auditoria.read");

  if (!access.ok) {
    return access.response;
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("usuarioId")?.trim() ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const dataInicial = parseDateQuery(searchParams.get("dataInicial"));
  const dataFinal = parseDateQuery(searchParams.get("dataFinal"), true);
  const requestedLimit = Number(searchParams.get("limit") ?? 200);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.trunc(requestedLimit), 500))
    : 200;

  const where = {
    entidade: "lancamento_diario",
    tipoAlteracao: TipoAlteracao.EDICAO,
    usuarioId: userId || undefined,
    createdAt:
      dataInicial || dataFinal
        ? {
            ...(dataInicial ? { gte: dataInicial } : {}),
            ...(dataFinal ? { lte: dataFinal } : {})
          }
        : undefined
  };

  const historicos = await prisma.historicoAlteracao.findMany({
    where,
    include: {
      usuario: {
        select: {
          id: true,
          nome: true,
          email: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: search ? Math.max(limit * 3, 400) : limit
  });

  const lancamentoIds = [...new Set(historicos.map((item) => item.entidadeId))];

  const lancamentos = lancamentoIds.length
    ? await prisma.lancamentoDiario.findMany({
        where: {
          id: {
            in: lancamentoIds
          }
        },
        select: {
          id: true,
          data: true,
          ficha: {
            select: {
              numero: true
            }
          },
          cliente: {
            select: {
              nome: true
            }
          },
          obra: {
            select: {
              codigo: true,
              nome: true
            }
          },
          servico: {
            select: {
              tipoServico: true
            }
          },
          equipamento: {
            select: {
              placaOuTag: true,
              descricao: true
            }
          },
          colaborador: {
            select: {
              nome: true
            }
          }
        }
      })
    : [];

  const lancamentosMap = new Map(lancamentos.map((item) => [item.id, item]));

  const enrichedItems = historicos.map((item) => {
    const lancamento = lancamentosMap.get(item.entidadeId) ?? null;

    return {
      id: item.id,
      entidadeId: item.entidadeId,
      campo: item.campo,
      valorAnterior: item.valorAnterior,
      valorNovo: item.valorNovo,
      motivo: item.motivo,
      tipoAlteracao: item.tipoAlteracao,
      createdAt: item.createdAt,
      usuario: item.usuario,
      lancamento: lancamento
        ? {
            id: lancamento.id,
            data: lancamento.data,
            fichaNumero: lancamento.ficha.numero,
            clienteNome: lancamento.cliente.nome,
            obraCodigo: lancamento.obra?.codigo ?? null,
            obraNome: lancamento.obra?.nome ?? null,
            servicoNome: lancamento.servico.tipoServico,
            equipamentoTag: lancamento.equipamento.placaOuTag,
            equipamentoDescricao: lancamento.equipamento.descricao,
            colaboradorNome: lancamento.colaborador.nome
          }
        : null
    };
  });

  const filteredItems = search
    ? enrichedItems.filter((item) => {
        const searchTarget = [
          item.campo,
          item.valorAnterior,
          item.valorNovo,
          item.motivo,
          item.usuario?.nome,
          item.usuario?.email,
          item.lancamento?.fichaNumero,
          item.lancamento?.clienteNome,
          item.lancamento?.obraCodigo,
          item.lancamento?.obraNome,
          item.lancamento?.servicoNome,
          item.lancamento?.equipamentoTag,
          item.lancamento?.equipamentoDescricao,
          item.lancamento?.colaboradorNome
        ]
          .map(normalizeSearchText)
          .join(" ");

        return searchTarget.includes(normalizeSearchText(search));
      })
    : enrichedItems;

  const usuarios = await prisma.usuario.findMany({
    where: {
      historicos: {
        some: {
          entidade: "lancamento_diario",
          tipoAlteracao: TipoAlteracao.EDICAO
        }
      }
    },
    select: {
      id: true,
      nome: true,
      email: true
    },
    orderBy: [{ nome: "asc" }]
  });

  return NextResponse.json({
    items: filteredItems.slice(0, limit),
    users: usuarios
  });
}
