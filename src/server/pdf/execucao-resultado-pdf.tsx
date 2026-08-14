import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { DocumentoRodape } from "@/server/pdf/documento-rodape";
import type { EmpresaRelatorioPdf } from "@/server/pdf/empresa-relatorio";

export type ExecucaoRelatorioRecurso = {
  id?: string | null;
  recurso: string;
  quantidade: number | null;
  unidade: string | null;
  material?: string | null;
  baseEconomica?: string | null;
  custoUnitario?: number | null;
  unidadeCusto?: string | null;
  custoRealizado?: number | null;
};

export type ExecucaoRelatorioEncargo = {
  descricao: string;
  formaCalculo: string;
  percentual?: number | null;
  valor?: number | null;
};

export type ExecucaoRelatorioBoletim = {
  data: Date;
  status: string;
  recursosCount: number;
};

export type ExecucaoRelatorioComparativoValor = {
  previsto: number | null;
  realizado: number | null;
  desvioAbsoluto: number | null;
  desvioPercentual: number | null;
};

export type ExecucaoRelatorioDesvioOperacional = {
  recurso: string;
  status: "CORRESPONDENTE" | "SOMENTE_PREVISTO" | "SOMENTE_REALIZADO" | "COMPARACAO_LIMITADA";
  dimensao?: string | null;
  unidade?: string | null;
  quantidade: ExecucaoRelatorioComparativoValor;
  custo: ExecucaoRelatorioComparativoValor;
};

export type ExecucaoRelatorioComparativoFrente = {
  frente: string;
  unidade?: string | null;
  motivoVariacaoReceita?: string | null;
  quantidade: ExecucaoRelatorioComparativoValor;
  receita: ExecucaoRelatorioComparativoValor;
  custo: ExecucaoRelatorioComparativoValor;
  resultado: ExecucaoRelatorioComparativoValor;
  margem: ExecucaoRelatorioComparativoValor;
  desviosOperacionais: ExecucaoRelatorioDesvioOperacional[];
};

export type ExecucaoResultadoPdfProps = {
  logoPath?: string | null;
  empresaRelatorio?: EmpresaRelatorioPdf;
  emitidoEm: Date;
  identificacao: {
    empresa?: string | null;
    cliente?: string | null;
    obra?: string | null;
    servico?: string | null;
    descricao?: string | null;
    situacao?: string | null;
    periodo?: string | null;
    referenciaOrcamento?: string | null;
  };
  resumo: {
    receita: number | null;
    custoOperacional: number | null;
    encargos: number | null;
    custoTotalExecucao: number | null;
    resultado: number | null;
    margemPercentual: number | null;
    statusEncargos?: string | null;
  };
  recursos: ExecucaoRelatorioRecurso[];
  encargos: ExecucaoRelatorioEncargo[];
  boletins: ExecucaoRelatorioBoletim[];
  comparativo?: ExecucaoRelatorioComparativoFrente[];
  resultadoProvisorio?: boolean;
  dataCalculo?: string | null;
  versaoNucleo?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 54,
    paddingHorizontal: 24,
    fontSize: 8.4,
    fontFamily: "Helvetica",
    color: "#241f1a"
  },
  header: {
    alignItems: "center",
    marginBottom: 16
  },
  logo: {
    width: 190,
    height: 58,
    objectFit: "contain",
    marginBottom: 10
  },
  title: {
    fontSize: 16,
    marginBottom: 3
  },
  subtitle: {
    fontSize: 8.6,
    color: "#6f675d"
  },
  section: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#d8d0c3",
    paddingTop: 9
  },
  sectionTitle: {
    fontSize: 10.5,
    marginBottom: 7
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 5,
    columnGap: 9
  },
  infoItem: {
    width: "31%"
  },
  infoLabel: {
    color: "#7a7064",
    fontSize: 7.2,
    marginBottom: 2
  },
  infoValue: {
    fontSize: 8.2
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  summaryCard: {
    width: "31.7%",
    borderWidth: 1,
    borderColor: "#ded6ca",
    borderRadius: 8,
    padding: 7,
    backgroundColor: "#fffaf2"
  },
  summaryLabel: {
    fontSize: 7.2,
    color: "#766d62",
    marginBottom: 3
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 700
  },
  note: {
    marginTop: 7,
    color: "#766d62",
    fontSize: 7.6
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1eadf",
    borderBottomWidth: 1,
    borderBottomColor: "#c4b8aa",
    paddingVertical: 5
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ece5da",
    paddingVertical: 5
  },
  cell: {
    paddingHorizontal: 3
  },
  right: {
    textAlign: "right"
  },
  center: {
    textAlign: "center"
  },
  resourceName: {
    width: "25%"
  },
  resourceQty: {
    width: "9%"
  },
  resourceUnit: {
    width: "8%"
  },
  resourceMaterial: {
    width: "18%"
  },
  resourceBase: {
    width: "10%"
  },
  resourceUnitCost: {
    width: "15%"
  },
  resourceCost: {
    width: "15%"
  },
  encargoDesc: {
    width: "38%"
  },
  encargoForma: {
    width: "28%"
  },
  encargoPercent: {
    width: "14%"
  },
  encargoValor: {
    width: "20%"
  },
  boletimData: {
    width: "28%"
  },
  boletimStatus: {
    width: "36%"
  },
  boletimCount: {
    width: "36%"
  },
  comparisonName: {
    width: "22%"
  },
  comparisonValue: {
    width: "19.5%"
  },
  comparisonStatus: {
    width: "19%"
  },
  emphasisRow: {
    backgroundColor: "#fff4e8"
  },
  deviationResource: {
    width: "30%"
  },
  deviationValue: {
    width: "17%"
  },
  deviationStatus: {
    width: "19%"
  },
  technicalNote: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#d8d0c3",
    paddingTop: 7,
    color: "#7a7064",
    fontSize: 7.2
  }
});

