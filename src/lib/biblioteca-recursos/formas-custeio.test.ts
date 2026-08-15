import { describe, expect, it } from "vitest";
import {
  buildFormasCusteioCreateMany,
  buildFormasCusteioNestedCreate,
  normalizeFormasCusteioPayload
} from "@/lib/biblioteca-recursos/formas-custeio";

const empresaId = "emp-1";
const unidadeCusteioId = "11111111-1111-4111-8111-111111111111";

function forma(overrides = {}) {
  return {
    nome: "Diaria padrao",
    unidadeCusteioId,
    valorReferencia: 950,
    preferencial: true,
    ativo: true,
    observacao: "",
    ...overrides
  };
}

describe("formas de custeio da biblioteca de recursos", () => {
  it("normaliza valores recebidos do formulario sem alterar a semantica da forma", () => {
    expect(normalizeFormasCusteioPayload([
      { nome: "Hora", unidadeCusteioId, valorReferencia: "125.5", preferencial: "on" }
    ])).toEqual([
      {
        nome: "Hora",
        unidadeCusteioId,
        valorReferencia: 125.5,
        preferencial: true,
        ativo: true
      }
    ]);
  });

  it("cria dados aninhados sem definir dono manualmente", () => {
    const [created] = buildFormasCusteioNestedCreate(empresaId, [forma()]);

    expect(created).toMatchObject({
      empresaId,
      nome: "Diaria padrao",
      valorReferencia: 950
    });
    expect(created).not.toHaveProperty("equipamentoId");
    expect(created).not.toHaveProperty("referenciaTecnicaId");
  });

  it("cria forma com equipamento como unico proprietario", () => {
    expect(buildFormasCusteioCreateMany(empresaId, { equipamentoId: "eq-1" }, [forma()])[0]).toMatchObject({
      empresaId,
      equipamentoId: "eq-1",
      referenciaTecnicaId: null
    });
  });

  it("cria forma com referencia tecnica como unico proprietario", () => {
    expect(buildFormasCusteioCreateMany(empresaId, { referenciaTecnicaId: "ref-1" }, [forma()])[0]).toMatchObject({
      empresaId,
      equipamentoId: null,
      referenciaTecnicaId: "ref-1"
    });
  });
});
