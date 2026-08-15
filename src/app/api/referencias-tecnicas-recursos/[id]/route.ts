import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  nomeReferenciaTecnicaValido,
  normalizarNomeReferenciaTecnica
} from "@/lib/biblioteca-recursos/referencias-tecnicas";
import { prisma } from "@/lib/prisma";
import { referenciaTecnicaRecursoSchema } from "@/lib/validators/biblioteca-recursos";

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
  const parsed = referenciaTecnicaRecursoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nome = nomeReferenciaTecnicaValido(parsed.data.nome);
  const nomeNormalizado = normalizarNomeReferenciaTecnica(nome);

  try {
    const updated = await prisma.referenciaTecnicaRecurso.update({
      where: { id },
      data: {
        nome,
        nomeNormalizado,
        ativo: parsed.data.ativo,
        observacao: parsed.data.observacao || null
      },
      include: {
        _count: {
          select: { equipamentos: true }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar a referencia tecnica.", detail: String(error) },
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
      const deleted = await prisma.referenciaTecnicaRecurso.delete({
        where: { id }
      });

      return NextResponse.json(deleted);
    }

    const updated = await prisma.referenciaTecnicaRecurso.update({
      where: { id },
      data: { ativo: false }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir a referencia tecnica. Verifique se ela possui vinculos."
            : "Nao foi possivel inativar a referencia tecnica.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
