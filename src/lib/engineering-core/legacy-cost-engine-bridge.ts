import {
  calcularMotorCustos,
  type CostEngineResultado,
  type CostEngineUnidadeEconomicaCusto
} from "@/lib/orcamentos/cost-engine";
import type {
  AvisoNucleoEngenharia,
  EntradaNucleoEngenharia,
  GrupoUnidadeNucleo,
  MemoriaCalculoNucleo,
  ResultadoNucleoEngenharia,
  ResultadoRecursoOperacionalNucleo,
  ResultadoUnidadeOperacionalNucleo
} from "./contracts";
import { calcularResultadoEconomicoNucleo } from "./economic-composition";

export function converterEntradaNucleoParaCostEngine(input: EntradaNucleoEngenharia) {
  return {
    frentes: input.unidades.map((unidade) => ({
      ref: unidade.id,
      nome: unidade.nome,
      unidadeProducao: unidade.unidade,
      quantidadePrevista: unidade.quantidade,
      produtividadeDia: unidade.produtividade,
      prazoEstimadoDias: unidade.prazoEstimado,
      prazoTeoricoDias: unidade.prazoTeorico,
      prazoAdotadoDias: unidade.prazoAdotado,
      origemPrazo: unidade.origemPrazo,
      modoCusto: unidade.modoCusto,
      custoManual: unidade.custoManual
    })),
    recursos: input.unidades.flatMap((unidade) =>
      unidade.recursos.map((recurso) => ({
        ref: recurso.id,
        frenteRef: unidade.id,
        categoria: recurso.categoria,
        descricao: recurso.descricaoTecnica,
        recursoNome: recurso.nomeTecnico,
        classeOperacional: recurso.classeOperacional,
        recursoReferenciaId: recurso.referenciaTecnicaId,
        quantidade: recurso.quantidadeRecursos,
        quantidadeOperacional: recurso.quantidadeOperacional,
        origemQuantidadeOperacional: recurso.origemQuantidadeOperacional,
        unidadeQuantidadeOperacional: recurso.unidadeQuantidadeOperacional,
        custoOperacional: recurso.custoUnitario,
        unidadeCusto: recurso.unidadeCusto,
        tipoCalculo: recurso.tipoCalculo,
        unidadeEconomicaCusto: recurso.baseEconomica as CostEngineUnidadeEconomicaCusto | null | undefined,
        valorCusto: recurso.valorCusto,
        horasDia: recurso.horasDia,
        horasTotais: recurso.horasTotais,
        viagensDia: recurso.viagensDia,
        viagensTotais: recurso.viagensTotais,
        distanciaViagemKm: recurso.distanciaViagemKm,
        quilometrosTotais: recurso.quilometrosTotais,
        capacidadePorViagem: recurso.capacidadePorViagem,
        unidadeCapacidade: recurso.unidadeCapacidade,
        cargasTotais: recurso.cargasTotais,
        mesesTotais: recurso.mesesTotais,
        diasTrabalhadosMes: recurso.diasTrabalhadosMes
      }))
    )
  };
}

function mapAviso(mensagem: string, unidadeOperacionalId?: string | null, recursoId?: string | null): AvisoNucleoEngenharia {
  return {
    mensagem,
    unidadeOperacionalId,
    recursoId,
    severidade: "ALERTA"
  };
}

function mapMemoria(recurso: CostEngineResultado["memoria"][number]): MemoriaCalculoNucleo {
  return {
    unidadeOperacionalId: recurso.frenteRef,
    recursoId: recurso.recursoRef,
    descricao: recurso.descricao,
    formula: recurso.formula,
    observacoes: recurso.observacoes
  };
}

function mapRecurso(recurso: CostEngineResultado["memoria"][number]): ResultadoRecursoOperacionalNucleo {
  return {
    id: recurso.recursoRef,
    unidadeOperacionalId: recurso.frenteRef,
    referenciaTecnicaId: recurso.recursoReferenciaId ?? null,
    nomeTecnico: recurso.descricao,
    categoria: recurso.categoria,
    quantidadeRecursos: recurso.quantidadeRecursos,
    quantidadeOperacional: recurso.quantidadeOperacional,
    origemQuantidadeOperacional: recurso.origemQuantidadeOperacional,
    unidadeQuantidadeOperacional: recurso.unidadeQuantidadeOperacional,
    custoUnitario: recurso.custoOperacional,
    unidadeCustoOriginal: recurso.unidadeCustoOriginal,
    unidadeCustoFormatada: recurso.unidadeCustoFormatada,
    tipoCalculo: recurso.tipoCalculo,
    baseEconomica: recurso.unidadeEconomicaCusto,
    horasDia: recurso.horasDia,
    horasTotais: recurso.horasTotais,
    viagensDia: recurso.viagensDia,
    viagensTotais: recurso.viagensTotais,
    distanciaViagemKm: recurso.distanciaViagemKm,
    quilometrosTotais: recurso.quilometrosTotais,
    capacidadePorViagem: recurso.capacidadePorViagem,
    unidadeCapacidade: recurso.unidadeCapacidade,
    viagensTeoricas: recurso.viagensTeoricas,
    viagensOperacionais: recurso.viagensOperacionais,
    custoPorViagem: recurso.custoPorViagem,
    viagensMediasPorRecurso: recurso.viagensMediasPorRecurso,
    demandaLogisticaCalculavel: recurso.demandaLogisticaCalculavel,
    prazoUtilizadoDemanda: recurso.prazoUtilizadoDemanda,
    volumeDiarioExigidoFrota: recurso.volumeDiarioExigidoFrota,
    volumeDiarioExigidoPorRecurso: recurso.volumeDiarioExigidoPorCaminhao,
    viagensPorDiaFrota: recurso.viagensPorDiaFrota,
    viagensPorRecursoPorDia: recurso.viagensPorCaminhaoPorDia,
    cargasTotais: recurso.cargasTotais,
    mesesTotais: recurso.mesesTotais,
    diasTrabalhadosMes: recurso.diasTrabalhadosMes,
    custoTotal: recurso.custoTotal,
    custoUnitarioUnidadeOperacional: recurso.custoUnitarioFrente,
    statusCalculo: recurso.statusCalculo,
    memoriaCalculo: mapMemoria(recurso),
    avisos: recurso.observacoes.map((observacao) => mapAviso(observacao, recurso.frenteRef, recurso.recursoRef))
  };
}

