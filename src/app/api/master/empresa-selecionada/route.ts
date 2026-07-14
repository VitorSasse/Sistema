import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MASTER_EMPRESA_COOKIE } from "@/lib/master-empresa-cookie";
import { requireMasterApi } from "@/lib/master-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  return access.run(async () => {
    const cookieStore = await cookies();
    return NextResponse.json({ empresaId: cookieStore.get(MASTER_EMPRESA_COOKIE)?.value ?? null });
  });
}

export async function POST(request: NextRequest) {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  const payload = (await request.json()) as { empresaId?: string | null };
  const empresaId = payload.empresaId?.trim() || null;

  if (!empresaId) {
    return NextResponse.json(
      { message: "Selecione uma empresa para acessar as telas operacionais." },
      { status: 400 }
    );
  }

  return access.run(async () => {
    const empresa = await prisma.empresa.findFirst({
      where: { id: empresaId, status: "ATIVO", deletedAt: null },
      select: { id: true }
    });

    if (!empresa) {
      return NextResponse.json({ message: "Empresa ativa nao encontrada." }, { status: 404 });
    }

    const response = NextResponse.json({
      empresaId,
      message: "Empresa selecionada para visualizacao operacional."
    });

    response.cookies.set(MASTER_EMPRESA_COOKIE, empresaId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  });
}
