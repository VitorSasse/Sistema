import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withUnscopedPrisma } from "@/lib/prisma";
import { listarEmpresasUsuario, USUARIO_EMPRESA_COOKIE } from "@/lib/usuario-empresa";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  if (session.user.isMaster) {
    return NextResponse.json({ items: [], empresaId: session.user.empresaSelecionadaId });
  }

  const acessos = await withUnscopedPrisma((db) => listarEmpresasUsuario(db, session.user.id));

  return NextResponse.json({
    empresaId: session.user.empresaId,
    items: acessos.map((acesso) => ({
      empresaId: acesso.empresaId,
      nome: acesso.nome,
      nomeFantasia: acesso.nomeFantasia,
      razaoSocial: acesso.razaoSocial,
      roleEmpresa: acesso.roleEmpresa,
      padrao: acesso.padrao
    }))
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  if (session.user.isMaster) {
    return NextResponse.json({ message: "Use o seletor do Painel da Plataforma para trocar o escopo." }, { status: 400 });
  }

  const payload = (await request.json()) as { empresaId?: string | null };
  const empresaId = payload.empresaId?.trim();

  if (!empresaId) {
    return NextResponse.json({ message: "Selecione uma empresa." }, { status: 400 });
  }

  const acessos = await withUnscopedPrisma((db) => listarEmpresasUsuario(db, session.user.id));
  const acesso = acessos.find((item) => item.empresaId === empresaId);

  if (!acesso) {
    return NextResponse.json({ message: "Usuario sem acesso a esta empresa." }, { status: 403 });
  }

  const response = NextResponse.json({
    empresaId,
    message: "Empresa ativa atualizada."
  });

  response.cookies.set(USUARIO_EMPRESA_COOKIE, empresaId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
