import { describe, expect, it } from "vitest";
import { referenciaTecnicaRecursoSchema } from "@/lib/validators/biblioteca-recursos";

const unidadeCusteioId = "11111111-1111-4111-8111-111111111111";

function forma(overrides = {}) {
  return {
    nome: "Diaria padrao",
    unidadeCusteioId,
    valorReferencia: 950,
    preferencial: false,
    ativo: true,
    observacao: "",
    ...overrides
  };
}

describe("referenciaTecnicaRecursoSchema", () => {
  it("aceita referencia tecnica sem formas de custeio", () => {
    const result = referenciaTecnicaRecursoSchema.safeParse({
      nome: "Escavadeira Hidraulica 15 t",
      ativo: true,
      observacao: ""
    });

    expect(result.success).toBe(true);
    expect(result.data?.formasCusteio).toEqual([]);
  });

  it("aceita formas de custeio padrao na referencia tecnica", () => {
    const result = referenciaTecnicaRecursoSchema.safeParse({
      nome: "Caminhao Basculante 14 m3",
      ativo: true,
      observacao: "",
      formasCusteio: [forma({ preferencial: true })]
    });

    expect(result.success).toBe(true);
    expect(result.data?.formasCusteio[0]).toMatchObject({
      nome: "Diaria padrao",
      valorReferencia: 950,
      preferencial: true
    });
  });

  it("bloqueia mais de uma forma preferencial ativa", () => {
    const result = referenciaTecnicaRecursoSchema.safeParse({
      nome: "Rolo Compactador",
      ativo: true,
      observacao: "",
      formasCusteio: [
        forma({ nome: "Diaria", preferencial: true }),
        forma({ nome: "Hora", preferencial: true })
      ]
    });

    expect(result.success).toBe(false);
  });
});
