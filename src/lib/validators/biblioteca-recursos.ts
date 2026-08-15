import { z } from "zod";

export const referenciaTecnicaRecursoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da referencia tecnica.").max(160),
  ativo: z.boolean().default(true),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
});

export const formaCusteioRecursoSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nome: z.string().trim().min(2, "Informe o nome da forma de custeio.").max(120),
  unidadeCusteioId: z.string().uuid("Selecione uma unidade de custeio valida."),
  valorReferencia: z.number().nonnegative("Informe um valor de referencia valido.").max(9999999999),
  preferencial: z.boolean().default(false),
  ativo: z.boolean().default(true),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
});

export const formasCusteioRecursoSchema = z
  .array(formaCusteioRecursoSchema)
  .default([])
  .superRefine((formas, context) => {
    const preferenciaisAtivas = formas.filter((forma) => forma.ativo && forma.preferencial);

    if (preferenciaisAtivas.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mantenha no maximo uma forma de custeio preferencial ativa por equipamento."
      });
    }
  });

export type FormaCusteioRecursoInput = z.infer<typeof formaCusteioRecursoSchema>;
export type ReferenciaTecnicaRecursoInput = z.infer<typeof referenciaTecnicaRecursoSchema>;
