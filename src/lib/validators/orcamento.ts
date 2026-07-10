import {
  CategoriaRecursoOrcamento,
  ModoCustoOrcamento,
  StatusCenarioOrcamento,
  StatusOrcamento,
  StatusPropostaComercial,
  TipoItemOrcamento,
  TipoOrcamento,
  TipoPremissaOrcamento
} from "@prisma/client";
import { z } from "zod";
import { parseDateOnlyStart, parseOptionalDateOnlyStart } from "@/lib/utils/date";
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
      if (value === null || value === undefined) {
        return 0;
      }

      if (typeof value === "string" && value.trim() === "") {
        return 0;
      }

      return parseDecimalInput(value);
    },
    z.number().finite().min(0).max(max)
  );
}

const orcamentoFrenteSchema = z.object({
  cenarioTempId: z.string().trim().max(80).optional().or(z.literal("")),
  cenarioOrdem: z.number().int().positive().max(999).optional().nullable(),
  tempId: z.string().trim().max(80).optional().or(z.literal("")),
  ordem: z.number().int().positive().max(999).default(1),
  nome: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  metodoExecutivo: z.string().trim().max(1000).optional().or(z.literal("")),
  unidadeProducao: z.string().trim().max(40).optional().or(z.literal("")),
  quantidadePrevista: numeroDecimal(999999999).optional().nullable(),
  produtividadeDia: numeroDecimal(999999999).optional().nullable(),
  prazoEstimadoDias: numeroDecimal(9999).optional().nullable(),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
});

const orcamentoCenarioSchema = z.object({
  tempId: z.string().trim().max(80).optional().or(z.literal("")),
  ordem: z.number().int().positive().max(999).default(1),
  nome: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(700).optional().or(z.literal("")),
  metodoExecutivo: z.string().trim().max(1200).optional().or(z.literal("")),
  observacao: z.string().trim().max(700).optional().or(z.literal("")),
  isPadrao: z.boolean().default(false),
  status: z.nativeEnum(StatusCenarioOrcamento).default(StatusCenarioOrcamento.EM_ESTUDO)
});

const orcamentoPropostaOpcionalSchema = z.object({
  tempId: z.string().trim().max(80).optional().or(z.literal("")),
  ordem: z.number().int().positive().max(999).default(1),
  codigo: z.string().trim().max(80).optional().or(z.literal("")),
  descricao: z.string().trim().min(2).max(240),
  unidade: z.string().trim().min(1).max(40),
  quantidade: numeroDecimal(999999999),
  valorUnitario: numeroDecimal(999999999),
  condicoes: z.string().trim().max(1000).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
});

const orcamentoPropostaComercialSchema = z.object({
  tempId: z.string().trim().max(80).optional().or(z.literal("")),
  cenarioTempId: z.string().trim().max(80).optional().or(z.literal("")),
  cenarioOrdem: z.number().int().positive().max(999).optional().nullable(),
  codigo: z.string().trim().max(80).optional().or(z.literal("")),
  revisao: z.number().int().min(0).max(999).default(0),
  titulo: z.string().trim().max(180).optional().or(z.literal("")),
  status: z.nativeEnum(StatusPropostaComercial).default(StatusPropostaComercial.RASCUNHO),
  condicoesComerciais: z.string().trim().max(1200).optional().or(z.literal("")),
  observacao: z.string().trim().max(700).optional().or(z.literal("")),
  opcionais: z.array(orcamentoPropostaOpcionalSchema).default([])
});

const orcamentoItemSchema = z.object({
  frenteTempId: z.string().trim().max(80).optional().or(z.literal("")),
  frenteOrdem: z.number().int().positive().max(999).optional().nullable(),
  tipoItem: z.nativeEnum(TipoItemOrcamento).default(TipoItemOrcamento.COMERCIAL),
  servicoId: optionalUuid(),
  materialId: optionalUuid(),
  equipamentoId: optionalUuid(),
  categoriaRecurso: z.nativeEnum(CategoriaRecursoOrcamento).optional().nullable(),
  classeOperacional: z.string().trim().max(160).optional().or(z.literal("")),
  recursoReferenciaId: z.string().trim().max(120).optional().or(z.literal("")),
  recursoNome: z.string().trim().max(180).optional().or(z.literal("")),
  ordem: z.number().int().positive().max(999).default(1),
  codigo: z.string().trim().max(80).optional().or(z.literal("")),
  descricao: z.string().trim().min(2).max(240),
  unidade: z.string().trim().min(1).max(40),
  quantidade: numeroDecimal(999999999),
  produtividade: numeroDecimal(999999999).optional().nullable(),
  custoUnitario: numeroDecimal(999999999).default(0),
  valorUnitario: numeroDecimal(999999999).default(0),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
}).superRefine((item, context) => {
  if (item.tipoItem !== TipoItemOrcamento.RECURSO) {
    return;
  }

  if (item.servicoId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["servicoId"],
      message: "Item de recurso nao deve usar o cadastro de servico."
    });
  }

  if (!item.categoriaRecurso) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoriaRecurso"],
      message: "Informe a categoria do recurso."
    });
    return;
  }

  if (item.categoriaRecurso === CategoriaRecursoOrcamento.EQUIPAMENTO && !item.classeOperacional?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["classeOperacional"],
      message: "Informe a classe operacional do equipamento."
    });
  }

  if (item.categoriaRecurso === CategoriaRecursoOrcamento.MATERIAL && !item.materialId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["materialId"],
      message: "Informe o material usado como recurso."
    });
  }

  if (
    (item.categoriaRecurso === CategoriaRecursoOrcamento.EQUIPE ||
      item.categoriaRecurso === CategoriaRecursoOrcamento.TERCEIRO) &&
    !item.recursoReferenciaId?.trim() &&
    !item.recursoNome?.trim()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recursoReferenciaId"],
      message: "Informe o recurso correspondente a categoria selecionada."
    });
  }
});

