import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  calcularProximaClassificacaoPlanoConta,
  normalizarCategoriaPlanoConta
} from "@/lib/plano-contas";
import { prisma } from "@/lib/prisma";
import { planoContaSchema } from "@/lib/validators/plano-conta";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = planoContaSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nome = parsed.data.nome.trim();

  const planoAtual = await prisma.planoConta.findUnique({
    where: { id },
    select: {
      id: true,
      classificacao: true,
      tipo: true,
      categoria: true
    }
  });

  if (!planoAtual) {
    return NextResponse.json({ message: "Plano de contas nao encontrado." }, { status: 404 });
  }

  const existing = await prisma.planoConta.findFirst({
    where: {
      NOT: { id },
      nome: {
        equals: nome,
        mode: "insensitive"
      },
      tipo: parsed.data.tipo
    },
    select: { id: true }
  });

  if (existing) {
    return NextResponse.json(
      { message: "Ja existe plano de contas com este nome para o mesmo tipo." },
      { status: 409 }
    );
  }

  try {
    const tipoAlterado = planoAtual.tipo !== parsed.data.tipo;
    const categoriaAlterada =
      normalizarCategoriaPlanoConta(planoAtual.categoria) !==
      normalizarCategoriaPlanoConta(parsed.data.categoria);
    const classificacao =
      tipoAlterado || categoriaAlterada
        ? calcularProximaClassificacaoPlanoConta({
            tipo: parsed.data.tipo,
            categoria: parsed.data.categoria,
            items: await prisma.planoConta.findMany({
              select: {
                id: true,
                classificacao: true,
                tipo: true,
                categoria: true
              }
            }),
            excludeId: id
          })
        : planoAtual.classificacao;

    const updated = await prisma.planoConta.update({
      where: { id },
      data: {
        classificacao,
        nome,
        tipo: parsed.data.tipo,
        categoria: parsed.data.categoria || null,
        descricao: parsed.data.descricao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar o plano de contas.", detail: String(error) },
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
    if (mode === "delete") {
      const deleted = await prisma.planoConta.delete({
        where: { id }
      });

      return NextResponse.json(deleted);
    }

    const updated = await prisma.planoConta.update({
      where: { id },
      data: { status: "INATIVO" }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o plano de contas."
            : "Nao foi possivel inativar o plano de contas.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
