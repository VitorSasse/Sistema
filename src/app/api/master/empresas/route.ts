import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireMasterApi } from "@/lib/master-api";
import { empresaMasterSchema } from "@/lib/validators/master";

export async function GET() {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  return access.run(async (db) => {
    const empresas = await db.empresa.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            usuarios: true,
            clientes: true,
            obras: true,
            lancamentosDiarios: true,
            medicoes: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { nome: "asc" }]
    });

    return NextResponse.json({
      items: empresas.map((empresa) => ({
        id: empresa.id,
        nome: empresa.nome,
        nomeFantasia: empresa.nomeFantasia,
        razaoSocial: empresa.razaoSocial,
        cnpj: empresa.cnpj,
        email: empresa.email,
        telefone: empresa.telefone,
        endereco: empresa.endereco,
        cidade: empresa.cidade,
        estado: empresa.estado,
        cep: empresa.cep,
        logoUrl: empresa.logoUrl,
        corPrimaria: empresa.corPrimaria,
        status: empresa.status,
        plano: empresa.plano,
        createdAt: empresa.createdAt,
        counts: {
          usuarios: empresa._count.usuarios,
          clientes: empresa._count.clientes,
          obras: empresa._count.obras,
          lancamentos: empresa._count.lancamentosDiarios,
          medicoes: empresa._count.medicoes
        }
      }))
    });
  });
}

export async function POST(request: NextRequest) {
  const access = await requireMasterApi();

  if (!access.ok) {
    return access.response;
  }

  const payload = await request.json();
  const parsed = empresaMasterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Dados invalidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  return access.run(async (db) => {
    try {
      const empresa = await db.empresa.create({
        data: {
          nome: parsed.data.nomeFantasia,
          nomeFantasia: parsed.data.nomeFantasia,
          razaoSocial: parsed.data.razaoSocial,
          cnpj: parsed.data.cnpj,
          email: parsed.data.email,
          telefone: parsed.data.telefone,
          endereco: parsed.data.endereco,
          cidade: parsed.data.cidade,
          estado: parsed.data.estado,
          cep: parsed.data.cep,
          logoUrl: parsed.data.logoUrl,
          corPrimaria: parsed.data.corPrimaria,
          status: parsed.data.status,
          plano: parsed.data.plano
        }
      });

      return NextResponse.json({ id: empresa.id }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ message: "Ja existe empresa cadastrada com este CNPJ." }, { status: 409 });
      }

      return NextResponse.json(
        { message: "Nao foi possivel criar a empresa.", detail: String(error) },
        { status: 500 }
      );
    }
  });
}
