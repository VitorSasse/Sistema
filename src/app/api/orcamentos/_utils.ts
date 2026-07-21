import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { ZodError, ZodIssue } from "zod";

const errorMap: Record<string, { message: string; status: number }> = {
  CLIENTE_NAO_ENCONTRADO: {
    message: "Cliente nao encontrado.",
    status: 404
  },
  OBRA_NAO_ENCONTRADA: {
    message: "Obra nao encontrada.",
    status: 404
  },
  OBRA_NAO_PERTENCE_AO_CLIENTE: {
    message: "A obra selecionada nao pertence ao cliente informado.",
    status: 409
  },
  RESPONSAVEL_NAO_ENCONTRADO: {
    message: "Responsavel nao encontrado.",
    status: 404
  },
  SERVICO_NAO_ENCONTRADO: {
    message: "Um dos servicos informados nao foi encontrado.",
    status: 404
  },
  MATERIAL_NAO_ENCONTRADO: {
    message: "Um dos materiais informados nao foi encontrado.",
    status: 404
  },
  EQUIPAMENTO_NAO_ENCONTRADO: {
    message: "Um dos equipamentos informados nao foi encontrado.",
    status: 404
  },
  FRENTE_NAO_ENCONTRADA: {
    message: "Um item esta vinculado a uma frente nao encontrada.",
    status: 400
  },
  DATA_ORCAMENTO_INVALIDA: {
    message: "Informe uma data valida para o orcamento.",
    status: 400
  },
  ORCAMENTO_NAO_ENCONTRADO: {
    message: "Orcamento nao encontrado.",
    status: 404
  },
  CODIGO_ORCAMENTO_DUPLICADO: {
    message: "Ja existe outro orcamento com este codigo.",
    status: 409
  },
  ORCAMENTO_ARQUIVADO: {
    message: "Orcamento arquivado nao pode ser evoluido.",
    status: 409
  },
  TRANSICAO_STATUS_INVALIDA: {
    message: "Transicao de status invalida para o fluxo do orcamento.",
    status: 409
  },
  TRANSICAO_STATUS_APROVACAO_EXIGE_EMISSAO: {
    message: "Para aprovar este orcamento, altere primeiro o status para Emitida.",
    status: 409
  }
};

export const orcamentoTransactionOptions = {
  maxWait: 10000,
  timeout: 20000
} as const;

function formatIssuePath(issue: ZodIssue) {
  if (issue.path.length === 0) {
    return "formulario";
  }

  return issue.path
    .map((segment) =>
      typeof segment === "number" ? `[${segment + 1}]` : String(segment)
    )
    .join(".")
    .replaceAll(".[", "[");
}

export function buildOrcamentoValidationErrorResponse(error: ZodError) {
  const validationErrors = error.issues.map((issue) => ({
    campo: formatIssuePath(issue),
    mensagem: issue.message,
    codigo: issue.code
  }));

  return NextResponse.json(
    {
      message: "Dados invalidos.",
      validationErrors,
      issues: error.flatten()
    },
    { status: 400 }
  );
}

export function handleOrcamentoApiError(error: unknown) {
  if (error instanceof Error) {
    const mapped = errorMap[error.message];

    if (mapped) {
      return NextResponse.json({ message: mapped.message }, { status: mapped.status });
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
      const isCodigoOrcamento = fields.some((field) =>
        field.toLocaleLowerCase("pt-BR").includes("codigo")
      );

      return NextResponse.json(
        {
          message: isCodigoOrcamento
            ? "Ja existe outro orcamento com este codigo."
            : "Existe outro registro com os mesmos dados unicos neste orcamento.",
          detail: String(error)
        },
        { status: 409 }
      );
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        { message: "Existe referencia invalida no orcamento informado." },
        { status: 409 }
      );
    }

    if (error.code === "P2024") {
      return NextResponse.json(
        {
          message:
            "O banco demorou para liberar conexao. Tente novamente em alguns segundos.",
          detail: String(error)
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    { message: "Nao foi possivel processar o orcamento.", detail: String(error) },
    { status: 500 }
  );
}
