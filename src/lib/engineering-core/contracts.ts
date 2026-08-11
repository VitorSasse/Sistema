import type { ContextoDeCalculo } from "./contexts";

export type NumeroTecnico = string | number | null | undefined;

export type OrigemValorTecnico = "INFORMADO" | "HERDADO" | "PERSONALIZADO" | "DERIVADO" | "SNAPSHOT";

export type OrigemQuantidadeOperacionalNucleo = "FRENTE" | "PERSONALIZADA";

export type OrigemPrazoNucleo = "AUTOMATICO" | "AJUSTADO";

export type ModoCustoUnidadeOperacional = "AUTO" | "MANUAL";

export type TipoCalculoRecursoOperacional = "AUTOMATICO" | "VALOR_TOTAL_MANUAL";

export type BaseEconomicaRecursoOperacional =
  | "CUSTO_FIXO"
  | "DIA"
  | "HORA"
  | "UNIDADE_PRODUZIDA"
  | "M3"
  | "M2"
  | "KM"
  | "VIAGEM"
  | "CARGA"
  | "MES"
  | "UNIDADE"
  | "VALOR_TOTAL";

export type MetadadosTecnicos = Record<string, string | number | boolean | null>;

export type FormaCalculoEncargoEconomicoNucleo = "PERCENTUAL_SOBRE_RECEITA" | "VALOR_INFORMADO";

export type OrigemEncargoEconomicoNucleo = "MANUAL" | "OUTRO_MODULO";

export type StatusEncargosEconomicosNucleo = "SEM_ENCARGOS" | "COM_ENCARGOS" | "ENCARGOS_PENDENTES";

export type EncargoEconomicoNucleoInput = {
  id?: string | null;
  tipo: string;
  descricao: string;
  formaCalculo: FormaCalculoEncargoEconomicoNucleo;
  percentual?: NumeroTecnico;
  valorInformado?: NumeroTecnico;
  observacao?: string | null;
  origem?: OrigemEncargoEconomicoNucleo;
};

export type ResultadoEncargoEconomicoNucleo = {
  id?: string | null;
  tipo: string;
  descricao: string;
  formaCalculo: FormaCalculoEncargoEconomicoNucleo;
  percentual: number | null;
  valorInformado: number | null;
  valorCalculado: number;
  origem: OrigemEncargoEconomicoNucleo;
  observacao?: string | null;
  status: "CALCULADO" | "PENDENTE";
};

export type ResultadoEconomicoNucleo = {
  receita: number;
  custo: number;
  encargosEconomicos: number;
  custoTotalExecucao: number;
  resultado: number;
  margemPercentual: number | null;
  statusEncargos: StatusEncargosEconomicosNucleo;
  encargos: ResultadoEncargoEconomicoNucleo[];
};

export type ValorComOrigem<TValue = NumeroTecnico> = {
  valor: TValue;
  unidade?: string | null;
  origem?: OrigemValorTecnico;
};

export type RecursoOperacionalNucleoInput = {
  id?: string | null;
  unidadeOperacionalId: string;
  nomeTecnico?: string | null;
  descricaoTecnica?: string | null;
  categoria?: string | null;
  classeOperacional?: string | null;
  referenciaTecnicaId?: string | null;
  quantidadeRecursos?: NumeroTecnico;
  quantidadeOperacional?: NumeroTecnico;
  origemQuantidadeOperacional?: OrigemQuantidadeOperacionalNucleo | null;
  unidadeQuantidadeOperacional?: string | null;
  custoUnitario?: NumeroTecnico;
  unidadeCusto?: string | null;
  tipoCalculo?: TipoCalculoRecursoOperacional | null;
  baseEconomica?: BaseEconomicaRecursoOperacional | null;
  valorCusto?: NumeroTecnico;
  horasDia?: NumeroTecnico;
  horasTotais?: NumeroTecnico;
  viagensDia?: NumeroTecnico;
  viagensTotais?: NumeroTecnico;
  distanciaViagemKm?: NumeroTecnico;
  quilometrosTotais?: NumeroTecnico;
  capacidadePorViagem?: NumeroTecnico;
  unidadeCapacidade?: string | null;
  cargasTotais?: NumeroTecnico;
  mesesTotais?: NumeroTecnico;
  diasTrabalhadosMes?: NumeroTecnico;
  origem?: OrigemValorTecnico;
  metadados?: MetadadosTecnicos;
};

export type UnidadeOperacionalNucleoInput = {
  id: string;
  nome?: string | null;
  descricaoTecnica?: string | null;
  quantidade?: NumeroTecnico;
  unidade?: string | null;
  receita?: NumeroTecnico;
  produtividade?: NumeroTecnico;
  prazoEstimado?: NumeroTecnico;
  prazoTeorico?: NumeroTecnico;
  prazoAdotado?: NumeroTecnico;
  origemPrazo?: OrigemPrazoNucleo | null;
  modoCusto?: ModoCustoUnidadeOperacional | null;
  custoManual?: NumeroTecnico;
  recursos: RecursoOperacionalNucleoInput[];
  metadados?: MetadadosTecnicos;
};

