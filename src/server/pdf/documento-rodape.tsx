import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
    borderTopWidth: 1,
    borderColor: "#c8c8c8",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  footerText: {
    color: "#4a4a4a",
    fontSize: 7.8
  },
  footerCenter: {
    color: "#4a4a4a",
    fontSize: 7.8,
    textAlign: "center"
  },
  footerRight: {
    color: "#4a4a4a",
    fontSize: 7.8,
    textAlign: "right"
  }
});

type DocumentoRodapeProps = {
  centerText: string;
};

export function DocumentoRodape({ centerText }: DocumentoRodapeProps) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Documento emitido pelo BasePro OS</Text>
      <Text style={styles.footerCenter}>{centerText}</Text>
      <Text
        style={styles.footerRight}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}
