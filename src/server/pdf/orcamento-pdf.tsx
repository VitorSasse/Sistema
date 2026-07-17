import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDateDisplay } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatters";
import { buildEmpresaRelatorioPdf, type EmpresaRelatorioPdf } from "@/server/pdf/empresa-relatorio";
import { formatarUnidadeComercial } from "@/server/pdf/orcamento-proposta";

type OrcamentoPdfProps = {
  codigo: string;
  revisao: number;
  dataEmissao: Date;
  modoDocumento?: "PREVIEW" | "OFICIAL";
  tipo: string;
  status: string;
  dataOrcamento: Date;
  validadeAte: Date | null;
  titulo: string | null;
  objeto: string | null;
  observacaoCliente: string | null;
  valorTotal: number;
  cliente: {
    codigo?: string | null;
    nome: string;
    nomeFantasia?: string | null;
    cnpj?: string | null;
    cpf?: string | null;
    telefone?: string | null;
    email?: string | null;
  };
  obra: {
    codigo?: string | null;
    nome: string;
    localidade?: string | null;
    cidade?: string | null;
    uf?: string | null;
  } | null;
  responsavel: {
    nome: string;
    email?: string | null;
  } | null;
  frentes: Array<{
    ordem: number;
    nome: string;
    descricao: string | null;
    unidadeProducao: string | null;
    quantidadePrevista: number | null;
  }>;
  itens: Array<{
    ordem: number;
    frenteNome: string | null;
    tipoItem: string;
    codigo: string | null;
    descricao: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
  premissas: Array<{
    tipo: string;
    ordem: number;
    titulo: string | null;
    descricao: string;
  }>;
  logoPath?: string | null;
  empresaRelatorio?: EmpresaRelatorioPdf;
};

const empresaRelatorioPadrao = buildEmpresaRelatorioPdf();

const colors = {
  border: "#c8c8c8",
  band: "#ececec",
  text: "#111111",
  muted: "#4a4a4a",
  soft: "#f7f7f7"
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    color: colors.text,
    fontSize: 9,
    fontFamily: "Helvetica"
  },
  headerBox: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  logoBox: {
    width: 120,
    paddingRight: 10
  },
  logo: {
    width: 96,
    height: 52,
    objectFit: "contain"
  },
  empresaBox: {
    flex: 1,
    paddingRight: 12
  },
  empresaNome: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 3
  },
  empresaLinha: {
    fontSize: 8.8,
    lineHeight: 1.3
  },
  contatoBox: {
    width: 230,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  contatoLinha: {
    fontSize: 8.8,
    lineHeight: 1.3,
    textAlign: "right"
  },
  contatoStrong: {
    fontSize: 9.2,
    fontWeight: "bold",
    textAlign: "right"
  },
  titleBand: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.band,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  titleText: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold"
  },
  titleSide: {
    width: 110,
    fontSize: 10,
    fontWeight: "bold"
  },
  titleRight: {
    width: 110,
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "right"
  },
  metaGrid: {
    marginTop: 14,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border
  },
  infoRow: {
    flexDirection: "row"
  },
  infoLabel: {
    width: "18%",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.soft,
    paddingHorizontal: 7,
    paddingVertical: 6,
    fontWeight: "bold"
  },
  infoValue: {
    width: "32%",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 6
  },
  sectionTitle: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.band,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: "bold"
  },
  paragraphBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    padding: 8,
    lineHeight: 1.35
  },
  objectBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  objectText: {
    fontSize: 9,
    lineHeight: 1.18
  },
  table: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.soft,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  cell: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderColor: colors.border
  },
  headCell: {
    fontWeight: "bold"
  },
  moneyCell: {
    textAlign: "right"
  },
  centerCell: {
    textAlign: "center"
  },
  itemCol: { width: "8%" },
  frenteCol: { width: "16%" },
  descCol: { width: "34%" },
  qtdCol: { width: "8%" },
  unCol: { width: "8%" },
  unitCol: { width: "13%" },
  totalCol: { width: "13%", borderRightWidth: 0 },
  summaryGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    backgroundColor: colors.soft
  },
  summaryLabel: {
    fontSize: 7.6,
    color: colors.muted,
    fontWeight: "bold",
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold"
  },
  globalValueBox: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#1f4f78",
    backgroundColor: "#edf5fb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  globalValueLabel: {
    fontSize: 10,
    fontWeight: "bold"
  },
  globalValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#163f61"
  },
  premissaItem: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  premissaTitulo: {
    fontWeight: "bold",
    marginBottom: 3
  },
  aceiteBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  aceiteTexto: {
    color: colors.muted,
    fontSize: 8.5,
    lineHeight: 1.25,
    marginBottom: 48
  },
  assinaturaLinha: {
    width: 300,
    borderTopWidth: 1,
    borderColor: colors.text,
    height: 18,
    alignSelf: "center",
    marginBottom: 0
  },
  assinaturaNome: {
    width: 300,
    textAlign: "center",
    fontWeight: "bold",
    alignSelf: "center",
    marginBottom: 10
  },
  aceiteCampo: {
    marginTop: 3,
    fontSize: 8.8
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  footerText: {
    color: colors.muted,
    fontSize: 7.8
  },
  footerCenter: {
    color: colors.muted,
    fontSize: 7.8,
    textAlign: "center"
  },
  footerRight: {
    color: colors.muted,
    fontSize: 7.8,
    textAlign: "right"
  },
  draftWatermark: {
    position: "absolute",
    top: "43%",
    left: 44,
    right: 44,
    textAlign: "center",
    color: "#b45309",
    opacity: 0.16,
    fontSize: 34,
    fontWeight: "bold",
    transform: "rotate(-24deg)"
  }
});

