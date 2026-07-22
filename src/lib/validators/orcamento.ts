import {
  CategoriaRecursoOrcamento,
  ModoCustoFrente,
  ModoCustoOrcamento,
  ModoExibicaoValoresPdf,
  ModoPrecificacaoItemOrcamento,
  NaturezaFrenteOrcamento,
  OrigemItemComercialOrcamento,
  OrigemValorAplicadoOrcamento,
  OrigemQuantidadeOperacional,
  OrigemPrazoFrente,
  StatusCenarioOrcamento,
  StatusOrcamento,
  StatusPropostaComercial,
  TipoCalculoRecurso,
  TipoItemOrcamento,
  TipoOrcamento,
  TipoPremissaOrcamento,
  UnidadeEconomicaCusto
} from "@prisma/client";
import { z } from "zod";
import { parseDateOnlyStart, parseOptionalDateOnlyStart } from "@/lib/utils/date";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { CAMPOS_TECNICOS_RECURSO } from "@/lib/orcamentos/resource-inheritance";

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

function normalizarUnidadeOperacional(value?: string | null) {
  const unidade = (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/³/g, "3")
    .replace(/²/g, "2")
    .replace(/\s+/g, "");

  if (unidade.includes("m3")) return "M3";
  if (unidade.includes("m2")) return "M2";
  if (unidade === "t" || unidade.includes("ton")) return "TON";
  if (unidade.includes("carga")) return "CARGA";
  if (unidade.includes("km")) return "KM";
  if (unidade.includes("hora") || unidade === "h") return "HORA";
  if (unidade.includes("mes")) return "MES";
  if (unidade.includes("dia")) return "DIA";
  if (["un", "und", "unidade", "unidades"].includes(unidade)) return "UN";
  return unidade ? "DESCONHECIDA" : "";
}

const caracteristicasRecursoSnapshotSchema = z.object({
  versao: z.literal(1),
  origem: z.literal("CADASTRO_MESTRE"),
  recursoId: z.string().trim().min(1).max(120),
  herdados: z.object({
    capacidadePorViagem: z.number().finite().nonnegative().nullable(),
    unidadeCapacidade: z.string().trim().max(40).nullable(),
    unidadeEconomicaCusto: z.nativeEnum(UnidadeEconomicaCusto).nullable(),
    valorCusto: z.number().finite().nonnegative().nullable().optional(),
    permitirEdicaoOrcamento: z.boolean().optional(),
    naturezaRecurso: z.string().trim().max(80).nullable().optional(),
    tipoRecurso: z.string().trim().max(80).nullable().optional(),
    classeOperacional: z.string().trim().max(160).nullable().optional(),
    descricaoOperacional: z.string().trim().max(500).nullable().optional(),
    caracteristicasTecnicas: z.record(z.string(), z.unknown()).nullable()
  })
});

const orcamentoFrenteSchema = z.object({
  cenarioTempId: z.string().trim().max(80).optional().or(z.literal("")),
  cenarioOrdem: z.number().int().positive().max(999).optional().nullable(),
  tempId: z.string().trim().max(80).optional().or(z.literal("")),
  ordem: z.number().int().positive().max(999).default(1),
  natureza: z.nativeEnum(NaturezaFrenteOrcamento).optional(),
  nome: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  metodoExecutivo: z.string().trim().max(1000).optional().or(z.literal("")),
  unidadeProducao: z.string().trim().max(40).optional().or(z.literal("")),
  quantidadePrevista: numeroDecimal(999999999).optional().nullable(),
  produtividadeDia: numeroDecimal(999999999).optional().nullable(),
  prazoEstimadoDias: numeroDecimal(9999).optional().nullable(),
  prazoTeoricoDias: numeroDecimal(9999).optional().nullable(),
  prazoAdotadoDias: numeroDecimal(9999).optional().nullable(),
  origemPrazo: z.nativeEnum(OrigemPrazoFrente).optional(),
  modoCusto: z.nativeEnum(ModoCustoFrente).default(ModoCustoFrente.AUTO),
  custoManual: numeroDecimal(999999999).default(0),
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
  modoExibicaoValoresPdf: z
    .nativeEnum(ModoExibicaoValoresPdf)
    .default(ModoExibicaoValoresPdf.SOMENTE_TOTAL_GLOBAL),
  condicoesComerciais: z.string().trim().max(1200).optional().or(z.literal("")),
  observacao: z.string().trim().max(700).optional().or(z.literal("")),
  opcionais: z.array(orcamentoPropostaOpcionalSchema).default([])
});

