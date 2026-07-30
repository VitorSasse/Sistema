import { Prisma, StatusCadastro } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";
import { generateObraCode } from "@/lib/utils/code-generation";

const quickObraSchema = z.object({
  clienteId: z.string().uuid("Selecione o cliente da obra."),
  nome: z.string().trim().min(3, "Informe o nome da obra.").max(160),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  bairro: z.string().trim().max(80).optional().or(z.literal("")),
  endereco: z.string().trim().max(160).optional().or(z.literal("")),
  referencia: z.string().trim().max(120).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = quickObraSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const empresaId = requireActiveTenantEmpresaId();
  const cliente = await prisma.cliente.findFirst({
    where: { id: parsed.data.clienteId, empresaId },
    select: { id: true, status: true }
  });

  if (!cliente || !["ATIVO", "PROSPECTO"].includes(cliente.status)) {
    return NextResponse.json(
      { message: "Cliente invalido para cadastro rapido de obra." },
      { status: 400 }
    );
  }

  try {
    const codigo = await generateObraCode();
    const obra = await prisma.obra.create({
      data: {
        empresaId,
        clienteId: parsed.data.clienteId,
        codigo,
        nome: parsed.data.nome.trim(),
        localidade: parsed.data.endereco?.trim() || parsed.data.referencia?.trim() || null,
        cidade: parsed.data.cidade?.trim() || null,
        observacao: parsed.data.observacao?.trim() || parsed.data.bairro?.trim() || null,
        status: StatusCadastro.PROVISORIA,
        liberadaParaLancamento: true
      },
      include: {
        cliente: {
          select: {
            id: true,
            codigo: true,
            nome: true
          }
        }
      }
    });

    return NextResponse.json(obra, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel criar a obra provisoria por duplicidade de codigo." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel criar a obra provisoria.", detail: String(error) },
      { status: 409 }
    );
  }
}
