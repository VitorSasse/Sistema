import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/utils/formatters";

type OrdemCompraPdfItem = {
  item: string;
  codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
};

type OrdemCompraPdfParcela = {
  numeroParcela: number;
  dataVencimento: Date;
  valorParcela: number;
};

type OrdemCompraPdfProps = {
  numeroOrdem: string;
  dataEmissao: Date;
  status: string;
  tipoCompra: string;
  fornecedor: {
    codigo: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpj: string | null;
    enderecoLinha1: string | null;
    enderecoLinha2: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    telefone: string | null;
    email: string | null;
  };
  centroCustoNome: string;
  formaPagamento: string | null;
  numeroParcelas: number;
  observacaoFinanceira: string | null;
  observacao: string | null;
  valorTotal: number;
  itens: OrdemCompraPdfItem[];
  parcelas: OrdemCompraPdfParcela[];
  logoPath?: string | null;
};

const empresaRelatorio = {
  nome: process.env.EMPRESA_RELATORIO_NOME?.trim() || "JMIX",
  cnpj: process.env.EMPRESA_RELATORIO_CNPJ?.trim() || "20.613.463/0001-36",
  endereco:
    process.env.EMPRESA_RELATORIO_ENDERECO?.trim() ||
    "AV. NEREU RAMOS, 899 (DEPOSITO JMIX) - CENTRO",
  cidadeUfCep:
    process.env.EMPRESA_RELATORIO_CIDADE_UF_CEP?.trim() || "Penha/SC - CEP: 88385-000",
  telefones:
    process.env.EMPRESA_RELATORIO_TELEFONES?.trim() || "(47)99151-4414 - (47)99251-4414",
  email:
    process.env.EMPRESA_RELATORIO_EMAIL?.trim() || "financeiro@jtbterraplenagem.com.br"
};

const colors = {
  border: "#c8c8c8",
  band: "#ececec",
  text: "#111111",
  muted: "#4a4a4a"
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 24,
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
  titleSide: {
    width: 96
  },
  titleDateBox: {
    width: 96,
    alignItems: "flex-end"
  },
  titleText: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold"
  },
  titleDate: {
    width: 96,
    fontSize: 11,
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
    width: "16%",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 8.5,
    fontWeight: "bold"
  },
  infoValue: {
    width: "34%",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 8.5
  },
  fullLabel: {
    width: "16%",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 8.5,
    fontWeight: "bold"
  },
  fullValue: {
    width: "84%",
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 8.5
  },
  sectionBand: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.band,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  sectionBandText: {
    fontSize: 8.8,
    fontWeight: "bold"
  },
  tableHeader: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  headerCell: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.3,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: colors.border
  },
  headerCellLast: {
    borderRightWidth: 0
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  cell: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.3,
    borderRightWidth: 1,
    borderColor: colors.border
  },
  cellLast: {
    borderRightWidth: 0
  },
  alignRight: {
    textAlign: "right"
  },
  alignCenter: {
    textAlign: "center"
  },
  colItem: { width: "8%" },
  colCodigo: { width: "14%" },
  colDescricao: { width: "36%" },
  colUnidade: { width: "8%" },
  colQuantidade: { width: "10%" },
  colValorUnitario: { width: "12%" },
  colSubtotal: { width: "12%" },
  totalRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.band
  },
  totalLabelCell: {
    width: "66%",
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 8.8,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: colors.border
  },
  totalQuantityCell: {
    width: "10%",
    paddingHorizontal: 6,
    paddingVertical: 7,
    fontSize: 8.8,
    fontWeight: "bold",
    textAlign: "right",
    borderRightWidth: 1,
    borderColor: colors.border
  },
  totalValueCell: {
    width: "24%",
    paddingHorizontal: 6,
    paddingVertical: 7,
    fontSize: 8.8,
    fontWeight: "bold",
    textAlign: "right"
  },
  paymentHeaderCell: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.3,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderColor: colors.border
  },
  paymentColVencimento: { width: "23%" },
  paymentColParcela: { width: "23%" },
  paymentColForma: { width: "31%" },
  paymentColObs: { width: "23%" },
  summaryBlock: {
    marginTop: 14
  },
  summaryRow: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.band,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2
  },
  summaryText: {
    fontSize: 8.8,
    fontWeight: "bold",
    textAlign: "right"
  },
  observationsText: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    fontSize: 8.8,
    minHeight: 34
  },
  footerNote: {
    marginTop: 18,
    fontSize: 7.5,
    color: colors.muted,
    textAlign: "right"
  }
});

function formatDate(value: Date) {
  return value.toLocaleDateString("pt-BR");
}

function formatNumber(value: number, fractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

function formatTipoCompra(value: string) {
  return value === "SERVICO" ? "SERVICOS" : "PRODUTOS";
}

function joinAddress(props: OrdemCompraPdfProps["fornecedor"]) {
  const endereco = [props.enderecoLinha1, props.enderecoLinha2].filter(Boolean).join(" - ");
  const bairro = props.bairro?.trim();

  if (endereco && bairro) {
    return `${endereco} - ${bairro}`;
  }

  return endereco || bairro || "-";
}

function renderInfoRow(
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{leftLabel}</Text>
      <Text style={styles.infoValue}>{leftValue}</Text>
      <Text style={styles.infoLabel}>{rightLabel}</Text>
      <Text style={[styles.infoValue, styles.cellLast]}>{rightValue}</Text>
    </View>
  );
}

