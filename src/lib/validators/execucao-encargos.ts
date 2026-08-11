import { z } from "zod";

export const estadoEncargosExecucaoSchema = z.enum([
  "SEM_ENCARGOS",
  "COM_ENCARGOS",
  "ENCARGOS_PENDENTES"
]);

export const formaCalculoEncargoExecucaoSchema = z.enum([
  "PERCENTUAL_SOBRE_RECEITA",
  "VALOR_INFORMADO"
]);

export const origemEncargoExecucaoSchema = z.enum(["MANUAL", "OUTRO_MODULO"]);

const optionalNumber = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : Number(value),
  z.number().finite().min(0).optional()
);

export const encargoEconomicoExecucaoSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.string().trim().min(2, "Informe o tipo do encargo."),
  descricao: z.string().trim().min(2, "Informe a descricao do encargo."),
  formaCalculo: formaCalculoEncargoExecucaoSchema,
  percentual: optionalNumber,
  valorInformado: optionalNumber,
  observacao: z.string().trim().optional().nullable(),
  origem: origemEncargoExecucaoSchema.default("MANUAL")
});

export const salvarEncargosEconomicosExecucaoSchema = z.object({
  estadoEncargos: estadoEncargosExecucaoSchema,
  encargos: z.array(encargoEconomicoExecucaoSchema).default([])
});

export type SalvarEncargosEconomicosExecucaoInput = z.infer<typeof salvarEncargosEconomicosExecucaoSchema>;
