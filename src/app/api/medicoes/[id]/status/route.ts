import { StatusMedicao } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { atualizarStatusMedicao } from "@/server/services/medicoes/service";
import { medicaoStatusSchema } from "@/lib/validators/medicao";

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
  const parsed = medicaoStatusSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Status de medicao invalido.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nextStatus = parsed.data.status as StatusMedicao;
  try {
    const updated = await atualizarStatusMedicao(prisma, {
      id,
      status: nextStatus,
      userId: session.user.id
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (!(error instanceof Error)) {
      return NextResponse.json({ message: "Nao foi possivel atualizar o status." }, { status: 500 });
    }

    const errors: Record<string, { status: number; message: string }> = {
      MEDICAO_NAO_ENCONTRADA: {
        status: 404,
        message: "Medicao nao encontrada."
      },
      TRANSICAO_INVALIDA: {
        status: 400,
        message: "A transicao de status nao e permitida para o estado atual da medicao."
      }
    };

    const handled = errors[error.message];

    if (handled) {
      return NextResponse.json({ message: handled.message }, { status: handled.status });
    }

    return NextResponse.json({ message: "Nao foi possivel atualizar o status." }, { status: 500 });
  }
}