const orcamentoItemSchema = z.object({
  tempId: z.string().trim().max(80).optional().or(z.literal("")),
  frenteTempId: z.string().trim().max(80).optional().or(z.literal("")),
  frenteOrdem: z.number().int().positive().max(999).optional().nullable(),
  tipoItem: z.nativeEnum(TipoItemOrcamento).default(TipoItemOrcamento.COMERCIAL),
  origemItemComercial: z.nativeEnum(OrigemItemComercialOrcamento).optional().nullable(),
  descricaoManualComercial: z.string().trim().max(240).optional().or(z.literal("")),
  servicoId: optionalUuid(),
  materialId: optionalUuid(),
  equipamentoId: optionalUuid(),
  categoriaRecurso: z.nativeEnum(CategoriaRecursoOrcamento).optional().nullable(),
  classeOperacional: z.string().trim().max(160).optional().or(z.literal("")),
  recursoReferenciaId: z.string().trim().max(120).optional().or(z.literal("")),
  recursoNome: z.string().trim().max(180).optional().or(z.literal("")),
  modoPrecificacao: z
    .nativeEnum(ModoPrecificacaoItemOrcamento)
    .optional(),
  precoCompra: numeroDecimal(999999999).optional().nullable(),
  markupPercentual: numeroDecimal(9999).optional().nullable(),
  precoVendaSobrescrito: z.boolean().optional(),
  custoCalculadoOriginal: numeroDecimal(999999999).optional().nullable(),
  custoBaseSobrescrito: numeroDecimal(999999999).optional().nullable(),
  custoBaseAplicado: numeroDecimal(999999999).optional().nullable(),
  origemCustoAplicado: z.nativeEnum(OrigemValorAplicadoOrcamento).optional(),
  precoCalculado: numeroDecimal(999999999).optional().nullable(),
  precoAplicado: numeroDecimal(999999999).optional().nullable(),
  origemValorAplicado: z.nativeEnum(OrigemValorAplicadoOrcamento).optional(),
  motivoSobrescrita: z.string().trim().max(700).optional().or(z.literal("")),
  fornecedorPreferencialId: optionalUuid(),
  exibirNoPdf: z.boolean().optional(),
  observacaoComercial: z.string().trim().max(700).optional().or(z.literal("")),
  ordem: z.number().int().positive().max(999).default(1),
  codigo: z.string().trim().max(80).optional().or(z.literal("")),
  descricao: z.string().trim().min(2).max(240),
  unidade: z.string().trim().min(1).max(40),
  quantidade: numeroDecimal(999999999),
  quantidadeOperacional: numeroDecimal(999999999).optional().nullable(),
  origemQuantidadeOperacional: z.nativeEnum(OrigemQuantidadeOperacional).optional(),
  produtividade: numeroDecimal(999999999).optional().nullable(),
  custoUnitario: numeroDecimal(999999999).default(0),
  tipoCalculoRecurso: z.nativeEnum(TipoCalculoRecurso).optional(),
  unidadeEconomicaCusto: z.nativeEnum(UnidadeEconomicaCusto).optional().nullable(),
  valorCusto: numeroDecimal(999999999).optional().nullable(),
  horasDia: numeroDecimal(24).optional().nullable(),
  horasTotais: numeroDecimal(999999999).optional().nullable(),
  viagensDia: numeroDecimal(999999).optional().nullable(),
  viagensTotais: numeroDecimal(999999999).optional().nullable(),
  distanciaViagemKm: numeroDecimal(999999).optional().nullable(),
  quilometrosTotais: numeroDecimal(999999999).optional().nullable(),
  capacidadePorViagem: numeroDecimal(999999999).optional().nullable(),
  unidadeCapacidade: z.string().trim().max(40).nullable().optional(),
  caracteristicasRecursoSnapshot: caracteristicasRecursoSnapshotSchema.optional().nullable(),
  camposTecnicosPersonalizados: z.array(z.enum(CAMPOS_TECNICOS_RECURSO)).optional(),
  cargasTotais: numeroDecimal(999999999).optional().nullable(),
  mesesTotais: numeroDecimal(999999).optional().nullable(),
  diasTrabalhadosMes: numeroDecimal(31).optional().nullable(),
  custoTotalCalculado: numeroDecimal(999999999).optional(),
  memoriaCalculo: z.string().trim().max(3000).optional().or(z.literal("")),
  valorUnitario: numeroDecimal(999999999).default(0),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
}).superRefine((item, context) => {
  if (item.tipoItem !== TipoItemOrcamento.RECURSO) {
    if (!item.unidade?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unidade"],
        message: "Informe a unidade do item."
      });
    }

    if (Number(item.quantidade ?? 0) < 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantidade"],
        message: "A quantidade do item nao pode ser negativa."
      });
    }

    if (Number(item.valorUnitario ?? 0) < 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valorUnitario"],
        message: "O preco de venda do item nao pode ser negativo."
      });
    }

    if (item.servicoId && item.equipamentoId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["origemItemComercial"],
        message: "O item comercial nao pode usar servico e equipamento ao mesmo tempo."
      });
    }

    if (item.origemItemComercial === OrigemItemComercialOrcamento.SERVICE && !item.servicoId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["servicoId"],
        message: "Selecione o servico comercial deste item."
      });
    }

    if (item.origemItemComercial === OrigemItemComercialOrcamento.RESOURCE && !item.equipamentoId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["equipamentoId"],
        message: "Selecione o equipamento ou recurso comercial deste item."
      });
    }

    if (
      item.origemItemComercial === OrigemItemComercialOrcamento.MANUAL &&
      !item.descricaoManualComercial?.trim() &&
      !item.descricao?.trim()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["descricao"],
        message: "Informe a descricao comercial do item."
      });
    }

    if (item.tipoItem === TipoItemOrcamento.MATERIAL && !item.materialId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["materialId"],
        message: "Informe o material comercializado."
      });
    }
  }

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

  if (
    item.origemQuantidadeOperacional === OrigemQuantidadeOperacional.PERSONALIZADA &&
    Number(item.quantidadeOperacional ?? 0) <= 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantidadeOperacional"],
      message: "Informe uma quantidade operacional maior que zero."
    });
  }

  if (
    item.unidadeEconomicaCusto &&
    item.unidadeEconomicaCusto !== UnidadeEconomicaCusto.KM &&
    Number(item.valorCusto ?? 0) <= 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["valorCusto"],
      message: "Informe um valor de custo maior que zero."
    });
  }

  if (
    item.tipoCalculoRecurso === TipoCalculoRecurso.AUTOMATICO &&
    item.unidadeEconomicaCusto === UnidadeEconomicaCusto.HORA &&
    Number(item.horasTotais ?? 0) <= 0 &&
    Number(item.horasDia ?? 0) <= 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["horasTotais"],
      message: "Informe o total de horas."
    });
  }

  if (
    item.tipoCalculoRecurso === TipoCalculoRecurso.AUTOMATICO &&
    item.unidadeEconomicaCusto === UnidadeEconomicaCusto.VIAGEM &&
    Number(item.viagensTotais ?? 0) <= 0 &&
    Number(item.viagensDia ?? 0) <= 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["viagensTotais"],
      message: "Informe a quantidade total de viagens."
    });
  }

  if (
    item.tipoCalculoRecurso === TipoCalculoRecurso.AUTOMATICO &&
    item.unidadeEconomicaCusto === UnidadeEconomicaCusto.KM
  ) {
    if (Number(item.quantidade ?? 0) <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantidade"],
        message: "Informe a quantidade de caminhoes mobilizados."
      });
    }
    if (Number(item.capacidadePorViagem ?? 0) <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capacidadePorViagem"],
        message: "Informe uma capacidade por viagem maior que zero."
      });
    }
    if (!item.unidadeCapacidade?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unidadeCapacidade"],
        message: "Informe a unidade da capacidade por viagem."
      });
    }
    if (Number(item.distanciaViagemKm ?? 0) <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["distanciaViagemKm"],
        message: "Informe uma distancia por viagem maior que zero."
      });
    }
  }

  if (
    item.tipoCalculoRecurso === TipoCalculoRecurso.AUTOMATICO &&
    item.unidadeEconomicaCusto === UnidadeEconomicaCusto.CARGA &&
    Number(item.cargasTotais ?? 0) <= 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cargasTotais"],
      message: "Informe a quantidade total de cargas."
    });
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
  ajusteComercial: numeroDecimal(999999999).default(0),
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
      const getFrenteRef = (frente: (typeof data.frentes)[number]) =>
        frente.tempId?.trim() || `ordem:${frente.ordem}`;
      const getItemFrenteRef = (item: (typeof data.itens)[number]) =>
        item.frenteTempId?.trim() || (item.frenteOrdem ? `ordem:${item.frenteOrdem}` : "");
      const frentesOperacionais = data.frentes.filter(
        (frente) => (frente.natureza ?? NaturezaFrenteOrcamento.OPERACIONAL) === NaturezaFrenteOrcamento.OPERACIONAL
      );
      const refsOperacionais = new Set(frentesOperacionais.map(getFrenteRef));
      const possuiServicoPrincipal = itensComFrente.some(
        (item) =>
          item.tipoItem === TipoItemOrcamento.SERVICO_PRINCIPAL &&
          refsOperacionais.has(getItemFrenteRef(item))
      );

      if (statusExigeItem && data.frentes.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frentes"],
          message: "Inclua pelo menos uma frente para orcamentos operacionais."
        });
      }

      if (statusExigeItem && frentesOperacionais.length > 0 && !possuiServicoPrincipal) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["itens"],
          message: "Defina pelo menos um servico principal vinculado a uma frente."
        });
      }

      if (statusExigeItem) {
        data.frentes.forEach((frente, frenteIndex) => {
          if ((frente.natureza ?? NaturezaFrenteOrcamento.OPERACIONAL) !== NaturezaFrenteOrcamento.COMERCIAL) {
            return;
          }

          const frenteRef = getFrenteRef(frente);
          const possuiItemComercialValido = data.itens.some(
            (item) =>
              getItemFrenteRef(item) === frenteRef &&
              item.tipoItem !== TipoItemOrcamento.RECURSO &&
              Number(item.quantidade ?? 0) > 0 &&
              Number(item.valorUnitario ?? item.precoAplicado ?? 0) >= 0
          );

          if (!possuiItemComercialValido) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["frentes", frenteIndex],
              message: "Inclua pelo menos um item comercial valido nesta frente."
            });
          }
        });
      }

      data.itens.forEach((item, itemIndex) => {
        if (
          item.tipoItem !== TipoItemOrcamento.RECURSO ||
          item.tipoCalculoRecurso !== TipoCalculoRecurso.AUTOMATICO ||
          item.unidadeEconomicaCusto !== UnidadeEconomicaCusto.KM
        ) {
          return;
        }

        const frente = data.frentes.find((candidate) =>
          (item.frenteTempId?.trim() && candidate.tempId?.trim() === item.frenteTempId.trim()) ||
          (item.frenteOrdem && candidate.ordem === item.frenteOrdem)
        );
        if (!frente) return;
        if ((frente.natureza ?? NaturezaFrenteOrcamento.OPERACIONAL) === NaturezaFrenteOrcamento.COMERCIAL) {
          return;
        }

        const quantidadeOperacional =
          item.origemQuantidadeOperacional === OrigemQuantidadeOperacional.PERSONALIZADA
            ? Number(item.quantidadeOperacional ?? 0)
            : Number(frente.quantidadePrevista ?? 0);

        if (quantidadeOperacional <= 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["itens", itemIndex, "quantidadeOperacional"],
            message: "Informe uma quantidade operacional maior que zero para calcular o transporte."
          });
        }

        const unidadeFrente = normalizarUnidadeOperacional(frente.unidadeProducao);
        const unidadeCapacidade = normalizarUnidadeOperacional(item.unidadeCapacidade);
        if (unidadeFrente && unidadeCapacidade && unidadeFrente !== unidadeCapacidade) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["itens", itemIndex, "unidadeCapacidade"],
            message: "A unidade da capacidade deve ser compativel com a unidade de producao da frente."
          });
        }
      });

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
