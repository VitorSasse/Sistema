import { describe, expect, it } from "vitest";

import {
  criarReferenciasAPartirDeClasses,
  nomeReferenciaTecnicaValido,
  normalizarNomeReferenciaTecnica
} from "./referencias-tecnicas";

describe("referencias tecnicas de recursos", () => {
  it("normaliza nome para evitar duplicidades obvias por espaco e capitalizacao", () => {
    expect(normalizarNomeReferenciaTecnica("  Caminhao   Basculante 14 m3 ")).toBe("caminhao basculante 14 m3");
    expect(nomeReferenciaTecnicaValido("  Caminhao   Basculante 14 m3 ")).toBe("Caminhao Basculante 14 m3");
  });

  it("cria uma referencia por empresa e nome normalizado", () => {
    const referencias = criarReferenciasAPartirDeClasses([
      { empresaId: "empresa-a", classeOperacional: "Escavadeira 15 t" },
      { empresaId: "empresa-a", classeOperacional: "  ESCAVADEIRA   15 T " },
      { empresaId: "empresa-b", classeOperacional: "Escavadeira 15 t" }
    ]);

    expect(referencias).toHaveLength(2);
    expect(referencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ empresaId: "empresa-a", nomeNormalizado: "escavadeira 15 t" }),
        expect.objectContaining({ empresaId: "empresa-b", nomeNormalizado: "escavadeira 15 t" })
      ])
    );
  });

  it("ignora classes vazias para manter equipamentos sem referencia validos", () => {
    const referencias = criarReferenciasAPartirDeClasses([
      { empresaId: "empresa-a", classeOperacional: "" },
      { empresaId: "empresa-a", classeOperacional: "   " },
      { empresaId: "empresa-a", classeOperacional: null }
    ]);

    expect(referencias).toEqual([]);
  });
});
