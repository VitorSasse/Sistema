import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assertUnidadesCusteioValidas,
  buildFormasCusteioNestedCreate,
  formaCusteioInclude,
  formaCusteioOrderBy,
  normalizeFormasCusteioPayload
} from "@/lib/biblioteca-recursos/formas-custeio";
import {
  nomeReferenciaTecnicaValido,
  normalizarNomeReferenciaTecnica
} from "@/lib/biblioteca-recursos/referencias-tecnicas";
import { ensureUnidadesCusteioIniciais } from "@/lib/biblioteca-recursos/unidades-custeio";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { referenciaTecnicaRecursoSchema } from "@/lib/validators/biblioteca-recursos";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const empresaId = requireActiveTenantEmpresaId();
  await ensureUnidadesCusteioIniciais(prisma, empresaId);

  const [items, unidadesCusteio] = await Promise.all([
    prisma.referenciaTecnicaRecurso.findMany({
      where: { empresaId },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      include: {
        formasCusteio: {
          include: formaCusteioInclude,
          orderBy: formaCusteioOrderBy
        },
        _count: {
          select: { equipamentos: true }
        }
      }
    }),
    prisma.unidadeCusteio.findMany({
      where: { empresaId },
      orderBy: [{ ativo: "desc" }, { rotulo: "asc" }]
    })
  ]);

  return NextResponse.json({ items, unidadesCusteio });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const parsed = referenciaTecnicaRecursoSchema.safeParse({
    ...payload,
    formasCusteio: normalizeFormasCusteioPayload(payload.formasCusteio)
  });

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
    await ensureUnidadesCusteioIniciais(prisma, empresaId);
    await assertUnidadesCusteioValidas(prisma, empresaId, parsed.data.formasCusteio);

    const created = await prisma.referenciaTecnicaRecurso.create({
      data: {
        empresaId,
        nome,
        nomeNormalizado,
        ativo: parsed.data.ativo,
        observacao: parsed.data.observacao || null,
        formasCusteio: parsed.data.formasCusteio.length
          ? { create: buildFormasCusteioNestedCreate(empresaId, parsed.data.formasCusteio) }
          : undefined
      },
      include: {
        formasCusteio: {
          include: formaCusteioInclude,
          orderBy: formaCusteioOrderBy
        },
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