function formatDate(value?: Date | null) {
  return formatDateDisplay(value);
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    RASCUNHO: "Rascunho",
    EM_ELABORACAO: "Em elaboracao",
    EM_REVISAO: "Em revisao",
    PRONTO_PARA_PROPOSTA: "Pronto para proposta",
    PROPOSTA_EMITIDA: "Proposta emitida",
    EM_NEGOCIACAO: "Em negociacao",
    APROVADO: "Aprovado",
    REPROVADO: "Reprovado",
    ARQUIVADO: "Arquivado"
  };

  return labels[value] ?? value;
}

function premissaLabel(value: string) {
  const labels: Record<string, string> = {
    PREMISSA: "Premissas tecnicas",
    CONDICAO: "Condicoes comerciais",
    EXCLUSAO: "Exclusoes do escopo",
    OBSERVACAO: "Observacoes complementares"
  };

  return labels[value] ?? value;
}

function renderMetaRow(firstLabel: string, firstValue: string, secondLabel: string, secondValue: string) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{firstLabel}</Text>
      <Text style={styles.infoValue}>{firstValue || "-"}</Text>
      <Text style={styles.infoLabel}>{secondLabel}</Text>
      <Text style={[styles.infoValue, { borderRightWidth: 0 }]}>{secondValue || "-"}</Text>
    </View>
  );
}

function renderSection(title: string, content?: string | null) {
  if (!content?.trim()) {
    return null;
  }

  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.paragraphBox}>{content}</Text>
    </>
  );
}

