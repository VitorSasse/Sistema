import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type RelatorioFiltro = {
  label: string;
  value: string;
};

type LancamentoRomaneioGroup = {
  lancamentoId: string;
  fichaKey: string;
  data: Date;
  fichaNumero: string;
  clienteNome: string;
  obraNome: string | null;
  servicoNome: string;
  materialNome: string | null;
  romaneios: string[];
};

type RomaneiosRelatorioPdfProps = {
  titulo: string;
  filtros: RelatorioFiltro[];
  lancamentos: LancamentoRomaneioGroup[];
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
    width: "47%"
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
  lancamentoBlock: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ece5d9",
    borderRadius: 8,
    overflow: "hidden"
  },
  lancamentoHeader: {
    backgroundColor: "#fffaf0",
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 8.5
  },
  romaneioRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1ebdf",
    paddingVertical: 3,
    paddingHorizontal: 8
  },
  romaneioColData: {
    width: "20%"
  },
  romaneioColFicha: {
    width: "16%"
  },
  romaneioColLancamento: {
    width: "34%"
  },
  romaneioColNumero: {
    width: "30%"
  },
  compactHeader: {
    flexDirection: "row",
    backgroundColor: "#fffaf0",
    borderTopWidth: 1,
    borderTopColor: "#ece5d9",
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  totalFicha: {
    marginTop: 6,
    fontSize: 8.5,
    color: "#6e6457"
  },
  emptyState: {
    paddingVertical: 6,
    paddingHorizontal: 8,
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
  const fichas = Array.from(
    props.lancamentos.reduce((acc, lancamento) => {
      const current = acc.get(lancamento.fichaKey) ?? {
        fichaKey: lancamento.fichaKey,
        data: lancamento.data,
        fichaNumero: lancamento.fichaNumero,
        clienteNome: lancamento.clienteNome,
        obraNome: lancamento.obraNome,
        lancamentos: [] as LancamentoRomaneioGroup[]
      };

      current.lancamentos.push(lancamento);
      acc.set(lancamento.fichaKey, current);
      return acc;
    }, new Map<string, {
      fichaKey: string;
      data: Date;
      fichaNumero: string;
      clienteNome: string;
      obraNome: string | null;
      lancamentos: LancamentoRomaneioGroup[];
    }>())
  ).map(([, value]) => value);

  const gruposPorData = Array.from(
    fichas.reduce((acc, ficha) => {
      const key = formatDate(ficha.data);
      const current = acc.get(key) ?? [];
      current.push(ficha);
      acc.set(key, current);
      return acc;
    }, new Map<string, typeof fichas>())
  );

  const totalDias = gruposPorData.length;
  const totalFichas = fichas.length;
  const totalRomaneios = props.lancamentos.reduce(
    (acc, lancamento) => acc + lancamento.romaneios.length,
    0
  );
  const resumoPorCarga = Array.from(
    props.lancamentos.reduce((acc, lancamento) => {
      const label = lancamento.materialNome?.trim() || lancamento.servicoNome;
      acc.set(label, (acc.get(label) ?? 0) + lancamento.romaneios.length);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
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

        {gruposPorData.map(([dataLabel, fichasDoDia]) => (
          <View key={dataLabel} style={styles.dateSection}>
            <Text style={styles.dateHeading}>DATA: {dataLabel}</Text>

            {fichasDoDia.map((ficha) => {
              const totalRomaneiosDaFicha = ficha.lancamentos.reduce(
                (acc, lancamento) => acc + lancamento.romaneios.length,
                0
              );

              return (
                <View key={ficha.fichaKey} style={styles.fichaBlock}>
                  <Text style={styles.fichaHeading}>FICHA: {ficha.fichaNumero}</Text>
                  <Text style={styles.fichaMeta}>
                    Cliente: {ficha.clienteNome}
                    {ficha.obraNome ? ` | Obra: ${ficha.obraNome}` : ""}
                  </Text>

                  <View style={styles.compactHeader}>
                    <Text style={styles.romaneioColData}>Data</Text>
                    <Text style={styles.romaneioColFicha}>Ficha</Text>
                    <Text style={styles.romaneioColLancamento}>Lancamento</Text>
                    <Text style={styles.romaneioColNumero}>Romaneio</Text>
                  </View>

                  {ficha.lancamentos.map((lancamento) => {
                    const lancamentoLabel = lancamento.materialNome
                      ? `${lancamento.servicoNome} / ${lancamento.materialNome}`
                      : lancamento.servicoNome;

                    return (
                      <View key={lancamento.lancamentoId} style={styles.lancamentoBlock} wrap={false}>
                        <Text style={styles.lancamentoHeader}>{lancamentoLabel}</Text>

                        {lancamento.romaneios.length > 0 ? (
                          lancamento.romaneios.map((romaneio) => (
                            <View key={`${lancamento.lancamentoId}-${romaneio}`} style={styles.romaneioRow}>
                              <Text style={styles.romaneioColData}>{dataLabel}</Text>
                              <Text style={styles.romaneioColFicha}>{ficha.fichaNumero}</Text>
                              <Text style={styles.romaneioColLancamento}>{lancamentoLabel}</Text>
                              <Text style={styles.romaneioColNumero}>{romaneio}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyState}>Sem romaneio informado neste lancamento.</Text>
                        )}
                      </View>
                    );
                  })}

                  <Text style={styles.totalFicha}>
                    Total de Romaneios da Ficha: {totalRomaneiosDaFicha}
                  </Text>
                </View>
              );
            })}
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

          {resumoPorCarga.map(([carga, total]) => (
            <View key={`resumo-carga-${carga}`} style={styles.summaryRow} wrap={false}>
              <Text style={styles.summaryLabel}>{carga}</Text>
              <Text style={styles.summaryValue}>{total} romaneio(s)</Text>
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
