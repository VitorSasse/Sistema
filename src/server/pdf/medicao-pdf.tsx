import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatServicoDisplay } from "@/lib/utils/servico-display";
import { formatUnidade, type UnidadeFaturada } from "@/lib/utils/unidades";

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
  itens: MedicaoPdfItem[];
  tipoRelatorio: MedicaoPdfTipo;
  logoPath?: string | null;
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
  },
  footerLine: {
    marginBottom: 3,
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
  return value.toISOString().slice(0, 10);
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
  const totalValor = items.reduce((acc, item) => acc + Number(item.valorTotalItem), 0);

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
          <Text style={styles.footerLine}>Total de itens: {items.length}</Text>
          <Text style={styles.footerLine}>Valor total: {formatCurrency(totalValor)}</Text>
          <Text style={styles.footerLine}>Observacoes: {props.observacao ?? "-"}</Text>
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
