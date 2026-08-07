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
  nome: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(700).optional().or(z.literal("")),
  unidade: z.string().trim().min(1).max(40),
  quantidadeExecutada: numeroDecimal(999999999),
  receitaRealizada: numeroDecimal(999999999),
  recursos: z.array(recursoRealizadoSchema).default([])
});

export const execucaoSchema = z.object({
  clienteId: z.string().uuid(),
  obraId: optionalUuid(),
  descricao: z.string().trim().min(2).max(240),
  origem: z.nativeEnum(OrigemExecucao).default(OrigemExecucao.DIRETA),
  status: z.nativeEnum(StatusExecucao).default(StatusExecucao.RASCUNHO),
  dataInicio: optionalDateOnly(),
  dataFim: optionalDateOnly(),
  observacoes: z.string().trim().max(1200).optional().or(z.literal("")),
  orcamentoOrigemId: optionalUuid(),
  propostaOrigemId: optionalUuid(),
  cenarioOrigemId: optionalUuid(),
  frentes: z.array(frenteExecutadaSchema).default([])
});

export type ExecucaoInput = z.infer<typeof execucaoSchema>;
export type FrenteExecutadaInput = z.infer<typeof frenteExecutadaSchema>;
export type RecursoRealizadoInput = z.infer<typeof recursoRealizadoSchema>;
