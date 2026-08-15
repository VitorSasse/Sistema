import {
  NaturezaRecursoEquipamento,
  StatusCadastro,
  StatusEquipamentoOperacional,
  TipoControleEquipamento,
  TipoRecurso,
  UnidadeEconomicaCusto
} from "@prisma/client";
import { z } from "zod";
import { formasCusteioRecursoSchema } from "@/lib/validators/biblioteca-recursos";

export const equipamentoSchema = z.object({
  naturezaRecurso: z
    .nativeEnum(NaturezaRecursoEquipamento)
    .default(NaturezaRecursoEquipamento.PROPRIO),
  tipoRecurso: z.nativeEnum(TipoRecurso),
  tipoControle: z.nativeEnum(TipoControleEquipamento).default(TipoControleEquipamento.HORIMETRO),
  descricao: z.string().trim().min(3).max(160),
  descricaoOperacional: z.string().trim().max(500).optional().or(z.literal("")),
  placaOuTag: z.string().trim().max(30).optional().default(""),
  classeOperacional: z.string().trim().max(160).optional().or(z.literal("")),
  complementar: z.boolean().default(false),
  fabricante: z.string().trim().max(120).optional().or(z.literal("")),
  modelo: z.string().trim().max(120).optional().or(z.literal("")),
  marcaModelo: z.string().trim().max(120).optional().or(z.literal("")),
  anoFabricacao: z.union([z.number().int().min(1950).max(2100), z.null()]).optional(),
  dataEntrada: z.string().trim().optional().or(z.literal("")),
  capacidadeM3: z.union([z.number().nonnegative().max(999999), z.null()]).optional(),
  unidadeCapacidade: z.string().trim().max(20).optional().or(z.literal("")),
  unidadeEconomicaPadrao: z
    .nativeEnum(UnidadeEconomicaCusto)
    .optional()
    .nullable()
    .or(z.literal("")),
  custoPadrao: z.union([z.number().nonnegative().max(9999999999), z.null()]).optional(),
  permitirEdicaoOrcamento: z.boolean().default(true),
  caracteristicasTecnicas: z.record(z.string(), z.unknown()).optional().nullable(),
  apelido: z.string().trim().max(80).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO),
  statusOperacional: z
    .nativeEnum(StatusEquipamentoOperacional)
    .default(StatusEquipamentoOperacional.ATIVO),
  horimetroAtual: z.union([z.number().nonnegative().max(9999999), z.null()]).optional(),
  kmAtual: z.union([z.number().nonnegative().max(99999999), z.null()]).optional(),
  periodicidadeManutencaoHoras: z.union([z.number().int().positive().max(999999), z.null()]).optional(),
  periodicidadeManutencaoKm: z.union([z.number().int().positive().max(9999999), z.null()]).optional(),
  formasCusteio: formasCusteioRecursoSchema
}).superRefine((data, context) => {
  if (data.naturezaRecurso === NaturezaRecursoEquipamento.PROPRIO && data.placaOuTag.length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["placaOuTag"],
      message: "Informe a placa ou TAG do recurso proprio."
    });
  }
});

export type EquipamentoInput = z.infer<typeof equipamentoSchema>;