function mapUnidade(
  frente: CostEngineResultado["frentes"][number],
  entrada?: EntradaNucleoEngenharia
): ResultadoUnidadeOperacionalNucleo {
  const unidadeEntrada = entrada?.unidades.find((unidade) => unidade.id === frente.ref);
  const economia = calcularResultadoEconomicoNucleo({
    receita: unidadeEntrada?.receita,
    custo: frente.custoDireto
  });

  return {
    id: frente.ref,
    nome: frente.nome,
    unidade: frente.unidade,
    quantidade: frente.quantidade,
    economia: {
      receita: economia.receita,
      resultado: economia.resultado,
      margemPercentual: economia.margemPercentual
    },
    produtividade: frente.produtividadeDia,
    produtividadeResultante: frente.produtividadeResultante,
    prazoTeorico: frente.prazoTeoricoDias,
    prazoAdotado: frente.prazoAdotadoDias,
    prazo: frente.prazoDias,
    prazoUnidade: frente.prazoUnidade,
    origemPrazo: frente.origemPrazo,
    custoOperacionalTotal: frente.custoDireto,
    custoOperacionalUnitario: frente.custoDiretoUnitario,
    modoCusto: frente.modoCusto,
    custoManual: frente.custoManual,
    custoCalculadoRecursos: frente.custoCalculadoRecursos,
    origemCusto: frente.origemCusto,
    recursos: frente.recursos.map(mapRecurso),
    avisos: frente.recursos.flatMap((recurso) =>
      recurso.observacoes.map((observacao) => mapAviso(observacao, frente.ref, recurso.recursoRef))
    )
  };
}

function mapGrupo(grupo: CostEngineResultado["gruposUnidade"][number]): GrupoUnidadeNucleo {
  return {
    unidade: grupo.unidade,
    quantidadeTotal: grupo.quantidadeTotal,
    producaoPrevistaDia: grupo.producaoPrevistaDia,
    prazoCritico: grupo.prazoCritico,
    prazoUnidade: grupo.prazoUnidade,
    custoOperacionalTotal: grupo.custoDireto,
    custoOperacionalUnitario: grupo.custoDiretoUnitario,
    unidadesOperacionais: grupo.frentes
  };
}

export function converterResultadoCostEngineParaNucleo(
  contextoDeCalculo: EntradaNucleoEngenharia["contextoDeCalculo"],
  resultado: CostEngineResultado,
  entrada?: EntradaNucleoEngenharia
): ResultadoNucleoEngenharia {
  const receitaTotal = entrada?.unidades.reduce(
    (total, unidade) => total + calcularResultadoEconomicoNucleo({
      receita: unidade.receita,
      custo: 0
    }).receita,
    0
  ) ?? 0;
  const economiaTotal = calcularResultadoEconomicoNucleo({
    receita: receitaTotal,
    custo: resultado.custoDiretoTotal
  });

  return {
    contextoDeCalculo,
    consolidado: {
      custoOperacionalTotal: resultado.custoDiretoTotal,
      economia: {
        receita: economiaTotal.receita,
        resultado: economiaTotal.resultado,
        margemPercentual: economiaTotal.margemPercentual
      },
      quantidadeTotal: resultado.quantidadeTotal,
      prazoEstimadoTotal: resultado.prazoEstimadoTotalDias,
      custoOperacionalUnitarioMedio: resultado.custoDiretoUnitarioMedio,
      unidadesHomogeneas: resultado.unidadesHomogeneas,
      prazoCritico: resultado.prazoCritico
        ? {
            unidadeOperacionalNome: resultado.prazoCritico.frenteNome,
            valor: resultado.prazoCritico.valor,
            unidade: resultado.prazoCritico.unidade
          }
        : null
    },
    unidades: resultado.frentes.map((frente) => mapUnidade(frente, entrada)),
    gruposUnidade: resultado.gruposUnidade.map(mapGrupo),
    memoriaCalculo: resultado.memoria.map(mapMemoria),
    avisos: resultado.avisos.map((aviso) => mapAviso(aviso))
  };
}

export function executarNucleoComMotorAtual(input: EntradaNucleoEngenharia): ResultadoNucleoEngenharia {
  const resultadoLegado = calcularMotorCustos(converterEntradaNucleoParaCostEngine(input));
  return converterResultadoCostEngineParaNucleo(input.contextoDeCalculo, resultadoLegado, input);
}
