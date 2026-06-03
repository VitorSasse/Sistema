import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type RelatorioFiltro = {
  label: string;
  value: string;
};

type FichaRomaneioGroup = {
  fichaId: string;
  data: Date;
  fichaNumero: string;
  clienteNome: string;
  obraNome: string | null;
  romaneios: string[];
};

type RomaneiosRelatorioPdfProps = {
  titulo: string;
  filtros: RelatorioFiltro[];
  fichas: FichaRomaneioGroup[];
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
  dateSection: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#d7cfbf",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12
  },
  dateHeading: {
    backgroundColor: "#f5efe6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10
  },
  fichaBlock: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#ece5d9"
  },
  fichaHeading: {
    fontSize: 9.5,
    marginBottom: 2
  },
  fichaMeta: {
    fontSize: 8.5,
    color: "#6e6457",
    marginBottom: 6
  },
  romaneioRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1ebdf",
    paddingVertical: 3
  },
  romaneioColData: {
    width: "20%"
  },
  romaneioColFicha: {
    width: "20%"
  },
  romaneioColNumero: {
    width: "60%"
  },
  compactHeader: {
    flexDirection: "row",
    backgroundColor: "#fffaf0",
    borderBottomWidth: 1,
    borderBottomColor: "#ece5d9",
    paddingVertical: 4
  },
  totalFicha: {
    marginTop: 6,
    fontSize: 8.5,
    color: "#6e6457"
  },
  emptyState: {
    paddingVertical: 3,
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
  },
  footer: {
    marginTop: 14,
    fontSize: 8.5,
    color: "#6e6457"
  }
});

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
}

export function RomaneiosRelatorioPdfDocument(props: RomaneiosRelatorioPdfProps) {
  const gruposPorData = Array.from(
    props.fichas.reduce((acc, ficha) => {
      const key = formatDate(ficha.data);
      const current = acc.get(key) ?? [];
      current.push(ficha);
      acc.set(key, current);
      return acc;
    }, new Map<string, FichaRomaneioGroup[]>())
  );

  const totalDias = gruposPorData.length;
  const totalFichas = props.fichas.length;
  const totalRomaneios = props.fichas.reduce((acc, ficha) => acc + ficha.romaneios.length, 0);

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
          <Text>Total de fichas: {totalFichas}</Text>
          <Text>Emitido em: {formatDate(props.emitidoEm)}</Text>
        </View>

        {gruposPorData.map(([dataLabel, fichas]) => (
          <View key={dataLabel} style={styles.dateSection} wrap={false}>
            <Text style={styles.dateHeading}>DATA: {dataLabel}</Text>

            {fichas.map((ficha) => (
              <View key={ficha.fichaId} style={styles.fichaBlock}>
                <Text style={styles.fichaHeading}>FICHA: {ficha.fichaNumero}</Text>
                <Text style={styles.fichaMeta}>
                  Cliente: {ficha.clienteNome}
                  {ficha.obraNome ? ` | Obra: ${ficha.obraNome}` : ""}
                </Text>

                <View style={styles.compactHeader}>
                  <Text style={styles.romaneioColData}>Data</Text>
                  <Text style={styles.romaneioColFicha}>Ficha</Text>
                  <Text style={styles.romaneioColNumero}>Romaneio</Text>
                </View>

                {ficha.romaneios.length > 0 ? (
                  ficha.romaneios.map((romaneio) => (
                    <View key={`${ficha.fichaId}-${romaneio}`} style={styles.romaneioRow}>
                      <Text style={styles.romaneioColData}>{dataLabel}</Text>
                      <Text style={styles.romaneioColFicha}>{ficha.fichaNumero}</Text>
                      <Text style={styles.romaneioColNumero}>{romaneio}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyState}>Sem romaneio informado nesta ficha.</Text>
                )}

                <Text style={styles.totalFicha}>
                  Total de Romaneios da Ficha: {ficha.romaneios.length}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumo Geral</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de Dias</Text>
            <Text style={styles.summaryValue}>{totalDias}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de Fichas</Text>
            <Text style={styles.summaryValue}>{totalFichas}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de Romaneios</Text>
            <Text style={styles.summaryValue}>{totalRomaneios}</Text>
          </View>

          {props.fichas.map((ficha) => (
            <View key={`resumo-${ficha.fichaId}`} style={styles.summaryRow} wrap={false}>
              <Text style={styles.summaryLabel}>
                Ficha {ficha.fichaNumero} - {ficha.clienteNome}
              </Text>
              <Text style={styles.summaryValue}>{ficha.romaneios.length} romaneio(s)</Text>
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
