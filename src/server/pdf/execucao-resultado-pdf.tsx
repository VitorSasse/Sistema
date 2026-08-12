import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
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
  dataCalculo?: string | null;
  versaoNucleo?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 26,
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
  companyInfo: {
    marginTop: 7,
    textAlign: "center",
    color: "#4f463c",
    fontSize: 7.2
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
  footer: {
    marginTop: 14,
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
  const empresa = props.empresaRelatorio;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {props.logoPath ? <Image src={props.logoPath} style={styles.logo} /> : null}
          <Text style={styles.title}>Relatorio de Execucao e Resultado</Text>
          <Text style={styles.subtitle}>Analise consolidada a partir do ultimo resultado calculado pelo Nucleo</Text>
          {empresa ? (
            <View style={styles.companyInfo}>
              <Text>{empresa.nome}</Text>
              <Text>CNPJ: {empresa.cnpj}</Text>
              <Text>{empresa.endereco}</Text>
              <Text>{empresa.cidadeUfCep}</Text>
              <Text>{empresa.telefones} | {empresa.email}</Text>
            </View>
          ) : null}
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
            <Info label="Emissao" value={dateTime(props.emitidoEm)} />
            <Info label="Snapshot" value={props.dataCalculo ? dateTime(new Date(props.dataCalculo)) : "Nao informado"} />
          </View>
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

        <Text style={styles.footer}>
          Relatorio gerado a partir do ultimo snapshot consolidado. Nao ha recalculo de custos neste documento.
          {props.versaoNucleo ? ` Versao do Nucleo: ${props.versaoNucleo}.` : ""}
        </Text>
      </Page>
    </Document>
  );
}
