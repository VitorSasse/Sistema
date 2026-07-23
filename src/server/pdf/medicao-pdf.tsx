import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDateInputValue } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatServicoDisplay } from "@/lib/utils/servico-display";
import { formatUnidade, type UnidadeFaturada } from "@/lib/utils/unidades";
import type { EmpresaRelatorioPdf } from "@/server/pdf/empresa-relatorio";

export type MedicaoPdfTipo = "DETALHADO" | "RESUMIDO";

type MedicaoPdfItem = {
  data: Date;
  ficha: string;
  placaOuTag: string;
  tipoServico: string;
  material: string | null;
  unidadeFaturada: string;
  quantidadeFaturada: string | number;
  valorUnitario: string | number;
  valorTotalItem: string | number;
};

type MedicaoPdfProps = {
  codigoMedicao: string;
  tipoMedicao: string;
  clienteNome: string;
  obraNome: string | null;
  periodoInicial: Date;
  periodoFinal: Date;
  status: string;
  observacao: string | null;
  descontoValor: string | number;
  permutaPercentual: string | number;
  itens: MedicaoPdfItem[];
  tipoRelatorio: MedicaoPdfTipo;
  logoPath?: string | null;
  empresaRelatorio?: EmpresaRelatorioPdf;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
  },
  headerBrand: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 220,
    height: 74,
    objectFit: "contain",
  },
  title: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 10,
    textAlign: "center",
  },
  companyInfo: {
    marginTop: 8,
    gap: 2,
    fontSize: 8,
    color: "#36322d",
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5efe6",
    borderBottomWidth: 1,
    borderBottomColor: "#b9b0a2",
    paddingVertical: 6,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ece5d9",
    paddingVertical: 6,
  },
  cellText: {
    paddingRight: 6,
    textAlign: "left",
  },
  cellNumber: {
    paddingHorizontal: 4,
    textAlign: "right",
  },
  cellCenter: {
    paddingHorizontal: 4,
    textAlign: "center",
  },
  cellMoney: {
    paddingLeft: 4,
    paddingRight: 2,
    textAlign: "right",
  },
  summaryServico: { width: "28%" },
  summaryMaterial: { width: "24%" },
  summaryQtd: { width: "10%" },
  summaryUn: { width: "8%" },
  summaryVlrUnit: { width: "14%" },
  summaryTotal: { width: "16%" },
  detailData: { width: "10%" },
  detailFicha: { width: "9%" },
  detailRecurso: { width: "15%" },
  detailServico: { width: "19%" },
  detailMaterial: { width: "16%" },
  detailQtd: { width: "8%" },
  detailUn: { width: "7%" },
  detailVlrUnit: { width: "8%" },
  detailTotal: { width: "8%" },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerObservation: {
    flex: 1,
    paddingRight: 18,
  },
  footerSummary: {
    width: 230,
  },
  footerLine: {
    marginBottom: 3,
    textAlign: "right",
  },
  footerFinalLine: {
    marginTop: 3,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#b9b0a2",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "right",
  },
  footerLineLeft: {
    marginBottom: 3,
    textAlign: "left",
  },
  signatureBlock: {
    marginTop: 40,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "#b9b0a2",
    alignItems: "center",
    gap: 6,
  },
});

function formatDate(value: Date) {
  return formatDateInputValue(value);
}

function formatTipoMedicao(value: string) {
  if (value === "UNICA") return "Unica";
  if (value === "SEMANAL") return "Semanal";
  if (value === "QUINZENAL") return "Quinzenal";
  if (value === "MENSAL") return "Mensal";
  return value;
}

function formatQuantidade(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value.toFixed(2)));
}

