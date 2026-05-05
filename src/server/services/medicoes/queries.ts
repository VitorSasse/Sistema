import { Prisma } from "@prisma/client";

export const medicaoListInclude = {
  cliente: {
    select: {
      id: true,
      codigo: true,
      nome: true
    }
  },
  obra: {
    select: {
      id: true,
      codigo: true,
      nome: true
    }
  },
  itens: {
    where: {
      deletedAt: null
    },
    select: {
      id: true,
      quantidadeFaturada: true,
      unidadeFaturada: true,
      valorUnitario: true,
      valorTotalItem: true
    }
  },
  anexos: {
    select: {
      id: true,
      tipo: true,
      nomeArquivo: true,
      urlArquivo: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "desc" }]
  }
} satisfies Prisma.MedicaoInclude;

export const medicaoDetailInclude = {
  cliente: {
    select: {
      id: true,
      codigo: true,
      nome: true,
      tipoCliente: true,
      cpf: true,
      cnpj: true,
      telefone: true,
      email: true,
      cidade: true,
      uf: true
    }
  },
  obra: {
    select: {
      id: true,
      codigo: true,
      nome: true,
      cidade: true,
      uf: true,
      localidade: true
    }
  },
  itens: {
    where: {
      deletedAt: null
    },
    include: {
      lancamento: {
        include: {
          ficha: true
        }
      }
    },
    orderBy: [{ data: "asc" }, { createdAt: "asc" }]
  },
  anexos: {
    orderBy: [{ createdAt: "desc" }]
  }
} satisfies Prisma.MedicaoInclude;

export const medicaoTransitionInclude = {
  anexos: {
    select: { tipo: true }
  }
} satisfies Prisma.MedicaoInclude;
