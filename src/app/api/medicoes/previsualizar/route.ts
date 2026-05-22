import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buscarLancamentosElegiveis,
  resumirLancamentos
} from "@/server/services/medicoes/service";
import { medicaoPreviewSchema } from "@/lib/validators/medicao";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = medicaoPreviewSchema.safeParse({
    ...payload,
    obraId: payload.obraId || null
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Filtros invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.periodoFinal < parsed.data.periodoInicial) {
    return NextResponse.json(
      { message: "O periodo final nao pode ser menor que o periodo inicial." },
      { status: 400 }
    );
  }

  try {
    const items = await buscarLancamentosElegiveis(prisma, parsed.data);
    const resumo = resumirLancamentos(items);

    return NextResponse.json({ items, resumo });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("CAPACIDADE_M3_NAO_CONFIGURADA:")
    ) {
      const tags = error.message.replace("CAPACIDADE_M3_NAO_CONFIGURADA:", "").trim();

      return NextResponse.json(
        {
          message: `Existem caminhoes sem capacidade m3 cadastrada para calcular a medicao por m3: ${tags}.`
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel gerar a pre-visualizacao da medicao." },
      { status: 500 }
    );
  }
}