function formatPercentual(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function aggregateSummaryItems(items: MedicaoPdfItem[]) {
  return Array.from(
    items.reduce(
      (acc, item) => {
        const key = [
          formatServicoDisplay(item.tipoServico),
          item.material ?? "-",
          item.unidadeFaturada,
          Number(item.valorUnitario).toFixed(2),
        ].join("|");
        const current = acc.get(key);

        if (current) {
          current.quantidadeFaturada += Number(item.quantidadeFaturada);
          current.valorTotalItem += Number(item.valorTotalItem);
          return acc;
        }

        acc.set(key, {
          tipoServico: formatServicoDisplay(item.tipoServico),
          material: item.material ?? "-",
          unidadeFaturada: item.unidadeFaturada as UnidadeFaturada,
          quantidadeFaturada: Number(item.quantidadeFaturada),
          valorUnitario: Number(item.valorUnitario),
          valorTotalItem: Number(item.valorTotalItem),
        });

        return acc;
      },
      new Map<
        string,
        {
          tipoServico: string;
          material: string;
          unidadeFaturada: UnidadeFaturada;
          quantidadeFaturada: number;
          valorUnitario: number;
          valorTotalItem: number;
        }
      >(),
    ),
  ).map(([, value]) => value);
}

function normalizeDetailedItems(items: MedicaoPdfItem[]) {
  return items.map((item) => ({
    data: item.data,
    ficha: item.ficha,
    placaOuTag: item.placaOuTag,
    tipoServico: formatServicoDisplay(item.tipoServico),
    material: item.material ?? "-",
    unidadeFaturada: item.unidadeFaturada as UnidadeFaturada,
    quantidadeFaturada: Number(item.quantidadeFaturada),
    valorUnitario: Number(item.valorUnitario),
    valorTotalItem: Number(item.valorTotalItem),
  }));
}

export function MedicaoPdfDocument(props: MedicaoPdfProps) {
  const isDetalhado = props.tipoRelatorio === "DETALHADO";
  const detailedItems = normalizeDetailedItems(props.itens);
  const summaryItems = aggregateSummaryItems(props.itens);
  const items = isDetalhado ? detailedItems : summaryItems;
  const valorBruto = items.reduce((acc, item) => acc + Number(item.valorTotalItem), 0);
  const descontoValor = Math.max(0, Number(props.descontoValor || 0));
  const hasDesconto = descontoValor > 0;
  const valorComDesconto = Math.max(0, valorBruto - descontoValor);
  const permutaPercentual = Math.min(100, Math.max(0, Number(props.permutaPercentual || 0)));
  const valorPermuta = valorComDesconto * (permutaPercentual / 100);
  const hasPermuta = permutaPercentual > 0 && valorPermuta > 0;
  const valorFinal = Math.max(0, valorComDesconto - valorPermuta);

  return (
    <Document>
      <Page size="A4" orientation={isDetalhado ? "landscape" : "portrait"} style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            {props.logoPath ? <Image style={styles.logo} src={props.logoPath} /> : null}
            <Text style={styles.title}>
              Relatorio de Medicao {isDetalhado ? "Detalhado" : "Resumido"}
            </Text>
            <Text style={styles.subtitle}>Documento de conferencia de medicao</Text>
            {props.empresaRelatorio ? (
              <View style={styles.companyInfo}>
                <Text>{props.empresaRelatorio.nome}</Text>
                <Text>CNPJ: {props.empresaRelatorio.cnpj}</Text>
                <Text>{props.empresaRelatorio.endereco}</Text>
                <Text>{props.empresaRelatorio.cidadeUfCep}</Text>
                <Text>
                  {props.empresaRelatorio.telefones} | {props.empresaRelatorio.email}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <Text>Codigo: {props.codigoMedicao}</Text>
            <Text>Status: {props.status}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text>Tipo: {formatTipoMedicao(props.tipoMedicao)}</Text>
            <Text />
          </View>
          <View style={styles.metaRow}>
            <Text>Cliente: {props.clienteNome}</Text>
            <Text>Obra: {props.obraNome ?? "-"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text>
              Periodo: {formatDate(props.periodoInicial)} ate {formatDate(props.periodoFinal)}
            </Text>
            <Text>Emissao: {formatDate(new Date())}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {isDetalhado ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellText, styles.detailData]}>Data</Text>
                <Text style={[styles.cellText, styles.detailFicha]}>Ficha</Text>
                <Text style={[styles.cellText, styles.detailRecurso]}>Tag/Recurso</Text>
                <Text style={[styles.cellText, styles.detailServico]}>Servico</Text>
                <Text style={[styles.cellText, styles.detailMaterial]}>Material</Text>
                <Text style={[styles.cellNumber, styles.detailQtd]}>Qtd</Text>
                <Text style={[styles.cellCenter, styles.detailUn]}>Un</Text>
                <Text style={[styles.cellMoney, styles.detailVlrUnit]} wrap={false}>
                  Vlr Unit
                </Text>
                <Text style={[styles.cellMoney, styles.detailTotal]} wrap={false}>
                  Total
                </Text>
              </View>

              {detailedItems.map((item, index) => (
                <View
                  key={`${item.ficha}-${item.placaOuTag}-${index}`}
                  style={styles.row}
                  wrap={false}
                >
                  <Text style={[styles.cellText, styles.detailData]}>{formatDate(item.data)}</Text>
                  <Text style={[styles.cellText, styles.detailFicha]}>{item.ficha}</Text>
                  <Text style={[styles.cellText, styles.detailRecurso]}>{item.placaOuTag}</Text>
                  <Text style={[styles.cellText, styles.detailServico]}>{item.tipoServico}</Text>
                  <Text style={[styles.cellText, styles.detailMaterial]}>{item.material}</Text>
                  <Text style={[styles.cellNumber, styles.detailQtd]}>
                    {formatQuantidade(item.quantidadeFaturada)}
                  </Text>
                  <Text style={[styles.cellCenter, styles.detailUn]}>
                    {formatUnidade(item.unidadeFaturada)}
                  </Text>
                  <Text style={[styles.cellMoney, styles.detailVlrUnit]} wrap={false}>
                    {formatCurrency(item.valorUnitario)}
                  </Text>
                  <Text style={[styles.cellMoney, styles.detailTotal]} wrap={false}>
                    {formatCurrency(item.valorTotalItem)}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellText, styles.summaryServico]}>Servico</Text>
                <Text style={[styles.cellText, styles.summaryMaterial]}>Material</Text>
                <Text style={[styles.cellNumber, styles.summaryQtd]}>Qtd</Text>
                <Text style={[styles.cellCenter, styles.summaryUn]}>Un</Text>
                <Text style={[styles.cellMoney, styles.summaryVlrUnit]} wrap={false}>
                  Vlr Unit
                </Text>
                <Text style={[styles.cellMoney, styles.summaryTotal]} wrap={false}>
                  Total
                </Text>
              </View>

              {summaryItems.map((item, index) => (
                <View
                  key={`${item.tipoServico}-${item.material}-${item.unidadeFaturada}-${index}`}
                  style={styles.row}
                  wrap={false}
                >
                  <Text style={[styles.cellText, styles.summaryServico]}>{item.tipoServico}</Text>
                  <Text style={[styles.cellText, styles.summaryMaterial]}>{item.material}</Text>
                  <Text style={[styles.cellNumber, styles.summaryQtd]}>
                    {formatQuantidade(item.quantidadeFaturada)}
                  </Text>
                  <Text style={[styles.cellCenter, styles.summaryUn]}>
                    {formatUnidade(item.unidadeFaturada)}
                  </Text>
                  <Text style={[styles.cellMoney, styles.summaryVlrUnit]} wrap={false}>
                    {formatCurrency(item.valorUnitario)}
                  </Text>
                  <Text style={[styles.cellMoney, styles.summaryTotal]} wrap={false}>
                    {formatCurrency(item.valorTotalItem)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerObservation}>
            <Text style={styles.footerLineLeft}>Observacoes: {props.observacao ?? "-"}</Text>
          </View>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLine}>Total de itens: {items.length}</Text>
            {hasDesconto || hasPermuta ? (
              <>
                <Text style={styles.footerLine}>Valor bruto: {formatCurrency(valorBruto)}</Text>
                {hasDesconto ? (
                  <>
                    <Text style={styles.footerLine}>Desconto: {formatCurrency(descontoValor)}</Text>
                    <Text style={styles.footerLine}>Valor apos desconto: {formatCurrency(valorComDesconto)}</Text>
                  </>
                ) : null}
              </>
            ) : null}
            {hasPermuta ? (
              <Text style={styles.footerLine}>
                Permuta: {formatPercentual(permutaPercentual)}% / {formatCurrency(valorPermuta)}
              </Text>
            ) : null}
            <Text style={styles.footerFinalLine}>Valor final: {formatCurrency(valorFinal)}</Text>
          </View>
        </View>

        {!isDetalhado ? (
          <View style={styles.signatureBlock}>
            <Text>____________________________________________</Text>
            <Text>Assinatura do cliente</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
