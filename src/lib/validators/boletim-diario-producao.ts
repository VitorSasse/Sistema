import { OrigemFatoBoletimDiario } from "@prisma/client";
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

function dateOnly() {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? parseOptionalDateOnlyStart(value) : value),
    z.date()
  );
}

const snapshotTecnicoEconomicoSchema = z.record(z.string(), z.unknown()).refine(
  (value) => Object.keys(value).length > 0,
  "Informe o snapshot tecnico e economico do recurso."
);

export const recursoBoletimDiarioProducaoSchema = z.object({
  frenteExecutadaId: z.string().uuid(),
  recursoId: optionalUuid(),
  nomeSnapshot: z.string().trim().min(2).max(180),
  quantidadeRealizada: numeroDecimal(999999999),
  unidadeRealizada: z.string().trim().min(1).max(40),
  quantidadeRecursos: numeroDecimal(999999999).optional().nullable(),
  origem: z.nativeEnum(OrigemFatoBoletimDiario).default(OrigemFatoBoletimDiario.MANUAL),
  origemRegistroTipo: z.string().trim().max(80).optional().nullable(),
  origemRegistroId: z.string().trim().max(120).optional().nullable(),
  origemRegistroData: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? parseOptionalDateOnlyStart(value) : value),
    z.date().optional().nullable()
  ),
  editavel: z.boolean().optional(),
  snapshotTecnicoEconomico: snapshotTecnicoEconomicoSchema,
  observacao: z.string().trim().max(700).optional().or(z.literal(""))
});

export const boletimDiarioProducaoSchema = z.object({
  execucaoId: z.string().uuid(),
  dataBoletim: dateOnly(),
  observacoes: z.string().trim().max(1200).optional().or(z.literal("")),
  recursos: z.array(recursoBoletimDiarioProducaoSchema).default([])
});

export type BoletimDiarioProducaoInput = z.infer<typeof boletimDiarioProducaoSchema>;
export type RecursoBoletimDiarioProducaoInput = z.infer<typeof recursoBoletimDiarioProducaoSchema>;
