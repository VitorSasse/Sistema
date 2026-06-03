import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { generateServicoCode } from "@/lib/utils/code-generation";
import { servicoSchema } from "@/lib/validators/servico";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.servico.findMany({
    orderBy: [{ tipoServico: "asc" }]
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
    valorFechadoPadrao:
      payload.valorFechadoPadrao === "" || payload.valorFechadoPadrao === undefined
        ? null
        : parseDecimalInput(payload.valorFechadoPadrao)
  };
  const parsed = servicoSchema.safeParse(normalizedPayload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const codigo = await generateServicoCode();
    const servico = await prisma.servico.create({
      data: {
        codigo,
        tipoServico: parsed.data.tipoServico,
        categoria: parsed.data.categoria || null,
        servicoTecnico: parsed.data.servicoTecnico,
        faturamentoFechado: parsed.data.faturamentoFechado,
        valorFechadoPadrao: parsed.data.faturamentoFechado
          ? parsed.data.valorFechadoPadrao
          : null,
        formaMedicao: parsed.data.formaMedicao,
        unidadeApontamento: parsed.data.faturamentoFechado
          ? "SERVICO"
          : parsed.data.unidadeApontamento || null,
        unidadeFaturamento: parsed.data.faturamentoFechado
          ? "SERVICO"
          : parsed.data.unidadeFaturamento,
        exigeMaterial: parsed.data.exigeMaterial,
        ativoParaMedicao: parsed.data.ativoParaMedicao,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(servico, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o servico.", detail: String(error) },
      { status: 409 }
    );
  }
}
