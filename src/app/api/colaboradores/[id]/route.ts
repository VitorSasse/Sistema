import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeCpf } from "@/lib/utils/cpf";
import { colaboradorSchema } from "@/lib/validators/colaborador";

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
  const parsed = colaboradorSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        apelido: parsed.data.apelido || null,
        funcao: parsed.data.funcao,
        documento: parsed.data.documento ? sanitizeCpf(parsed.data.documento) : null,
        telefone: parsed.data.telefone || null,
        dataAdmissao: parsed.data.dataAdmissao ? new Date(parsed.data.dataAdmissao) : null,
        dataSaida: parsed.data.dataSaida ? new Date(parsed.data.dataSaida) : null,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(colaborador);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar o colaborador.", detail: String(error) },
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
      const colaborador = await prisma.colaborador.delete({
        where: { id }
      });

      return NextResponse.json(colaborador);
    }

    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: {
        status: "INATIVO",
        dataSaida: new Date()
      }
    });

    return NextResponse.json(colaborador);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o colaborador. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o colaborador.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
