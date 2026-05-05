import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servicoSchema } from "@/lib/validators/servico";

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
  const parsed = servicoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const servico = await prisma.servico.update({
      where: { id },
      data: {
        tipoServico: parsed.data.tipoServico,
        categoria: parsed.data.categoria || null,
        formaMedicao: parsed.data.formaMedicao,
        unidadeApontamento: parsed.data.unidadeApontamento || null,
        unidadeFaturamento: parsed.data.unidadeFaturamento,
        exigeMaterial: parsed.data.exigeMaterial,
        ativoParaMedicao: parsed.data.ativoParaMedicao,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(servico);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar o servico.", detail: String(error) },
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
      const servico = await prisma.servico.delete({
        where: { id }
      });

      return NextResponse.json(servico);
    }

    const servico = await prisma.servico.update({
      where: { id },
      data: {
        status: "INATIVO",
        ativoParaMedicao: false
      }
    });

    return NextResponse.json(servico);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o servico. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o servico.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
