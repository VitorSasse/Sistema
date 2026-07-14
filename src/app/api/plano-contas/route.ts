import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calcularProximaClassificacaoPlanoConta } from "@/lib/plano-contas";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { planoContaSchema } from "@/lib/validators/plano-conta";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.planoConta.findMany({
    orderBy: [{ classificacao: "asc" }, { nome: "asc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = planoContaSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nome = parsed.data.nome.trim();

  const existing = await prisma.planoConta.findFirst({
    where: {
      OR: [
        {
          nome: {
            equals: nome,
            mode: "insensitive"
          },
          tipo: parsed.data.tipo
        }
      ]
    },
    select: { id: true, classificacao: true, nome: true }
  });

  if (existing) {
    return NextResponse.json(
      { message: "Ja existe plano de contas com este nome para o mesmo tipo." },
      { status: 409 }
    );
  }

  try {
    const existentes = await prisma.planoConta.findMany({
      select: {
        id: true,
        classificacao: true,
        tipo: true,
        categoria: true
      }
    });
    const classificacao = calcularProximaClassificacaoPlanoConta({
      tipo: parsed.data.tipo,
      categoria: parsed.data.categoria,
      items: existentes
    });
    const created = await prisma.planoConta.create({
      data: {
        empresaId: requireActiveTenantEmpresaId(),
        classificacao,
        nome,
        tipo: parsed.data.tipo,
        categoria: parsed.data.categoria || null,
        descricao: parsed.data.descricao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o plano de contas.", detail: String(error) },
      { status: 409 }
    );
  }
}