export type EntradaNucleoEngenharia = {
  contextoDeCalculo: ContextoDeCalculo;
  analiseId?: string | null;
  nomeTecnico?: string | null;
  metadados?: MetadadosTecnicos;
  encargosEconomicos?: EncargoEconomicoNucleoInput[];
  unidades: UnidadeOperacionalNucleoInput[];
};

export type AvisoNucleoEngenharia = {
  codigo?: string;
  mensagem: string;
  unidadeOperacionalId?: string | null;
  recursoId?: string | null;
  severidade?: "INFO" | "ALERTA" | "BLOQUEIO";
};

export type MemoriaCalculoNucleo = {
  unidadeOperacionalId: string;
  recursoId?: string | null;
  descricao: string;
  formula: string;
  observacoes: string[];
};

export type StatusCalculoRecursoNucleo = "CALCULADO" | "PENDENTE" | "SEM_CUSTO" | "NAO_INFORMADO";

export type ResultadoRecursoOperacionalNucleo = {
  id: string;
  recursoRealizadoId?: string | null;
  recursoBoletimId?: string | null;
  origemRegistroTipo?: string | null;
  origemRegistroId?: string | null;
  componenteEconomico?: string | null;
  unidadeOperacionalId: string;
  referenciaTecnicaId?: string | null;
  nomeTecnico: string;
  categoria: string;
  quantidadeRecursos: number;
  quantidadeOperacional: number;
  origemQuantidadeOperacional: OrigemQuantidadeOperacionalNucleo;
  unidadeQuantidadeOperacional: string;
  custoUnitario: number;
  unidadeCustoOriginal: string;
  unidadeCustoFormatada: string;
  tipoCalculo: TipoCalculoRecursoOperacional;
  baseEconomica: BaseEconomicaRecursoOperacional;
  horasDia: number;
  horasTotais: number;
  viagensDia: number;
  viagensTotais: number;
  distanciaViagemKm: number;
  quilometrosTotais: number;
  capacidadePorViagem: number;
  unidadeCapacidade: string;
  viagensTeoricas: number;
  viagensOperacionais: number;
  custoPorViagem: number;
  viagensMediasPorRecurso: number;
  demandaLogisticaCalculavel: boolean;
  prazoUtilizadoDemanda: number;
  volumeDiarioExigidoFrota: number;
  volumeDiarioExigidoPorRecurso: number;
  viagensPorDiaFrota: number;
  viagensPorRecursoPorDia: number;
  cargasTotais: number;
  mesesTotais: number;
  diasTrabalhadosMes: number;
  custoTotal: number;
  componentesEconomicos?: Array<{
    id: string;
    tipo: string | null;
    nomeTecnico: string;
    baseEconomica: BaseEconomicaRecursoOperacional;
    custoUnitario: number;
    unidadeCustoFormatada: string;
    quantidadeOperacional: number;
    unidadeQuantidadeOperacional: string;
    custoTotal: number;
    statusCalculo: StatusCalculoRecursoNucleo;
  }>;
  custoUnitarioUnidadeOperacional: number;
  statusCalculo: StatusCalculoRecursoNucleo;
  memoriaCalculo: MemoriaCalculoNucleo;
  avisos: AvisoNucleoEngenharia[];
};

export type ResultadoUnidadeOperacionalNucleo = {
  id: string;
  nome: string;
  unidade: string;
  quantidade: number;
  economia?: ResultadoEconomicoNucleo;
  produtividade: number;
  produtividadeResultante: number;
  prazoTeorico: number;
  prazoAdotado: number;
  prazo: number;
  prazoUnidade: string;
  origemPrazo: OrigemPrazoNucleo;
  custoOperacionalTotal: number;
  custoOperacionalUnitario: number;
  modoCusto: ModoCustoUnidadeOperacional;
  custoManual: number;
  custoCalculadoRecursos: number;
  origemCusto: "RECURSOS" | "MANUAL";
  recursos: ResultadoRecursoOperacionalNucleo[];
  avisos: AvisoNucleoEngenharia[];
};

export type GrupoUnidadeNucleo = {
  unidade: string;
  quantidadeTotal: number;
  producaoPrevistaDia: number;
  prazoCritico: number;
  prazoUnidade: string;
  custoOperacionalTotal: number;
  custoOperacionalUnitario: number;
  unidadesOperacionais: string[];
};

export type ResultadoNucleoEngenharia = {
  contextoDeCalculo: ContextoDeCalculo;
  consolidado: {
    custoOperacionalTotal: number;
    economia?: ResultadoEconomicoNucleo;
    quantidadeTotal: number;
    prazoEstimadoTotal: number;
    custoOperacionalUnitarioMedio: number;
    unidadesHomogeneas: boolean;
    prazoCritico: {
      unidadeOperacionalNome: string;
      valor: number;
      unidade: string;
    } | null;
  };
  unidades: ResultadoUnidadeOperacionalNucleo[];
  gruposUnidade: GrupoUnidadeNucleo[];
  memoriaCalculo: MemoriaCalculoNucleo[];
  avisos: AvisoNucleoEngenharia[];
};
