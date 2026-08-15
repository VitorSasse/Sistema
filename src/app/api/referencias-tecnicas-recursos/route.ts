import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  nomeReferenciaTecnicaValido,
  normalizarNomeReferenciaTecnica
} from "@/lib/biblioteca-recursos/referencias-tecnicas";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { referenciaTecnicaRecursoSchema } from "@/lib/validators/biblioteca-recursos";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.referenciaTecnicaRecurso.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: {
      _count: {
        select: { equipamentos: true }
      }
    }
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = referenciaTecnicaRecursoSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const empresaId = requireActiveTenantEmpresaId();
  const nome = nomeReferenciaTecnicaValido(parsed.data.nome);
  const nomeNormalizado = normalizarNomeReferenciaTecnica(nome);

  try {
    const created = await prisma.referenciaTecnicaRecurso.create({
      data: {
        empresaId,
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Ja existe referencia tecnica cadastrada com este nome.", detail: String(error) },
      { status: 409 }
    );
  }
}
