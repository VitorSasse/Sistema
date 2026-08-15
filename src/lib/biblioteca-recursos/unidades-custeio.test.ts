import { describe, expect, it } from "vitest";
import { unidadesCusteioIniciais } from "./unidades-custeio";

describe("catalogo inicial de unidades de custeio", () => {
  it("mantem codigos unicos para permitir upsert por empresa", () => {
    const codigos = unidadesCusteioIniciais.map((unidade) => unidade.codigo);

    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("define unidade de custeio como dado de catalogo extensivel", () => {
    expect(unidadesCusteioIniciais.every((unidade) =>
      unidade.codigo && unidade.rotulo && unidade.baseEconomica && unidade.sufixo
    )).toBe(true);
  });
});
