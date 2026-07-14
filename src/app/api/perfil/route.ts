import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runWithoutTenantScope } from "@/lib/tenant-store";
import { formatTelefone } from "@/lib/utils/document";
import { perfilUpdateSchema } from "@/lib/validators/perfil";
import {
  getPerfilUsuario,
  perfilUsuarioSelect,
  serializePerfilUsuario
} from "@/server/services/perfil";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const perfil = await getPerfilUsuario(session.user.id);

  if (!perfil) {
    return NextResponse.json({ message: "Usuario nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ perfil });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const parsed = perfilUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Revise os campos informados.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const fotoPerfilUrl = parsed.data.fotoPerfilUrl?.startsWith("/api/perfil/foto?v=")
      ? undefined
      : parsed.data.fotoPerfilUrl;
    const usuario = await runWithoutTenantScope(() =>
      prisma.usuario.update({
        where: { id: session.user.id },
        data: {
          nome: parsed.data.nome,
          email: parsed.data.email.toLowerCase(),
          telefone: parsed.data.telefone ? formatTelefone(parsed.data.telefone) : null,
          ...(fotoPerfilUrl !== undefined ? { fotoPerfilUrl } : {})
        },
        select: perfilUsuarioSelect
      })
    );

    return NextResponse.json({
      message: "Perfil atualizado com sucesso.",
      perfil: serializePerfilUsuario(usuario)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Ja existe outro usuario cadastrado com este e-mail." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar o perfil.", detail: String(error) },
      { status: 500 }
    );
  }
}
