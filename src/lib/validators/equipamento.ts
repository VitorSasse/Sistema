import {
  StatusCadastro,
  StatusEquipamentoOperacional,
  TipoControleEquipamento,
  TipoRecurso
} from "@prisma/client";
import { z } from "zod";

export const equipamentoSchema = z.object({
  tipoRecurso: z.nativeEnum(TipoRecurso),
  tipoControle: z.nativeEnum(TipoControleEquipamento).default(TipoControleEquipamento.HORIMETRO),
  descricao: z.string().trim().min(3).max(160),
  placaOuTag: z.string().trim().min(2).max(30),
  fabricante: z.string().trim().max(120).optional().or(z.literal("")),
  modelo: z.string().trim().max(120).optional().or(z.literal("")),
  marcaModelo: z.string().trim().max(120).optional().or(z.literal("")),
  anoFabricacao: z.union([z.number().int().min(1950).max(2100), z.null()]).optional(),
  dataEntrada: z.string().trim().optional().or(z.literal("")),
  capacidadeM3: z.union([z.number().nonnegative().max(999999), z.null()]).optional(),
  unidadeCapacidade: z.string().trim().max(20).optional().or(z.literal("")),
  apelido: z.string().trim().max(80).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO),
  statusOperacional: z
    .nativeEnum(StatusEquipamentoOperacional)
    .default(StatusEquipamentoOperacional.ATIVO),
  horimetroAtual: z.union([z.number().nonnegative().max(9999999), z.null()]).optional(),
  kmAtual: z.union([z.number().nonnegative().max(99999999), z.null()]).optional(),
  periodicidadeManutencaoHoras: z.union([z.number().int().positive().max(999999), z.null()]).optional(),
  periodicidadeManutencaoKm: z.union([z.number().int().positive().max(9999999), z.null()]).optional()
});

export type EquipamentoInput = z.infer<typeof equipamentoSchema>;
