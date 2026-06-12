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
    marginBottom: 14
  },
  logo: {
    width: 220,
    height: 74,
    objectFit: "contain"
  },
  title: {
    marginTop: 10,
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
  block: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d8d0c4",
    backgroundColor: "#fffaf0"
  },
  blockTitle: {
    fontSize: 10,
    marginBottom: 6
  },
  blockLine: {
    marginBottom: 3
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5efe6",
    borderBottomWidth: 1,
    borderBottomColor: "#b9b0a2",
    paddingVertical: 6,
    marginTop: 10
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ece5d9",
    paddingVertical: 6
  },
  cellText: {
    paddingRight: 6
  },
  cellNumber: {
    paddingHorizontal: 4,
    textAlign: "right"
  },
  item: { width: "12%" },
  codigo: { width: "12%" },
  descricao: { width: "30%" },
  unidade: { width: "10%" },
  quantidade: { width: "12%" },
  valorUnitario: { width: "12%" },
  subtotal: { width: "12%" },
  parcelaNumero: { width: "18%" },
  parcelaData: { width: "32%" },
  parcelaValor: { width: "25%" },
  parcelaObs: { width: "25%" },
  totalBox: {
    marginTop: 12,
    alignSelf: "flex-end",
    minWidth: 180,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d8d0c4",
    backgroundColor: "#f5efe6"
  },
  totalLabel: {
    fontSize: 9,
    marginBottom: 4
  },
  totalValue: {
    fontSize: 14
  }
});

function formatDate(value: Date) {
  return value.toLocaleDateString("pt-BR");
}

export function OrdemCompraPdfDocument(props: OrdemCompraPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            {props.logoPath ? <Image style={styles.logo} src={props.logoPath} /> : null}
            <Text style={styles.title}>Ordem de Compra</Text>
            <Text style={styles.subtitle}>Documento para controle de compras e aprovacao interna</Text>
          </View>

          <View style={styles.metaRow}>
            <Text>Numero: {props.numeroOrdem}</Text>
            <Text>Status: {props.status}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text>Data de emissao: {formatDate(props.dataEmissao)}</Text>
            <Text>Parcelas: {props.numeroParcelas}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Dados do fornecedor</Text>
          <Text style={styles.blockLine}>
            {props.fornecedor.codigo} - {props.fornecedor.razaoSocial}
          </Text>
          <Text style={styles.blockLine}>Nome fantasia: {props.fornecedor.nomeFantasia ?? "-"}</Text>
          <Text style={styles.blockLine}>CNPJ: {props.fornecedor.cnpj ?? "-"}</Text>
          <Text style={styles.blockLine}>
            Endereco: {props.fornecedor.enderecoLinha1 ?? "-"} {props.fornecedor.enderecoLinha2 ?? ""}
          </Text>
          <Text style={styles.blockLine}>
            Bairro/Cidade: {props.fornecedor.bairro ?? "-"} - {props.fornecedor.cidade ?? "-"} / {props.fornecedor.uf ?? "-"}
          </Text>
          <Text style={styles.blockLine}>
            Contato: {props.fornecedor.telefone ?? "-"} | {props.fornecedor.email ?? "-"}
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Centro de custo</Text>
          <Text>{props.centroCustoNome}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.cellText, styles.item]}>Item</Text>
          <Text style={[styles.cellText, styles.codigo]}>Codigo</Text>
          <Text style={[styles.cellText, styles.descricao]}>Descricao</Text>
          <Text style={[styles.cellText, styles.unidade]}>Un</Text>
          <Text style={[styles.cellNumber, styles.quantidade]}>Qtd</Text>
          <Text style={[styles.cellNumber, styles.valorUnitario]}>Vlr Unit</Text>
          <Text style={[styles.cellNumber, styles.subtotal]}>Subtotal</Text>
        </View>

        {props.itens.map((item, index) => (
          <View key={`${item.item}-${index}`} style={styles.row} wrap={false}>
            <Text style={[styles.cellText, styles.item]}>{item.item}</Text>
            <Text style={[styles.cellText, styles.codigo]}>{item.codigo ?? "-"}</Text>
            <Text style={[styles.cellText, styles.descricao]}>{item.descricao}</Text>
            <Text style={[styles.cellText, styles.unidade]}>{item.unidade}</Text>
            <Text style={[styles.cellNumber, styles.quantidade]}>{item.quantidade.toFixed(2)}</Text>
            <Text style={[styles.cellNumber, styles.valorUnitario]}>{formatCurrency(item.valorUnitario)}</Text>
            <Text style={[styles.cellNumber, styles.subtotal]}>{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Dados do pagamento</Text>
          <Text style={styles.blockLine}>Forma de pagamento: {props.formaPagamento ?? "-"}</Text>
          <Text style={styles.blockLine}>
            Observacoes financeiras: {props.observacaoFinanceira ?? "-"}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.cellText, styles.parcelaNumero]}>Parcela</Text>
          <Text style={[styles.cellText, styles.parcelaData]}>Vencimento</Text>
          <Text style={[styles.cellNumber, styles.parcelaValor]}>Valor</Text>
          <Text style={[styles.cellText, styles.parcelaObs]}>Obs</Text>
        </View>

        {props.parcelas.length === 0 ? (
          <View style={styles.row}>
            <Text style={{ width: "100%" }}>Nenhuma parcela gerada.</Text>
          </View>
        ) : (
          props.parcelas.map((parcela) => (
            <View key={parcela.numeroParcela} style={styles.row} wrap={false}>
              <Text style={[styles.cellText, styles.parcelaNumero]}>
                {parcela.numeroParcela}/{props.numeroParcelas}
              </Text>
              <Text style={[styles.cellText, styles.parcelaData]}>
                {formatDate(parcela.dataVencimento)}
              </Text>
              <Text style={[styles.cellNumber, styles.parcelaValor]}>
                {formatCurrency(parcela.valorParcela)}
              </Text>
              <Text style={[styles.cellText, styles.parcelaObs]}>-</Text>
            </View>
          ))
        )}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Observacoes</Text>
          <Text>{props.observacao ?? "-"}</Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Valor total da compra</Text>
          <Text style={styles.totalValue}>{formatCurrency(props.valorTotal)}</Text>
        </View>
      </Page>
    </Document>
  );
}
