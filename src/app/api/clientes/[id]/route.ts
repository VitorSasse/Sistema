import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatCep,
  formatCnpjDocument,
  formatCpfDocument,
  formatTelefone,
  normalizeDocument
} from "@/lib/utils/document";
import { clienteSchema } from "@/lib/validators/cliente";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function countClienteDependencies(clienteId: string) {
  const [
    obras,
    fichas,
    precos,
    lancamentosAtivos,
    lancamentosExcluidos,
    medicoesAtivas,
    medicoesExcluidas
  ] = await prisma.$transaction([
    prisma.obra.count({ where: { clienteId } }),
    prisma.ficha.count({ where: { clienteId } }),
    prisma.precoClienteObra.count({ where: { clienteId } }),
    prisma.lancamentoDiario.count({ where: { clienteId, deletedAt: null } }),
    prisma.lancamentoDiario.count({ where: { clienteId, deletedAt: { not: null } } }),
    prisma.medicao.count({ where: { clienteId, deletedAt: null } }),
    prisma.medicao.count({ where: { clienteId, deletedAt: { not: null } } })
  ]);

  return {
    obras,
    fichas,
    precos,
    lancamentosAtivos,
    lancamentosExcluidos,
    medicoesAtivas,
    medicoesExcluidas
  };
}

function buildClienteDependencyMessage(
  dependencies: Awaited<ReturnType<typeof countClienteDependencies>>
) {
  const entries: string[] = [];

  if (dependencies.obras > 0) {
    entries.push(`${dependencies.obras} obra(s)`);
  }

  if (dependencies.fichas > 0) {
    entries.push(`${dependencies.fichas} ficha(s)`);
  }

  if (dependencies.precos > 0) {
    entries.push(`${dependencies.precos} preco(s)`);
  }

  if (dependencies.lancamentosAtivos > 0) {
    entries.push(`${dependencies.lancamentosAtivos} lancamento(s) ativo(s)`);
  }

  if (dependencies.lancamentosExcluidos > 0) {
    entries.push(
      `${dependencies.lancamentosExcluidos} lancamento(s) excluido(s) logicamente`
    );
  }

  if (dependencies.medicoesAtivas > 0) {
    entries.push(`${dependencies.medicoesAtivas} medicao(oes) ativa(s)`);
  }

  if (dependencies.medicoesExcluidas > 0) {
    entries.push(
      `${dependencies.medicoesExcluidas} medicao(oes) excluida(s) logicamente`
    );
  }

  return entries;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json();
  const parsed = clienteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const cpfDigits = parsed.data.tipoCliente === "CPF" ? normalizeDocument(parsed.data.cpf || "") : "";
  const cnpjDigits = parsed.data.tipoCliente === "CNPJ" ? normalizeDocument(parsed.data.cnpj || "") : "";
  const cpf = cpfDigits ? formatCpfDocument(cpfDigits) : null;
  const cnpj = cnpjDigits ? formatCnpjDocument(cnpjDigits) : null;
  const telefone = formatTelefone(parsed.data.telefone) || null;
  const cep = formatCep(parsed.data.cep) || null;

  if (cpf) {
    const existingCpf = await prisma.cliente.findFirst({
      where: {
        OR: [{ cpf }, { cpf: cpfDigits }],
        NOT: { id }
      },
      select: { id: true }
    });

    if (existingCpf) {
      return NextResponse.json({ message: "Ja existe cliente cadastrado com este CPF." }, { status: 409 });
    }
  }

  if (cnpj) {
    const existingCnpj = await prisma.cliente.findFirst({
      where: {
        OR: [{ cnpj }, { cnpj: cnpjDigits }],
        NOT: { id }
      },
      select: { id: true }
    });

    if (existingCnpj) {
      return NextResponse.json({ message: "Ja existe cliente cadastrado com este CNPJ." }, { status: 409 });
    }
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        tipoCliente: parsed.data.tipoCliente,
        nome: parsed.data.nome,
        nomeFantasia: parsed.data.nomeFantasia || null,
        cpf,
        cnpj,
        inscricaoEstadual: parsed.data.inscricaoEstadual || null,
        contatoNome: parsed.data.contatoNome || null,
        telefone,
        email: parsed.data.email || null,
        enderecoLinha1: parsed.data.enderecoLinha1 || null,
        enderecoNumero: parsed.data.enderecoNumero || null,
        enderecoLinha2: parsed.data.enderecoLinha2 || null,
        bairro: parsed.data.bairro || null,
        cidade: parsed.data.cidade || null,
        uf: parsed.data.uf || null,
        cep,
        observacao: parsed.data.observacao || null,
        status: parsed.data.status
      },
      include: {
        obras: {
          select: {
            id: true,
            codigo: true,
            nome: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json(cliente);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Nao foi possivel atualizar o cliente por duplicidade de identificador." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel atualizar o cliente.", detail: String(error) },
      { status: 409 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const mode = request.nextUrl.searchParams.get("mode");

  try {
    if (mode === "delete") {
      const clienteExistente = await prisma.cliente.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!clienteExistente) {
        return NextResponse.json({ message: "Cliente nao encontrado." }, { status: 404 });
      }

      const dependencies = await countClienteDependencies(id);
      const dependencyLabels = buildClienteDependencyMessage(dependencies);

      if (dependencyLabels.length > 0) {
        return NextResponse.json(
          {
            message: `Nao foi possivel excluir o cliente. Vinculos encontrados: ${dependencyLabels.join(", ")}.`,
            dependencies
          },
          { status: 409 }
        );
      }

      const cliente = await prisma.cliente.delete({
        where: { id }
      });

      return NextResponse.json(cliente);
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { status: "INATIVO" }
    });

    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          mode === "delete"
            ? "Nao foi possivel excluir o cliente. Verifique se ele possui vinculos."
            : "Nao foi possivel inativar o cliente.",
        detail: String(error)
      },
      { status: 409 }
    );
  }
}
