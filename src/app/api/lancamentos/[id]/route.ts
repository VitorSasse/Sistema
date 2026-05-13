import { NextRequest, NextResponse } from "next/server";
import { StatusCadastro, StatusLancamento, TipoAlteracao } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { lancamentoSchema } from "@/lib/validators/lancamento";
import {
  recalcularAcumuladoEquipamento,
  removerLeituraPorCancelamento,
  sincronizarLeituraPorLancamento
} from "@/server/services/frota/leitura-sync";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function parseNullableNumber(value: unknown) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const motivoAlteracao = String(payload.motivoAlteracao ?? "").trim();

  if (!motivoAlteracao) {
    return NextResponse.json({ message: "Motivo da alteracao e obrigatorio." }, { status: 400 });
  }

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

  const existing = await prisma.lancamentoDiario.findUnique({
    where: { id },
    include: { ficha: true }
  });

  if (!existing || existing.deletedAt) {
    return NextResponse.json({ message: "Lancamento nao encontrado." }, { status: 404 });
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
      id: { not: id },
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
      {
        message:
          "Ja existe um lancamento identico para esta ficha, cliente, obra e composicao informada."
      },
      { status: 409 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const fichaAtualizada =
        existing.ficha.numero !== parsed.data.fichaNumero ||
        existing.ficha.data.getTime() !== dataReferencia.getTime() ||
        existing.ficha.clienteId !== cliente.id ||
        (existing.ficha.obraId ?? null) !== (parsed.data.obraId ?? null)
          ? await (async () => {
              const fichaExistente = await tx.ficha.findFirst({
                where: {
                  numero: parsed.data.fichaNumero,
                  data: dataReferencia,
                  clienteId: cliente.id,
                  obraId: parsed.data.obraId ?? null
                }
              });

              if (fichaExistente) {
                return tx.ficha.update({
                  where: { id: fichaExistente.id },
                  data: {
                    observacao: parsed.data.fichaObservacao || null
                  }
                });
              }

              return tx.ficha.create({
                data: {
                  numero: parsed.data.fichaNumero,
                  data: dataReferencia,
                  clienteId: cliente.id,
                  obraId: parsed.data.obraId ?? null,
                  observacao: parsed.data.fichaObservacao || null,
                  criadoPorId: session.user.id
                }
              });
            })()
          : await tx.ficha.update({
              where: { id: existing.fichaId },
              data: {
                clienteId: cliente.id,
                obraId: parsed.data.obraId ?? null,
                observacao: parsed.data.fichaObservacao || null
              }
            });

      const possuiMedicaoAtiva = await tx.medicaoItem.count({
        where: {
          lancamentoId: id,
          deletedAt: null,
          medicao: {
            deletedAt: null
          }
        }
      });

      const nextStatus =
        possuiMedicaoAtiva > 0 || existing.statusValidacao === StatusLancamento.MEDIDO
          ? StatusLancamento.MEDIDO
          : parsed.data.obraId
            ? StatusLancamento.NAO_MEDIDO
            : StatusLancamento.PENDENTE_OBRA;

      const updatedLancamento = await tx.lancamentoDiario.update({
        where: { id },
        data: {
          fichaId: fichaAtualizada.id,
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
          statusValidacao: nextStatus,
          atualizadoPorId: session.user.id
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

      const medicaoItensAtivos = await tx.medicaoItem.findMany({
        where: {
          lancamentoId: id,
          deletedAt: null,
          medicao: {
            deletedAt: null
          }
        },
        select: {
          id: true,
          medicaoId: true,
          valorUnitario: true
        }
      });

      if (medicaoItensAtivos.length > 0) {
        for (const medicaoItem of medicaoItensAtivos) {
          const valorTotalItem =
            Number(parsed.data.quantidadeFaturada) * Number(medicaoItem.valorUnitario);

          await tx.medicaoItem.update({
            where: { id: medicaoItem.id },
            data: {
              data: dataReferencia,
              ficha: fichaAtualizada.numero,
              placaOuTag: equipamento.placaOuTag,
              tipoServico: servico.tipoServico,
              material: material?.descricao ?? null,
              unidadeFaturada: parsed.data.unidadeFaturada,
              quantidadeFaturada: parsed.data.quantidadeFaturada,
              valorTotalItem
            }
          });
        }

        const medicaoIdsAfetadas = [...new Set(medicaoItensAtivos.map((item) => item.medicaoId))];

        for (const medicaoId of medicaoIdsAfetadas) {
          const itensDaMedicao = await tx.medicaoItem.findMany({
            where: {
              medicaoId,
              deletedAt: null
            },
            select: {
              valorTotalItem: true
            }
          });

          const valorTotalMedicao = itensDaMedicao.reduce(
            (acc, item) => acc + Number(item.valorTotalItem),
            0
          );

          await tx.medicao.update({
            where: { id: medicaoId },
            data: {
              valorTotal: valorTotalMedicao
            }
          });
        }
      }

      await sincronizarLeituraPorLancamento(tx, {
        equipamentoId: equipamento.id,
        lancamentoDiarioId: id,
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

      if (existing.equipamentoId !== equipamento.id) {
        await recalcularAcumuladoEquipamento(tx, existing.equipamentoId);
      }

      const changes = [
        ["data", existing.data, dataReferencia],
        ["fichaNumero", existing.ficha.numero, parsed.data.fichaNumero],
        ["clienteId", existing.clienteId, cliente.id],
        ["obraId", existing.obraId, parsed.data.obraId ?? null],
        ["servicoId", existing.servicoId, servico.id],
        ["materialId", existing.materialId, parsed.data.materialId ?? null],
        ["equipamentoId", existing.equipamentoId, equipamento.id],
        ["colaboradorId", existing.colaboradorId, colaborador.id],
        ["quantidadeApontada", existing.quantidadeApontada, parsed.data.quantidadeApontada],
        ["unidadeApontada", existing.unidadeApontada, parsed.data.unidadeApontada],
        ["quantidadeFaturada", existing.quantidadeFaturada, parsed.data.quantidadeFaturada],
        ["unidadeFaturada", existing.unidadeFaturada, parsed.data.unidadeFaturada],
        ["horimetroInformado", existing.horimetroInformado, parsed.data.horimetroInformado ?? null],
        ["kmInformado", existing.kmInformado, parsed.data.kmInformado ?? null],
        ["observacao", existing.observacao, parsed.data.observacao || null],
        ["statusValidacao", existing.statusValidacao, nextStatus]
      ] as const;

      for (const [campo, anterior, novo] of changes) {
        const valorAnterior = normalizeValue(anterior);
        const valorNovo = normalizeValue(novo);

        if (valorAnterior !== valorNovo) {
          await tx.historicoAlteracao.create({
            data: {
              entidade: "lancamento_diario",
              entidadeId: id,
              campo,
              valorAnterior,
              valorNovo,
              motivo: motivoAlteracao,
              tipoAlteracao: TipoAlteracao.EDICAO,
              usuarioId: session.user.id
            }
          });
        }
      }

      if (fichaAtualizada.id !== existing.fichaId) {
        const remainingFichaItems = await tx.lancamentoDiario.count({
          where: { fichaId: existing.fichaId }
        });

        if (remainingFichaItems === 0) {
          await tx.ficha.delete({
            where: { id: existing.fichaId }
          });
        }
      }

      return updatedLancamento;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel atualizar o lancamento." },
      { status: 409 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const mode = request.nextUrl.searchParams.get("mode");

  try {
    const existing = await prisma.lancamentoDiario.findUnique({
      where: { id },
      include: {
        medicaoItens: {
          where: {
            deletedAt: null
          },
          select: {
            id: true,
            medicaoId: true,
            medicao: {
              select: {
                id: true,
                tipoMedicao: true,
                deletedAt: true
              }
            }
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ message: "Lancamento nao encontrado." }, { status: 404 });
    }

    if (mode === "delete") {
      const activeMedicoes = existing.medicaoItens.filter(
        (item) => item.medicao && item.medicao.deletedAt === null
      );

      if (activeMedicoes.some((item) => item.medicao?.tipoMedicao === "MENSAL")) {
        return NextResponse.json(
          { message: "Nao e possivel excluir um lancamento vinculado a medicao mensal." },
          { status: 409 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        if (existing.medicaoItens.length > 0) {
          const medicaoIdsAfetadas = [...new Set(existing.medicaoItens.map((item) => item.medicaoId))];

          await tx.medicaoItem.deleteMany({
            where: { lancamentoId: id }
          });

          for (const medicaoId of medicaoIdsAfetadas) {
            const remainingMedicaoItems = await tx.medicaoItem.count({
              where: {
                medicaoId,
                deletedAt: null
              }
            });

            if (remainingMedicaoItems === 0) {
              await tx.medicao.updateMany({
                where: {
                  id: medicaoId,
                  deletedAt: null
                },
                data: {
                  deletedAt: new Date()
                }
              });
            }
          }
        }

        await tx.historicoAlteracao.deleteMany({
          where: {
            entidade: "lancamento_diario",
            entidadeId: id
          }
        });

        await tx.leituraEquipamento.deleteMany({
          where: { lancamentoDiarioId: id }
        });

        const deleted = await tx.lancamentoDiario.delete({
          where: { id }
        });

        const remainingFichaItems = await tx.lancamentoDiario.count({
          where: { fichaId: existing.fichaId }
        });

        if (remainingFichaItems === 0) {
          await tx.ficha.delete({
            where: { id: existing.fichaId }
          });
        }

        await recalcularAcumuladoEquipamento(tx, existing.equipamentoId);

        return deleted;
      });

      return NextResponse.json(result);
    }

    const lancamento = await prisma.$transaction(async (tx) => {
      const updated = await tx.lancamentoDiario.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          atualizadoPorId: session.user.id,
          statusValidacao: "CANCELADO"
        }
      });

      await removerLeituraPorCancelamento(tx, existing.equipamentoId, id);

      return updated;
    });

    return NextResponse.json(lancamento);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o lancamento."
            : "Nao foi possivel cancelar o lancamento.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
