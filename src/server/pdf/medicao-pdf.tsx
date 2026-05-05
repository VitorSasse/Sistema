import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";
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
    fontFamily: "Helvetica"
  },
  header: {
    marginBottom: 16
  },
  headerBrand: {
    alignItems: "center",
    marginBottom: 16
  },
  logo: {
    width: 220,
    height: 74,
    objectFit: "contain"
  },
  title: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center"
  },
  subtitle: {
    marginTop: 3,
    fontSize: 10,
    textAlign: "center"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5
  },
  table: {
    marginTop: 8
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5efe6",
    borderBottomWidth: 1,
    borderBottomColor: "#b9b0a2",
    paddingVertical: 6,
    marginBottom: 2
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ece5d9",
    paddingVertical: 6
  },
  cellText: {
    paddingRight: 6,
    textAlign: "left"
  },
  cellNumber: {
    paddingHorizontal: 4,
    textAlign: "right"
  },
  cellCenter: {
    paddingHorizontal: 4,
    textAlign: "center"
  },
  cellMoney: {
    paddingLeft: 4,
    paddingRight: 2,
    textAlign: "right"
  },
  cellServico: { width: "28%" },
  cellMaterial: { width: "24%" },
  cellQtd: { width: "10%" },
  cellUn: { width: "8%" },
  cellVlrUnit: { width: "14%" },
  cellTotal: { width: "16%" },
  footer: {
    marginTop: 16
  },
  footerLine: {
    marginBottom: 3
  },
  signatureBlock: {
    marginTop: 40,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "#b9b0a2",
    alignItems: "center",
    gap: 6
  }
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
    maximumFractionDigits: 2
  }).format(Number(value.toFixed(2)));
}

function aggregateItems(items: MedicaoPdfItem[]) {
  return Array.from(
    items.reduce((acc, item) => {
      const key = [
        formatServicoDisplay(item.tipoServico),
        item.material ?? "-",
        item.unidadeFaturada,
        Number(item.valorUnitario).toFixed(2)
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
        valorTotalItem: Number(item.valorTotalItem)
      });

      return acc;
    }, new Map<string, {
      tipoServico: string;
      material: string;
      unidadeFaturada: UnidadeFaturada;
      quantidadeFaturada: number;
      valorUnitario: number;
      valorTotalItem: number;
    }>())
  ).map(([, value]) => value);
}

export function MedicaoPdfDocument(props: MedicaoPdfProps) {
  const aggregatedItems = aggregateItems(props.itens);
  const totalValor = aggregatedItems.reduce((acc, item) => acc + Number(item.valorTotalItem), 0);
  const isDetalhado = props.tipoRelatorio === "DETALHADO";

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
          <View style={styles.tableHeader}>
            <Text style={[styles.cellText, styles.cellServico]}>Servico</Text>
            <Text style={[styles.cellText, styles.cellMaterial]}>Material</Text>
            <Text style={[styles.cellNumber, styles.cellQtd]}>Qtd</Text>
            <Text style={[styles.cellCenter, styles.cellUn]}>Un</Text>
            <Text style={[styles.cellMoney, styles.cellVlrUnit]} wrap={false}>
              Vlr Unit
            </Text>
            <Text style={[styles.cellMoney, styles.cellTotal]} wrap={false}>
              Total
            </Text>
          </View>

          {aggregatedItems.map((item, index) => (
            <View
              key={`${item.tipoServico}-${item.material}-${item.unidadeFaturada}-${index}`}
              style={styles.row}
              wrap={false}
            >
              <Text style={[styles.cellText, styles.cellServico]}>{item.tipoServico}</Text>
              <Text style={[styles.cellText, styles.cellMaterial]}>{item.material}</Text>
              <Text style={[styles.cellNumber, styles.cellQtd]}>
                {formatQuantidade(item.quantidadeFaturada)}
              </Text>
              <Text style={[styles.cellCenter, styles.cellUn]}>
                {formatUnidade(item.unidadeFaturada)}
              </Text>
              <Text style={[styles.cellMoney, styles.cellVlrUnit]} wrap={false}>
                {formatCurrency(item.valorUnitario)}
              </Text>
              <Text style={[styles.cellMoney, styles.cellTotal]} wrap={false}>
                {formatCurrency(item.valorTotalItem)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLine}>Total de itens: {aggregatedItems.length}</Text>
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
