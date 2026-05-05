import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { materialSchema } from "@/lib/validators/material";

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
  const normalizedPayload = {
    ...payload,
    densidade: payload.densidade === "" || payload.densidade === undefined ? null : Number(payload.densidade)
  };
  const parsed = materialSchema.safeParse(normalizedPayload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const material = await prisma.material.update({
      where: { id },
      data: {
        descricao: parsed.data.descricao,
        categoria: parsed.data.categoria || null,
        unidadePadrao: parsed.data.unidadePadrao,
        densidade: parsed.data.densidade ?? null,
        origemMaterial: parsed.data.origemMaterial || null,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel atualizar o material.", detail: String(error) },
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
      const material = await prisma.material.delete({
        where: { id }
      });

      return NextResponse.json(material);
    }

    const material = await prisma.material.update({
      where: { id },
      data: { status: "INATIVO" }
    });

    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o material. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o material.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
