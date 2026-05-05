import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMaterialCode } from "@/lib/utils/code-generation";
import { materialSchema } from "@/lib/validators/material";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.material.findMany({
    orderBy: [{ descricao: "asc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

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
    const codigoMaterial = await generateMaterialCode();
    const material = await prisma.material.create({
      data: {
        codigoMaterial,
        descricao: parsed.data.descricao,
        categoria: parsed.data.categoria || null,
        unidadePadrao: parsed.data.unidadePadrao,
        densidade: parsed.data.densidade ?? null,
        origemMaterial: parsed.data.origemMaterial || null,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o material.", detail: String(error) },
      { status: 409 }
    );
  }
}
