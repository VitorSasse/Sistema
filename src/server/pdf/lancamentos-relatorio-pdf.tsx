import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  formatQuantidadeComUnidade,
  formatUnidade,
  type UnidadeApontada,
  type UnidadeFaturada
} from "@/lib/utils/unidades";
import { formatServicoDisplay } from "@/lib/utils/servico-display";

type LancamentoRelatorioItem = {
  id: string;
  data: Date;
  fichaNumero: string;
  clienteNome: string;
  obraNome: string | null;
  servicoNome: string;
  materialNome: string | null;
  equipamentoNome: string;
  equipamentoTag: string;
  colaboradorNome: string;
  quantidadeApontada: string | number;
  unidadeApontada: UnidadeApontada;
  quantidadeFaturada: string | number;
  unidadeFaturada: UnidadeFaturada;
  statusValidacao: string;
  observacao: string | null;
};

type RelatorioFiltro = {
  label: string;
  value: string;
};

type LancamentosRelatorioPdfProps = {
  titulo: string;
  filtros: RelatorioFiltro[];
  itens: LancamentoRelatorioItem[];
  emitidoEm: Date;
  logoPath?: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 22,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#231f1a"
  },
  header: {
    marginBottom: 14
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
    fontSize: 15,
    marginTop: 12,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 9,
    color: "#6e6457",
    marginBottom: 10
  },
  filterBox: {
    borderWidth: 1,
    borderColor: "#d7cfbf",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fffaf0",
    marginBottom: 12
  },
  filterTitle: {
    fontSize: 9,
    marginBottom: 6
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
    columnGap: 12
  },
  filterItem: {
    width: "31%"
  },
  filterLabel: {
    fontSize: 7.5,
    color: "#6e6457"
  },
  filterValue: {
    fontSize: 8.5
  },
  headerSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5efe6",
    borderBottomWidth: 1,
    borderBottomColor: "#b9b0a2",
    paddingVertical: 5
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ece5d9",
    paddingVertical: 5
  },
  cellText: {
    paddingRight: 5
  },
  cellCenter: {
    paddingHorizontal: 3,
    textAlign: "center"
  },
  cellRight: {
    paddingHorizontal: 3,
    textAlign: "right"
  },
  cellDate: {
    width: "7%"
  },
  cellFicha: {
    width: "7%"
  },
  cellClienteObra: {
    width: "17%"
  },
  cellServico: {
    width: "14%"
  },
  cellEquipamento: {
    width: "14%"
  },
  cellColaborador: {
    width: "11%"
  },
  cellApontado: {
    width: "10%"
  },
  cellFaturado: {
    width: "10%"
  },
  cellStatus: {
    width: "10%"
  },
  footer: {
    marginTop: 14,
    fontSize: 8.5,
    color: "#6e6457"
  },
  summarySection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#d7cfbf",
    paddingTop: 10
  },
  summaryTitle: {
    fontSize: 10,
    marginBottom: 8
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ece5d9",
    paddingVertical: 4
  },
  summaryLabel: {
    width: "72%",
    paddingRight: 8
  },
  summaryValue: {
    width: "28%",
    textAlign: "right"
  }
});

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
}

function formatResumoQuantidade(quantidade: number, unidade: UnidadeFaturada) {
  const value = Number.isFinite(quantidade) ? quantidade : 0;
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value.toFixed(2)));

  return `${formatted} ${formatUnidade(unidade)}`;
}

export function LancamentosRelatorioPdfDocument(props: LancamentosRelatorioPdfProps) {
  const totaisPorServico = Array.from(
    props.itens.reduce((acc, item) => {
      const labelBase = formatServicoDisplay(item.servicoNome);
      const materialPart = item.materialNome ? ` - ${item.materialNome}` : "";
      const key = `${labelBase}|${materialPart}|${item.unidadeFaturada}`;
      const current = acc.get(key);

      if (current) {
        current.quantidade += Number(item.quantidadeFaturada);
        return acc;
      }

      acc.set(key, {
        label: `${labelBase}${materialPart}`,
        quantidade: Number(item.quantidadeFaturada),
        unidade: item.unidadeFaturada
      });

      return acc;
    }, new Map<string, { label: string; quantidade: number; unidade: UnidadeFaturada }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            {props.logoPath ? <Image style={styles.logo} src={props.logoPath} /> : null}
            <Text style={styles.title}>{props.titulo}</Text>
            <Text style={styles.subtitle}>
              Relatorio gerado a partir dos filtros aplicados no historico de lancamentos
            </Text>
          </View>
        </View>

        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>Filtros aplicados</Text>
          <View style={styles.filterGrid}>
            {props.filtros.map((filtro) => (
              <View key={filtro.label} style={styles.filterItem}>
                <Text style={styles.filterLabel}>{filtro.label}</Text>
                <Text style={styles.filterValue}>{filtro.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.headerSummaryRow}>
          <Text>Total de lancamentos: {props.itens.length}</Text>
          <Text>Emitido em: {formatDate(props.emitidoEm)}</Text>
        </View>

        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellText, styles.cellDate]}>Data</Text>
            <Text style={[styles.cellText, styles.cellFicha]}>Ficha</Text>
            <Text style={[styles.cellText, styles.cellClienteObra]}>Cliente / Obra</Text>
            <Text style={[styles.cellText, styles.cellServico]}>Servico / Material</Text>
            <Text style={[styles.cellText, styles.cellEquipamento]}>Maquina / Recurso</Text>
            <Text style={[styles.cellText, styles.cellColaborador]}>Operador</Text>
            <Text style={[styles.cellRight, styles.cellApontado]}>Apontado</Text>
            <Text style={[styles.cellRight, styles.cellFaturado]}>Faturado</Text>
            <Text style={[styles.cellCenter, styles.cellStatus]}>Status</Text>
          </View>

          {props.itens.map((item) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={[styles.cellText, styles.cellDate]}>{formatDate(item.data)}</Text>
              <Text style={[styles.cellText, styles.cellFicha]}>{item.fichaNumero}</Text>
              <Text style={[styles.cellText, styles.cellClienteObra]}>
                {item.clienteNome}
                {"\n"}
                {item.obraNome ?? "SEM OBRA"}
              </Text>
              <Text style={[styles.cellText, styles.cellServico]}>
                {formatServicoDisplay(item.servicoNome)}
                {"\n"}
                {item.materialNome ?? "-"}
              </Text>
              <Text style={[styles.cellText, styles.cellEquipamento]}>
                {item.equipamentoNome}
                {"\n"}
                {item.equipamentoTag}
              </Text>
              <Text style={[styles.cellText, styles.cellColaborador]}>{item.colaboradorNome}</Text>
              <Text style={[styles.cellRight, styles.cellApontado]}>
                {formatQuantidadeComUnidade(item.quantidadeApontada, item.unidadeApontada)}
              </Text>
              <Text style={[styles.cellRight, styles.cellFaturado]}>
                {formatQuantidadeComUnidade(item.quantidadeFaturada, item.unidadeFaturada)}
              </Text>
              <Text style={[styles.cellCenter, styles.cellStatus]}>{item.statusValidacao}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Totais por servico</Text>
          {totaisPorServico.map((total) => (
            <View
              key={`${total.label}-${total.unidade}`}
              style={styles.summaryRow}
              wrap={false}
            >
              <Text style={styles.summaryLabel}>{total.label}</Text>
              <Text style={styles.summaryValue}>
                {formatResumoQuantidade(total.quantidade, total.unidade)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>
            O relatorio respeita exatamente os filtros selecionados na tela de historico.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