function valueOrEmpty(value?: string | null) {
  return value?.trim() || "Nao informado";
}

function date(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value);
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(value);
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Nao informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function number(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Nao informado";
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(value)}${suffix}`;
}

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Nao informado";
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`;
}

function percentagePoints(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Nao informado";
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)} p.p.`;
}

function variance(value: ExecucaoRelatorioComparativoValor, formatter: (value: number | null | undefined) => string) {
  const absoluto = formatter(value.desvioAbsoluto);
  const percentual = value.desvioPercentual === null ? "Nao informado" : percent(value.desvioPercentual);
  return `${absoluto} (${percentual})`;
}

function operationalVariance(value: ExecucaoRelatorioComparativoValor, unidade?: string | null) {
  return number(value.desvioAbsoluto, unidade ? ` ${unidade}` : "");
}

function statusLabel(status: ExecucaoRelatorioDesvioOperacional["status"]) {
  if (status === "SOMENTE_PREVISTO") return "Previsto, nao utilizado";
  if (status === "SOMENTE_REALIZADO") return "Nao previsto, utilizado";
  if (status === "COMPARACAO_LIMITADA") return "Comparacao limitada";
  return "Previsto e realizado";
}

function indicatorRows(frente: ExecucaoRelatorioComparativoFrente) {
  return [
    {
      label: "Quantidade",
      previsto: number(frente.quantidade.previsto, frente.unidade ? ` ${frente.unidade}` : ""),
      realizado: number(frente.quantidade.realizado, frente.unidade ? ` ${frente.unidade}` : ""),
      desvio: variance(frente.quantidade, (value) => number(value, frente.unidade ? ` ${frente.unidade}` : "")),
      emphasis: false
    },
    {
      label: "Receita",
      previsto: money(frente.receita.previsto),
      realizado: money(frente.receita.realizado),
      desvio: variance(frente.receita, money),
      emphasis: false
    },
    {
      label: "Custo",
      previsto: money(frente.custo.previsto),
      realizado: money(frente.custo.realizado),
      desvio: variance(frente.custo, money),
      emphasis: true
    },
    {
      label: "Resultado",
      previsto: money(frente.resultado.previsto),
      realizado: money(frente.resultado.realizado),
      desvio: variance(frente.resultado, money),
      emphasis: true
    },
    {
      label: "Margem",
      previsto: percent(frente.margem.previsto),
      realizado: percent(frente.margem.realizado),
      desvio: percentagePoints(frente.margem.desvioAbsoluto),
      emphasis: true
    }
  ];
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export function ExecucaoResultadoPdfDocument(props: ExecucaoResultadoPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {props.logoPath ? <Image src={props.logoPath} style={styles.logo} /> : null}
          <Text style={styles.title}>Relatorio de Execucao e Resultado</Text>
          <Text style={styles.subtitle}>Analise consolidada a partir do ultimo resultado calculado pelo Nucleo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identificacao</Text>
          <View style={styles.infoGrid}>
            <Info label="Empresa" value={valueOrEmpty(props.identificacao.empresa)} />
            <Info label="Cliente" value={valueOrEmpty(props.identificacao.cliente)} />
            <Info label="Obra" value={valueOrEmpty(props.identificacao.obra)} />
            <Info label="Servico / Frente" value={valueOrEmpty(props.identificacao.servico)} />
            <Info label="Descricao" value={valueOrEmpty(props.identificacao.descricao)} />
            <Info label="Situacao" value={valueOrEmpty(props.identificacao.situacao)} />
            <Info label="Periodo" value={valueOrEmpty(props.identificacao.periodo)} />
            <Info label="Referencia orcamento" value={valueOrEmpty(props.identificacao.referenciaOrcamento)} />
            <Info label="Emissao" value={dateTime(props.emitidoEm)} />
            <Info label="Consolidado em" value={props.dataCalculo ? dateTime(new Date(props.dataCalculo)) : "Nao informado"} />
          </View>
          {props.resultadoProvisorio ? (
            <Text style={styles.note}>Resultado provisorio para conferencia: existem boletins ainda abertos considerados no calculo.</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo economico</Text>
          <View style={styles.summaryGrid}>
            <Summary label="Receita realizada / contratada" value={money(props.resumo.receita)} />
            <Summary label="Custo operacional realizado" value={money(props.resumo.custoOperacional)} />
            <Summary label="Encargos economicos" value={props.resumo.statusEncargos === "SEM_ENCARGOS" ? "Sem encargos aplicaveis" : money(props.resumo.encargos)} />
            <Summary label="Custo total da execucao" value={money(props.resumo.custoTotalExecucao)} />
            <Summary label="Resultado realizado" value={money(props.resumo.resultado)} />
            <Summary label="Margem realizada" value={percent(props.resumo.margemPercentual)} />
          </View>
          {props.resumo.statusEncargos === "SEM_ENCARGOS" ? (
            <Text style={styles.note}>Esta execucao esta configurada sem encargos economicos aplicaveis.</Text>
          ) : null}
        </View>

        {props.comparativo?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Previsto x Realizado</Text>
            {props.comparativo.map((frente, index) => (
              <View key={`${frente.frente}-${index}`} wrap={false}>
                <Text style={styles.note}>{frente.frente}</Text>
                {frente.motivoVariacaoReceita ? (
                  <Text style={styles.note}>Motivo da variacao de receita: {frente.motivoVariacaoReceita}</Text>
                ) : null}
                <View style={styles.tableHeader}>
                  <Text style={[styles.cell, styles.comparisonName]}>Indicador</Text>
                  <Text style={[styles.cell, styles.comparisonValue, styles.right]}>Previsto</Text>
                  <Text style={[styles.cell, styles.comparisonValue, styles.right]}>Realizado</Text>
                  <Text style={[styles.cell, styles.comparisonValue, styles.right]}>Desvio</Text>
                  <Text style={[styles.cell, styles.comparisonStatus]}>Leitura</Text>
                </View>
                {indicatorRows(frente).map((row) => (
                  <View key={`${frente.frente}-${row.label}`} style={[styles.row, row.emphasis ? styles.emphasisRow : {}]}>
                    <Text style={[styles.cell, styles.comparisonName]}>{row.label}</Text>
                    <Text style={[styles.cell, styles.comparisonValue, styles.right]}>{row.previsto}</Text>
                    <Text style={[styles.cell, styles.comparisonValue, styles.right]}>{row.realizado}</Text>
                    <Text style={[styles.cell, styles.comparisonValue, styles.right]}>{row.desvio}</Text>
                    <Text style={[styles.cell, styles.comparisonStatus]}>{row.emphasis ? "Indicador principal" : "Indicador de apoio"}</Text>
                  </View>
                ))}
              </View>
            ))}
            <Text style={styles.note}>Valores previstos vem da referencia historica da execucao. Valores realizados vem do ultimo resultado calculado.</Text>
          </View>
        ) : null}

        {props.comparativo?.some((frente) => frente.desviosOperacionais.length) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo dos desvios operacionais</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.deviationResource]}>Recurso</Text>
              <Text style={[styles.cell, styles.deviationValue, styles.right]}>Previsto</Text>
              <Text style={[styles.cell, styles.deviationValue, styles.right]}>Realizado</Text>
              <Text style={[styles.cell, styles.deviationValue, styles.right]}>Desvio operacional</Text>
              <Text style={[styles.cell, styles.deviationValue, styles.right]}>Impacto custo</Text>
              <Text style={[styles.cell, styles.deviationStatus]}>Status</Text>
            </View>
            {props.comparativo.flatMap((frente) => frente.desviosOperacionais.map((desvio, index) => (
              <View key={`${frente.frente}-${desvio.recurso}-${desvio.status}-${index}`} style={styles.row}>
                <Text style={[styles.cell, styles.deviationResource]}>{desvio.recurso}</Text>
                <Text style={[styles.cell, styles.deviationValue, styles.right]}>
                  {number(desvio.quantidade.previsto, desvio.unidade ? ` ${desvio.unidade}` : "")}
                </Text>
                <Text style={[styles.cell, styles.deviationValue, styles.right]}>
                  {number(desvio.quantidade.realizado, desvio.unidade ? ` ${desvio.unidade}` : "")}
                </Text>
                <Text style={[styles.cell, styles.deviationValue, styles.right]}>{operationalVariance(desvio.quantidade, desvio.unidade)}</Text>
                <Text style={[styles.cell, styles.deviationValue, styles.right]}>{money(desvio.custo.desvioAbsoluto)}</Text>
                <Text style={[styles.cell, styles.deviationStatus]}>{statusLabel(desvio.status)}</Text>
              </View>
            )))}
            <Text style={styles.note}>Este bloco lista somente recursos com diferenca operacional ou de custo no comparativo.</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recursos realizados</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.resourceName]}>Recurso</Text>
            <Text style={[styles.cell, styles.resourceQty, styles.right]}>Qtd</Text>
            <Text style={[styles.cell, styles.resourceUnit]}>Un</Text>
            <Text style={[styles.cell, styles.resourceMaterial]}>Material</Text>
            <Text style={[styles.cell, styles.resourceBase]}>Base</Text>
            <Text style={[styles.cell, styles.resourceUnitCost, styles.right]}>Custo unit.</Text>
            <Text style={[styles.cell, styles.resourceCost, styles.right]}>Custo realizado</Text>
          </View>
          {props.recursos.map((recurso, index) => (
            <View key={`${recurso.id ?? index}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.resourceName]}>{recurso.recurso}</Text>
              <Text style={[styles.cell, styles.resourceQty, styles.right]}>{number(recurso.quantidade)}</Text>
              <Text style={[styles.cell, styles.resourceUnit]}>{recurso.unidade ?? "-"}</Text>
              <Text style={[styles.cell, styles.resourceMaterial]}>{recurso.material || "-"}</Text>
              <Text style={[styles.cell, styles.resourceBase]}>{recurso.baseEconomica ?? "-"}</Text>
              <Text style={[styles.cell, styles.resourceUnitCost, styles.right]}>{money(recurso.custoUnitario)} {recurso.unidadeCusto ?? ""}</Text>
              <Text style={[styles.cell, styles.resourceCost, styles.right]}>{money(recurso.custoRealizado)}</Text>
            </View>
          ))}
          {!props.recursos.length ? (
            <Text style={styles.note}>Nenhum recurso presente no ultimo resultado consolidado.</Text>
          ) : null}
        </View>

        {props.encargos.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Encargos economicos</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.encargoDesc]}>Descricao</Text>
              <Text style={[styles.cell, styles.encargoForma]}>Forma</Text>
              <Text style={[styles.cell, styles.encargoPercent, styles.right]}>Percentual</Text>
              <Text style={[styles.cell, styles.encargoValor, styles.right]}>Valor</Text>
            </View>
            {props.encargos.map((encargo, index) => (
              <View key={`${encargo.descricao}-${index}`} style={styles.row}>
                <Text style={[styles.cell, styles.encargoDesc]}>{encargo.descricao}</Text>
                <Text style={[styles.cell, styles.encargoForma]}>{encargo.formaCalculo}</Text>
                <Text style={[styles.cell, styles.encargoPercent, styles.right]}>{encargo.percentual === null || encargo.percentual === undefined ? "-" : percent(encargo.percentual)}</Text>
                <Text style={[styles.cell, styles.encargoValor, styles.right]}>{money(encargo.valor)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boletins considerados</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.boletimData]}>Data</Text>
            <Text style={[styles.cell, styles.boletimStatus]}>Status</Text>
            <Text style={[styles.cell, styles.boletimCount, styles.right]}>Recursos / fatos</Text>
          </View>
          {props.boletins.map((boletim, index) => (
            <View key={`${boletim.data.toISOString()}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.boletimData]}>{date(boletim.data)}</Text>
              <Text style={[styles.cell, styles.boletimStatus]}>{boletim.status}</Text>
              <Text style={[styles.cell, styles.boletimCount, styles.right]}>{number(boletim.recursosCount)}</Text>
            </View>
          ))}
          {!props.boletins.length ? (
            <Text style={styles.note}>Nenhum boletim vinculado a esta execucao.</Text>
          ) : null}
        </View>

        <Text style={styles.technicalNote}>
          Relatorio gerado com base no ultimo resultado consolidado. Os custos nao sao recalculados durante a emissao deste documento.
          {props.versaoNucleo ? ` Sistema de calculo: ${props.versaoNucleo}.` : ""}
        </Text>

        <DocumentoRodape
          centerText={`Emitido em: ${dateTime(props.emitidoEm)}${props.dataCalculo ? ` | Consolidado em: ${dateTime(new Date(props.dataCalculo))}` : ""}`}
        />
      </Page>
    </Document>
  );
}