const orcamentoPremissaSchema = z.object({
  tipo: z.nativeEnum(TipoPremissaOrcamento).default(TipoPremissaOrcamento.PREMISSA),
  ordem: z.number().int().positive().max(999).default(1),
  titulo: z.string().trim().max(120).optional().or(z.literal("")),
  descricao: z.string().trim().min(2).max(1000)
});

const orcamentoFormacaoPrecoSchema = z.object({
  modoCusto: z.nativeEnum(ModoCustoOrcamento).default(ModoCustoOrcamento.SIMPLIFICADO),
  custoDireto: numeroDecimal(999999999).default(0),
  custoIndireto: numeroDecimal(999999999).default(0),
  impostosPercentual: numeroDecimal(9999).default(0),
  impostosValor: numeroDecimal(999999999).default(0),
  margemPercentual: numeroDecimal(9999).default(0),
  margemValor: numeroDecimal(999999999).default(0),
  precoSugerido: numeroDecimal(999999999).default(0),
  precoFinal: numeroDecimal(999999999).default(0),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
});

export const orcamentoSchema = z
  .object({
    tipo: z.nativeEnum(TipoOrcamento).default(TipoOrcamento.COMERCIAL),
    status: z.nativeEnum(StatusOrcamento).default(StatusOrcamento.RASCUNHO),
    clienteId: z.string().uuid(),
    obraId: optionalUuid(),
    responsavelId: optionalUuid(),
    dataOrcamento: z.string().trim().min(1),
    validadeAte: z.string().trim().optional().or(z.literal("")),
    titulo: z.string().trim().max(160).optional().or(z.literal("")),
    objeto: z.string().trim().max(1000).optional().or(z.literal("")),
    observacaoInterna: z.string().trim().max(1000).optional().or(z.literal("")),
    observacaoCliente: z.string().trim().max(1000).optional().or(z.literal("")),
    valorDesconto: numeroDecimal(999999999).default(0),
    valorAcrescimo: numeroDecimal(999999999).default(0),
    formacaoPreco: orcamentoFormacaoPrecoSchema.optional().nullable(),
    cenarios: z.array(orcamentoCenarioSchema).default([]),
    propostasComerciais: z.array(orcamentoPropostaComercialSchema).default([]),
    frentes: z.array(orcamentoFrenteSchema).default([]),
    itens: z.array(orcamentoItemSchema).default([]),
    premissas: z.array(orcamentoPremissaSchema).default([])
  })
  .superRefine((data, context) => {
    const dataOrcamento = parseDateOnlyStart(data.dataOrcamento);
    const validadeAte = parseOptionalDateOnlyStart(data.validadeAte);

    if (Number.isNaN(dataOrcamento.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataOrcamento"],
        message: "Informe uma data valida para o orcamento."
      });
    }

    if (validadeAte && Number.isNaN(validadeAte.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validadeAte"],
        message: "Informe uma data de validade valida."
      });
    }

    if (validadeAte && validadeAte < dataOrcamento) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validadeAte"],
        message: "A validade nao pode ser anterior a data do orcamento."
      });
    }

    const statusExigeItem =
      data.status !== StatusOrcamento.RASCUNHO &&
      data.status !== StatusOrcamento.EM_ELABORACAO;

    if (data.tipo === TipoOrcamento.COMERCIAL && statusExigeItem && data.itens.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itens"],
        message: "Inclua pelo menos um item antes de avancar o status do orcamento."
      });
    }

    if (data.tipo === TipoOrcamento.OPERACIONAL) {
      const itensComFrente = data.itens.filter((item) => item.frenteTempId || item.frenteOrdem);
      const possuiServicoPrincipal = itensComFrente.some(
        (item) => item.tipoItem === TipoItemOrcamento.SERVICO_PRINCIPAL
      );

      if (statusExigeItem && data.frentes.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frentes"],
          message: "Inclua pelo menos uma frente para orcamentos operacionais."
        });
      }

      if (statusExigeItem && !possuiServicoPrincipal) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["itens"],
          message: "Defina pelo menos um servico principal vinculado a uma frente."
        });
      }

      const cenarioRefs = new Set<string>();

      data.cenarios.forEach((cenario) => {
        if (cenario.tempId?.trim()) {
          cenarioRefs.add(`temp:${cenario.tempId.trim()}`);
        }

        cenarioRefs.add(`ordem:${cenario.ordem}`);
      });

      data.propostasComerciais.forEach((proposta, index) => {
        const possuiCenario =
          (proposta.cenarioTempId?.trim() && cenarioRefs.has(`temp:${proposta.cenarioTempId.trim()}`)) ||
          (proposta.cenarioOrdem && cenarioRefs.has(`ordem:${proposta.cenarioOrdem}`));

        if (!possuiCenario && data.cenarios.length > 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["propostasComerciais", index, "cenarioTempId"],
            message: "Vincule a proposta comercial a um cenario valido."
          });
        }
      });
    }
  });

export type OrcamentoInput = z.infer<typeof orcamentoSchema>;
