import { OrigemExecucao, StatusExecucao } from "@prisma/client";
import { z } from "zod";
import { parseOptionalDateOnlyStart } from "@/lib/utils/date";
import { parseDecimalInput } from "@/lib/utils/decimal-input";

function optionalUuid() {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().uuid().nullable().optional()
  );
}

function numeroDecimal(max = 999999999) {
  return z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return 0;
      }

      return parseDecimalInput(value);
    },
    z.number().finite().min(0).max(max)
  );
}

function numeroDecimalOpcional(max = 999999999) {
  return z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      return parseDecimalInput(value);
    },
    z.number().finite().min(0).max(max).nullable().optional()
  );
}

function optionalDateOnly() {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? parseOptionalDateOnlyStart(value) : value || null),
    z.date().nullable().optional()
  );
}

const snapshotTecnicoEconomicoSchema = z.record(z.string(), z.unknown()).refine(
  (value) => Object.keys(value).length > 0,
  "Informe o snapshot tecnico e economico do recurso."
);

export const recursoRealizadoSchema = z.object({
  id: z.string().uuid().optional(),
  recursoId: optionalUuid(),
  nomeSnapshot: z.string().trim().min(2).max(180),
  quantidadeRealizada: numeroDecimal(999999999),
  unidadeRealizada: z.string().trim().min(1).max(40),
  quantidadeRecursos: numeroDecimal(999999999).optional().nullable(),
  snapshotTecnicoEconomico: snapshotTecnicoEconomicoSchema
});

export const frenteExecutadaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().max(160).optional().or(z.literal("")),
  descricao: z.string().trim().max(700).optional().or(z.literal("")),
  unidade: z.string().trim().max(40).optional().or(z.literal("")),
  quantidadeExecutada: numeroDecimalOpcional(999999999),
  receitaRealizada: numeroDecimalOpcional(999999999),
  recursos: z.array(recursoRealizadoSchema).default([])
}).superRefine((frente, ctx) => {
  if (frente.quantidadeExecutada !== null && frente.quantidadeExecutada !== undefined && !frente.unidade?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unidade"],
      message: "Informe a unidade quando houver quantidade executada."
    });
  }
});

export const execucaoSchema = z.object({
  clienteId: optionalUuid(),
  obraId: optionalUuid(),
  descricao: z.string().trim().max(240).optional().or(z.literal("")),
  origem: z.nativeEnum(OrigemExecucao).default(OrigemExecucao.DIRETA),
  status: z.nativeEnum(StatusExecucao).default(StatusExecucao.RASCUNHO),
  dataInicio: optionalDateOnly(),
  dataFim: optionalDateOnly(),
  observacoes: z.string().trim().max(1200).optional().or(z.literal("")),
  orcamentoOrigemId: optionalUuid(),
  propostaOrigemId: optionalUuid(),
  cenarioOrigemId: optionalUuid(),
  frentes: z.array(frenteExecutadaSchema).default([])
}).superRefine((execucao, ctx) => {
  if (execucao.origem === OrigemExecucao.DIRETA) {
    return;
  }

  if (!execucao.clienteId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clienteId"],
      message: "Cliente e obrigatorio para execucao originada de orcamento ou proposta."
    });
  }

  if (!execucao.descricao?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["descricao"],
      message: "Descricao e obrigatoria para execucao originada de orcamento ou proposta."
    });
  }

  execucao.frentes.forEach((frente, index) => {
    if (!frente.nome?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["frentes", index, "nome"],
        message: "Frente/servico e obrigatorio para execucao originada de orcamento ou proposta."
      });
    }
  });
});

export type ExecucaoInput = z.infer<typeof execucaoSchema>;
export type FrenteExecutadaInput = z.infer<typeof frenteExecutadaSchema>;
export type RecursoRealizadoInput = z.infer<typeof recursoRealizadoSchema>;