export function OrdemCompraPdfDocument(props: OrdemCompraPdfProps) {
  const totalQuantidade = props.itens.reduce((sum, item) => sum + item.quantidade, 0);
  const secaoItens = formatTipoCompra(props.tipoCompra);
  const enderecoFornecedor = joinAddress(props.fornecedor);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.headerBox}>
          <View style={styles.headerRow}>
            <View style={styles.logoBox}>
              {props.logoPath ? <Image style={styles.logo} src={props.logoPath} /> : null}
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
          <View style={styles.titleSide} />
          <Text style={styles.titleText}>ORDEM DE COMPRA No {props.numeroOrdem}</Text>
          <View style={styles.titleDateBox}>
            <Text style={styles.titleDate}>{formatDate(props.dataEmissao)}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          {renderInfoRow(
            "Razao social:",
            props.fornecedor.razaoSocial,
            "Nome fantasia:",
            props.fornecedor.nomeFantasia ?? "-"
          )}
          {renderInfoRow("CNPJ/CPF:", props.fornecedor.cnpj ?? "-", "Endereco:", enderecoFornecedor)}
          {renderInfoRow(
            "CEP:",
            props.fornecedor.cep ?? "-",
            "Cidade/UF:",
            `${props.fornecedor.cidade ?? "-"}${props.fornecedor.uf ? `/${props.fornecedor.uf}` : ""}`
          )}
          {renderInfoRow(
            "Telefone:",
            props.fornecedor.telefone ?? "-",
            "E-mail:",
            props.fornecedor.email ?? "-"
          )}
          {renderInfoRow("Centro de custo:", props.centroCustoNome, "Status:", props.status)}
          {renderInfoRow(
            "Tipo da compra:",
            props.tipoCompra === "SERVICO" ? "Servico" : "Produto",
            "Parcelas:",
            String(props.numeroParcelas)
          )}
        </View>

        <View style={styles.sectionBand}>
          <Text style={styles.sectionBandText}>{secaoItens}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colItem]}>ITEM</Text>
          <Text style={[styles.headerCell, styles.colCodigo]}>CODIGO</Text>
          <Text style={[styles.headerCell, styles.colDescricao]}>NOME</Text>
          <Text style={[styles.headerCell, styles.colUnidade, styles.alignCenter]}>UN</Text>
          <Text style={[styles.headerCell, styles.colQuantidade, styles.alignRight]}>QTD.</Text>
          <Text style={[styles.headerCell, styles.colValorUnitario, styles.alignRight]}>VR. UNIT.</Text>
          <Text style={[styles.headerCell, styles.colSubtotal, styles.alignRight, styles.headerCellLast]}>
            SUBTOTAL
          </Text>
        </View>

        {props.itens.map((item, index) => (
          <View key={`${item.item}-${index}`} style={styles.tableRow} wrap={false}>
            <Text style={[styles.cell, styles.colItem]}>{item.item || String(index + 1)}</Text>
            <Text style={[styles.cell, styles.colCodigo]}>{item.codigo ?? "-"}</Text>
            <Text style={[styles.cell, styles.colDescricao]}>{item.descricao}</Text>
            <Text style={[styles.cell, styles.colUnidade, styles.alignCenter]}>{item.unidade}</Text>
            <Text style={[styles.cell, styles.colQuantidade, styles.alignRight]}>
              {formatNumber(item.quantidade, 3)}
            </Text>
            <Text style={[styles.cell, styles.colValorUnitario, styles.alignRight]}>
              {formatNumber(item.valorUnitario, 2)}
            </Text>
            <Text style={[styles.cell, styles.colSubtotal, styles.alignRight, styles.cellLast]}>
              {formatNumber(item.subtotal, 2)}
            </Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabelCell}>TOTAL DOS {secaoItens}</Text>
          <Text style={styles.totalQuantityCell}>{formatNumber(totalQuantidade, 3)}</Text>
          <Text style={styles.totalValueCell}>{formatNumber(props.valorTotal, 2)}</Text>
        </View>

        <View style={styles.sectionBand}>
          <Text style={styles.sectionBandText}>DADOS DO PAGAMENTO</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.paymentHeaderCell, styles.paymentColVencimento]}>VENCIMENTO</Text>
          <Text style={[styles.paymentHeaderCell, styles.paymentColParcela]}>VALOR DA PARCELA</Text>
          <Text style={[styles.paymentHeaderCell, styles.paymentColForma]}>FORMA DE PAGAMENTO</Text>
          <Text
            style={[
              styles.paymentHeaderCell,
              styles.paymentColObs,
              styles.headerCellLast
            ]}
          >
            OBSERVACAO
          </Text>
        </View>

        {props.parcelas.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.cell, { width: "100%" }, styles.cellLast]}>Nenhuma parcela gerada.</Text>
          </View>
        ) : (
          props.parcelas.map((parcela, index) => (
            <View key={parcela.numeroParcela} style={styles.tableRow} wrap={false}>
              <Text style={[styles.cell, styles.paymentColVencimento]}>{formatDate(parcela.dataVencimento)}</Text>
              <Text style={[styles.cell, styles.paymentColParcela]}>{formatCurrency(parcela.valorParcela)}</Text>
              <Text style={[styles.cell, styles.paymentColForma]}>{props.formaPagamento ?? "-"}</Text>
              <Text style={[styles.cell, styles.paymentColObs, styles.cellLast]}>
                {index === 0 ? props.observacaoFinanceira ?? "-" : "-"}
              </Text>
            </View>
          ))
        )}

        <View style={styles.summaryBlock}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              VALOR DOS {secaoItens}: {formatCurrency(props.valorTotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>TOTAL DA COMPRA: {formatCurrency(props.valorTotal)}</Text>
          </View>
        </View>

        <View style={styles.sectionBand}>
          <Text style={styles.sectionBandText}>OBSERVACOES</Text>
        </View>
        <Text style={styles.observationsText}>{props.observacao ?? "-"}</Text>

        <Text style={styles.footerNote}>Documento emitido pelo sistema de gestao interna.</Text>
      </Page>
    </Document>
  );
}