export function OrcamentoPdfDocument(props: OrcamentoPdfProps) {
  const isOrcamentoComercial = props.tipo === "COMERCIAL";
  const isPreview = props.modoDocumento === "PREVIEW";
  const empresaRelatorio = props.empresaRelatorio ?? empresaRelatorioPadrao;
  const dataHoraEmissao = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(props.dataEmissao);
  const premissasPorTipo = ["PREMISSA", "CONDICAO", "EXCLUSAO", "OBSERVACAO"].map((tipo) => ({
    tipo,
    items: props.premissas
      .filter((premissa) => premissa.tipo === tipo)
      .sort((first, second) => first.ordem - second.ordem)
  }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {isPreview ? (
          <Text style={styles.draftWatermark} fixed>
            RASCUNHO - SEM VALIDADE COMERCIAL
          </Text>
        ) : null}
        <View style={styles.headerBox}>
          <View style={styles.headerRow}>
            <View style={styles.logoBox}>
              {props.logoPath ? <Image src={props.logoPath} style={styles.logo} /> : null}
            </View>
            <View style={styles.empresaBox}>
              <Text style={styles.empresaNome}>{empresaRelatorio.nome}</Text>
              <Text style={styles.empresaLinha}>CNPJ: {empresaRelatorio.cnpj}</Text>
              <Text style={styles.empresaLinha}>{empresaRelatorio.endereco}</Text>
              <Text style={styles.empresaLinha}>{empresaRelatorio.cidadeUfCep}</Text>
            </View>
            <View style={styles.contatoBox}>
              <Text style={styles.contatoStrong}>{empresaRelatorio.telefones}</Text>
              <Text style={styles.contatoStrong}>{empresaRelatorio.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.titleBand}>
          <Text style={styles.titleSide}>{props.codigo}</Text>
          <Text style={styles.titleText}>PROPOSTA COMERCIAL</Text>
          <Text style={styles.titleRight}>{formatDate(props.dataOrcamento)}</Text>
        </View>

        <View style={styles.metaGrid}>
          {renderMetaRow("Cliente:", props.cliente.nome, "Documento:", props.cliente.cnpj || props.cliente.cpf || "-")}
          {renderMetaRow("Obra:", props.obra?.nome ?? "-", "Status:", statusLabel(props.status))}
          {renderMetaRow("Tipo:", props.tipo, "Validade:", formatDate(props.validadeAte))}
          {renderMetaRow("Responsavel:", props.responsavel?.nome ?? "-", "Titulo:", props.titulo ?? "-")}
        </View>

        {props.objeto?.trim() ? (
          <>
            <Text style={styles.sectionTitle}>OBJETO DA PROPOSTA</Text>
            <View style={styles.objectBox}>
              <Text style={styles.objectText}>{props.objeto}</Text>
            </View>
          </>
        ) : null}

        {props.frentes.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>FRENTES DE SERVICO</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.headCell, { width: "8%" }]}>#</Text>
                <Text style={[styles.cell, styles.headCell, { width: "30%" }]}>Frente</Text>
                <Text style={[styles.cell, styles.headCell, { width: "42%" }]}>Descricao</Text>
                <Text style={[styles.cell, styles.headCell, styles.centerCell, { width: "10%" }]}>Qtd</Text>
                <Text style={[styles.cell, styles.headCell, styles.centerCell, { width: "10%", borderRightWidth: 0 }]}>Unidade</Text>
              </View>
              {props.frentes.map((frente) => (
                <View key={`${frente.ordem}-${frente.nome}`} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.cell, { width: "8%" }]}>{frente.ordem}</Text>
                  <Text style={[styles.cell, { width: "30%" }]}>{frente.nome}</Text>
                  <Text style={[styles.cell, { width: "42%" }]}>{frente.descricao || "-"}</Text>
                  <Text style={[styles.cell, styles.centerCell, { width: "10%" }]}>
                    {formatNumber(frente.quantidadePrevista)}
                  </Text>
                  <Text style={[styles.cell, styles.centerCell, { width: "10%", borderRightWidth: 0 }]}>
                    {formatarUnidadeComercial(frente.unidadeProducao, frente.quantidadePrevista)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {props.itens.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>ITENS DA PROPOSTA</Text>
            <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headCell, styles.centerCell, styles.itemCol]}>Item</Text>
            {isOrcamentoComercial ? null : (
              <Text style={[styles.cell, styles.headCell, styles.frenteCol]}>Frente</Text>
            )}
            {isOrcamentoComercial ? null : (
              <Text style={[styles.cell, styles.headCell, styles.centerCell, { width: "10%" }]}>Natureza</Text>
            )}
            <Text
              style={[
                styles.cell,
                styles.headCell,
                isOrcamentoComercial ? { width: "44%" } : { width: "24%" }
              ]}
            >
              Descricao
            </Text>
            <Text
              style={[
                styles.cell,
                styles.headCell,
                styles.centerCell,
                isOrcamentoComercial ? { width: "10%" } : styles.qtdCol
              ]}
            >
              Qtd
            </Text>
            <Text style={[styles.cell, styles.headCell, styles.centerCell, styles.unCol]}>Un</Text>
            <Text
              style={[
                styles.cell,
                styles.headCell,
                styles.moneyCell,
                isOrcamentoComercial ? { width: "15%" } : styles.unitCol
              ]}
            >
              Vlr unit.
            </Text>
            <Text
              style={[
                styles.cell,
                styles.headCell,
                styles.moneyCell,
                isOrcamentoComercial ? { width: "15%", borderRightWidth: 0 } : styles.totalCol
              ]}
            >
              Total
            </Text>
          </View>
          {props.itens.map((item) => (
            <View key={`${item.ordem}-${item.descricao}`} style={styles.tableRow} wrap={false}>
              <Text style={[styles.cell, styles.centerCell, styles.itemCol]}>{item.ordem}</Text>
              {isOrcamentoComercial ? null : (
                <Text style={[styles.cell, styles.frenteCol]}>{item.frenteNome || "-"}</Text>
              )}
              {isOrcamentoComercial ? null : (
                <Text style={[styles.cell, styles.centerCell, { width: "10%" }]}>{item.tipoItem}</Text>
              )}
              <Text style={[styles.cell, isOrcamentoComercial ? { width: "44%" } : { width: "24%" }]}>
                {item.descricao}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.centerCell,
                  isOrcamentoComercial ? { width: "10%" } : styles.qtdCol
                ]}
              >
                {formatNumber(item.quantidade)}
              </Text>
              <Text style={[styles.cell, styles.centerCell, styles.unCol]}>{item.unidade}</Text>
              <Text
                style={[
                  styles.cell,
                  styles.moneyCell,
                  isOrcamentoComercial ? { width: "15%" } : styles.unitCol
                ]}
              >
                {formatCurrency(item.valorUnitario)}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.moneyCell,
                  isOrcamentoComercial ? { width: "15%", borderRightWidth: 0 } : styles.totalCol
                ]}
              >
                {formatCurrency(item.valorTotal)}
              </Text>
            </View>
          ))}
            </View>
          </>
        ) : null}

        {premissasPorTipo.map(({ tipo, items }) =>
          items.length > 0 ? (
            <View key={tipo}>
              <Text style={styles.sectionTitle}>{premissaLabel(tipo).toUpperCase()}</Text>
              {items.map((premissa) => (
                <View key={`${tipo}-${premissa.ordem}-${premissa.descricao}`} style={styles.premissaItem}>
                  {premissa.titulo ? <Text style={styles.premissaTitulo}>{premissa.titulo}</Text> : null}
                  <Text>{premissa.descricao}</Text>
                </View>
              ))}
            </View>
          ) : null
        )}

        {renderSection("OBSERVACOES AO CLIENTE", props.observacaoCliente)}

        <View style={styles.globalValueBox} wrap={false}>
          <Text style={styles.globalValueLabel}>TOTAL DA PROPOSTA</Text>
          <Text style={styles.globalValue}>{formatCurrency(props.valorTotal)}</Text>
        </View>

        <View wrap={false}>
          <Text style={styles.sectionTitle}>ACEITE DA PROPOSTA</Text>
          <View style={styles.aceiteBox}>
            <Text style={styles.aceiteTexto}>
              Ao assinar abaixo, a CONTRATANTE declara estar de acordo com o escopo, premissas,
              condições comerciais e valores apresentados nesta proposta.
            </Text>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaNome}>CONTRATANTE</Text>
            <Text style={styles.aceiteCampo}>Nome:</Text>
            <Text style={styles.aceiteCampo}>CPF/CNPJ:</Text>
            <Text style={styles.aceiteCampo}>Data:</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Documento emitido pelo BasePro OS</Text>
          <Text style={styles.footerCenter}>
            {isPreview ? "Data e hora da previa" : "Data e hora da emissão"}: {dataHoraEmissao} | Revisão: {props.revisao}
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

