import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateColaboradorCode } from "@/lib/utils/code-generation";
import { formatCpf } from "@/lib/utils/cpf";
import { parseOptionalDateOnlyStart } from "@/lib/utils/date";
import { formatTelefone } from "@/lib/utils/document";
import { colaboradorSchema } from "@/lib/validators/colaborador";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const items = await prisma.colaborador.findMany({
    orderBy: [{ nome: "asc" }]
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = colaboradorSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const codigo = await generateColaboradorCode();
    const colaborador = await prisma.colaborador.create({
      data: {
        codigo,
        nome: parsed.data.nome,
        apelido: parsed.data.apelido || null,
        funcao: parsed.data.funcao,
        documento: parsed.data.documento ? formatCpf(parsed.data.documento) : null,
        telefone: formatTelefone(parsed.data.telefone) || null,
        dataAdmissao: parseOptionalDateOnlyStart(parsed.data.dataAdmissao),
        dataSaida: parseOptionalDateOnlyStart(parsed.data.dataSaida),
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      }
    });

    return NextResponse.json(colaborador, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Nao foi possivel criar o colaborador.", detail: String(error) },
      { status: 409 }
    );
  }
}
