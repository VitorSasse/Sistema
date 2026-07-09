import { NaturezaServico, StatusCadastro } from "@prisma/client";
import { z } from "zod";

export const servicoSchema = z.object({
  tipoServico: z.string().trim().min(3).max(160),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  natureza: z.nativeEnum(NaturezaServico).default(NaturezaServico.OPERACIONAL),
  usarEmOrcamentos: z.boolean().default(true),
  usarEmFichas: z.boolean().default(true),
  usarEmMedicoes: z.boolean().default(true),
  usarEmFaturamento: z.boolean().default(true),
  servicoTecnico: z.boolean().default(false),
  faturamentoFechado: z.boolean().default(false),
  valorFechadoPadrao: z.union([z.number().min(0), z.null()]).optional().default(null),
  formaMedicao: z.string().trim().min(2).max(80),
  unidadeApontamento: z.string().trim().max(20).optional().or(z.literal("")),
  unidadeFaturamento: z.string().trim().min(1).max(20),
  exigeMaterial: z.boolean().default(false),
  ativoParaMedicao: z.boolean().default(true),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
}).superRefine((value, ctx) => {
  if (value.faturamentoFechado && value.valorFechadoPadrao === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o valor fechado padrao para servicos com faturamento fechado.",
      path: ["valorFechadoPadrao"]
    });
  }
});

export type ServicoInput = z.infer<typeof servicoSchema>;
