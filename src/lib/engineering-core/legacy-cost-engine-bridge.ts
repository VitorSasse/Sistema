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
  RecursoOperacionalNucleoInput,
  ResultadoNucleoEngenharia,
  ResultadoRecursoOperacionalNucleo,
  StatusCalculoRecursoNucleo,
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

function metadadoString(
  recursoEntrada: RecursoOperacionalNucleoInput | undefined,
  key: string
) {
  const value = recursoEntrada?.metadados?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function mapRecurso(
  recurso: CostEngineResultado["memoria"][number],
  recursoEntrada?: RecursoOperacionalNucleoInput
): ResultadoRecursoOperacionalNucleo {
  const recursoRealizadoId = metadadoString(recursoEntrada, "recursoRealizadoId") ?? recursoEntrada?.id ?? recurso.recursoRef;
  const recursoBoletimId = metadadoString(recursoEntrada, "recursoBoletimId") ?? recursoRealizadoId;

  return {
    id: recurso.recursoRef,
    recursoRealizadoId,
    recursoBoletimId,
    origemRegistroTipo: metadadoString(recursoEntrada, "origemRegistroTipo"),
    origemRegistroId: metadadoString(recursoEntrada, "origemRegistroId"),
    componenteEconomico: metadadoString(recursoEntrada, "componenteEconomico"),
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

function componenteResumo(recurso: ResultadoRecursoOperacionalNucleo) {
  return {
    id: recurso.id,
    tipo: recurso.componenteEconomico ?? null,
    nomeTecnico: recurso.nomeTecnico,
    baseEconomica: recurso.baseEconomica,
    custoUnitario: recurso.custoUnitario,
    unidadeCustoFormatada: recurso.unidadeCustoFormatada,
    quantidadeOperacional: recurso.quantidadeOperacional,
    unidadeQuantidadeOperacional: recurso.unidadeQuantidadeOperacional,
    custoTotal: recurso.custoTotal,
    statusCalculo: recurso.statusCalculo
  };
}

function componenteStatusNaoRetornado(recursoEntrada: RecursoOperacionalNucleoInput): StatusCalculoRecursoNucleo {
  const statusEconomico = recursoEntrada.metadados?.statusEconomico;
  if (statusEconomico === "SEM_CUSTO") return "SEM_CUSTO";
  if (statusEconomico === "NAO_INFORMADO") return "NAO_INFORMADO";
  return "PENDENTE";
}

function mapRecursoNaoRetornado(recursoEntrada: RecursoOperacionalNucleoInput): ResultadoRecursoOperacionalNucleo {
  const id = recursoEntrada.id ?? metadadoString(recursoEntrada, "recursoRealizadoId") ?? "recurso-sem-id";
  const recursoRealizadoId = metadadoString(recursoEntrada, "recursoRealizadoId") ?? id;
  const recursoBoletimId = metadadoString(recursoEntrada, "recursoBoletimId") ?? recursoRealizadoId;
  const statusCalculo = componenteStatusNaoRetornado(recursoEntrada);
  const componenteEconomico = metadadoString(recursoEntrada, "componenteEconomico");
  const observacao = statusCalculo === "SEM_CUSTO"
    ? "Componente sem custo econômico aplicável."
    : "Componente enviado ao Núcleo, mas não retornou custo calculado pelo Motor.";

  return {
    id,
    recursoRealizadoId,
    recursoBoletimId,
    origemRegistroTipo: metadadoString(recursoEntrada, "origemRegistroTipo"),
    origemRegistroId: metadadoString(recursoEntrada, "origemRegistroId"),
    componenteEconomico,
    unidadeOperacionalId: recursoEntrada.unidadeOperacionalId,
    referenciaTecnicaId: recursoEntrada.referenciaTecnicaId ?? null,
    nomeTecnico: recursoEntrada.nomeTecnico ?? "Recurso",
    categoria: recursoEntrada.categoria ?? "RECURSO",
    quantidadeRecursos: Number(recursoEntrada.quantidadeRecursos ?? 0),
    quantidadeOperacional: Number(recursoEntrada.quantidadeOperacional ?? 0),
    origemQuantidadeOperacional: recursoEntrada.origemQuantidadeOperacional ?? "PERSONALIZADA",
    unidadeQuantidadeOperacional: recursoEntrada.unidadeQuantidadeOperacional ?? "",
    custoUnitario: Number(recursoEntrada.custoUnitario ?? recursoEntrada.valorCusto ?? 0),
    unidadeCustoOriginal: recursoEntrada.unidadeCusto ?? "",
    unidadeCustoFormatada: recursoEntrada.unidadeCusto ?? "",
    tipoCalculo: recursoEntrada.tipoCalculo ?? "AUTOMATICO",
    baseEconomica: recursoEntrada.baseEconomica ?? "UNIDADE",
    horasDia: Number(recursoEntrada.horasDia ?? 0),
    horasTotais: Number(recursoEntrada.horasTotais ?? 0),
    viagensDia: Number(recursoEntrada.viagensDia ?? 0),
    viagensTotais: Number(recursoEntrada.viagensTotais ?? 0),
    distanciaViagemKm: Number(recursoEntrada.distanciaViagemKm ?? 0),
    quilometrosTotais: Number(recursoEntrada.quilometrosTotais ?? 0),
    capacidadePorViagem: Number(recursoEntrada.capacidadePorViagem ?? 0),
    unidadeCapacidade: recursoEntrada.unidadeCapacidade ?? "",
    viagensTeoricas: 0,
    viagensOperacionais: 0,
    custoPorViagem: 0,
    viagensMediasPorRecurso: 0,
    demandaLogisticaCalculavel: false,
    prazoUtilizadoDemanda: 0,
    volumeDiarioExigidoFrota: 0,
    volumeDiarioExigidoPorRecurso: 0,
    viagensPorDiaFrota: 0,
    viagensPorRecursoPorDia: 0,
    cargasTotais: Number(recursoEntrada.cargasTotais ?? 0),
    mesesTotais: Number(recursoEntrada.mesesTotais ?? 0),
    diasTrabalhadosMes: Number(recursoEntrada.diasTrabalhadosMes ?? 0),
    custoTotal: 0,
    custoUnitarioUnidadeOperacional: 0,
    statusCalculo,
    memoriaCalculo: {
      unidadeOperacionalId: recursoEntrada.unidadeOperacionalId,
      recursoId: recursoBoletimId,
      descricao: recursoEntrada.nomeTecnico ?? "Recurso",
      formula: statusCalculo === "SEM_CUSTO" ? "Componente sem custo." : "Pendente de cálculo pelo Motor.",
      observacoes: [observacao]
    },
    avisos: [mapAviso(observacao, recursoEntrada.unidadeOperacionalId, recursoEntrada.id)]
  };
}

function agregarComponentesPorRecurso(
  recursos: ResultadoRecursoOperacionalNucleo[]
): ResultadoRecursoOperacionalNucleo[] {
  const grupos = new Map<string, ResultadoRecursoOperacionalNucleo[]>();

  for (const recurso of recursos) {
    const chave = recurso.recursoBoletimId ?? recurso.recursoRealizadoId ?? recurso.id;
    grupos.set(chave, [...(grupos.get(chave) ?? []), recurso]);
  }

  return Array.from(grupos.values()).map((grupo) => {
    if (grupo.length === 1 && !grupo[0].componenteEconomico) {
      return grupo[0];
    }

    const principal = grupo[0];
    const custoTotal = grupo.reduce((total, recurso) => total + recurso.custoTotal, 0);
    const avisos = grupo.flatMap((recurso) => recurso.avisos);
    const componentes = grupo.map(componenteResumo);
    const algumCalculado = grupo.some((recurso) => recurso.statusCalculo === "CALCULADO");
    const algumPendente = grupo.some((recurso) => recurso.statusCalculo === "PENDENTE" || recurso.statusCalculo === "NAO_INFORMADO");
    const todosSemCusto = grupo.every((recurso) => recurso.statusCalculo === "SEM_CUSTO");
    const statusCalculo: StatusCalculoRecursoNucleo = algumPendente
      ? "PENDENTE"
      : todosSemCusto && !algumCalculado
        ? "SEM_CUSTO"
        : "CALCULADO";

    return {
      ...principal,
      id: principal.recursoBoletimId ?? principal.recursoRealizadoId ?? principal.id,
      componenteEconomico: "TOTAL",
      nomeTecnico: principal.nomeTecnico,
      custoTotal: Math.round((custoTotal + Number.EPSILON) * 100) / 100,
      statusCalculo,
      componentesEconomicos: componentes,
      avisos,
      memoriaCalculo: {
        unidadeOperacionalId: principal.unidadeOperacionalId,
        recursoId: principal.recursoBoletimId ?? principal.recursoRealizadoId ?? principal.id,
        descricao: principal.nomeTecnico,
        formula: componentes
          .map((componente) => `${componente.tipo ?? "COMPONENTE"}: ${componente.custoTotal}`)
          .join(" + "),
        observacoes: ["Custo total composto pelo engineering-core a partir dos componentes calculados pelo Motor."]
      }
    };
  });
}

function mapUnidade(
  frente: CostEngineResultado["frentes"][number],
  entrada?: EntradaNucleoEngenharia
): ResultadoUnidadeOperacionalNucleo {
  const unidadeEntrada = entrada?.unidades.find((unidade) => unidade.id === frente.ref);
  const recursosEntradaPorId = new Map((unidadeEntrada?.recursos ?? [])
    .filter((recurso) => recurso.id)
    .map((recurso) => [recurso.id as string, recurso]));
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
    recursos: (() => {
      const idsRetornados = new Set<string>();
      const recursosCalculados = frente.recursos.map((recurso) => {
        const recursoEntrada = recursosEntradaPorId.get(recurso.recursoRef)
        ?? unidadeEntrada?.recursos.find((entradaRecurso) =>
          Boolean(entradaRecurso.referenciaTecnicaId) &&
          entradaRecurso.referenciaTecnicaId === recurso.recursoReferenciaId &&
          entradaRecurso.nomeTecnico === recurso.descricao
        );
        if (recursoEntrada?.id) idsRetornados.add(recursoEntrada.id);
        return mapRecurso(recurso, recursoEntrada);
      });
      const recursosNaoRetornados = (unidadeEntrada?.recursos ?? [])
        .filter((recurso) => recurso.id && !idsRetornados.has(recurso.id))
        .map(mapRecursoNaoRetornado);

      return agregarComponentesPorRecurso([...recursosCalculados, ...recursosNaoRetornados]);
    })(),
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
