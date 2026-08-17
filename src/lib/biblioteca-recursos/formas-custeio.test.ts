import { describe, expect, it } from "vitest";
import {
  buildFormasCusteioCreateMany,
  buildFormasCusteioNestedCreate,
  normalizeFormasCusteioPayload,
  resolverFormaCusteioEquipamento,
  resolverFormaCusteioPorId
} from "@/lib/biblioteca-recursos/formas-custeio";

const empresaId = "emp-1";
const unidadeCusteioId = "11111111-1111-4111-8111-111111111111";

function forma(overrides = {}) {
  return {
    id: "forma-1",
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

  it("prioriza forma propria preferencial do equipamento", () => {
    const result = resolverFormaCusteioEquipamento({
      id: "eq-1",
      formasCusteio: [
        forma({ id: "eq-hora", nome: "Hora", preferencial: true, unidadeCusteio: { baseEconomica: "HORA", sufixo: "R$/h" } }),
        forma({ id: "eq-dia", nome: "Dia", preferencial: false, unidadeCusteio: { baseEconomica: "DIA", sufixo: "R$/dia" } })
      ],
      referenciaTecnica: {
        id: "ref-1",
        nome: "Escavadeira 15 t",
        formasCusteio: [forma({ id: "ref-dia", unidadeCusteio: { baseEconomica: "DIA", sufixo: "R$/dia" } })]
      }
    });

    expect(result).toMatchObject({
      status: "RESOLVIDA",
      origem: "EQUIPAMENTO",
      forma: { id: "eq-hora" },
      baseEconomica: "HORA",
      unidadeCusto: "R$/h",
      valorAplicado: 950
    });
  });

  it("nao escolhe arbitrariamente quando equipamento possui varias formas sem preferencial", () => {
    const result = resolverFormaCusteioEquipamento({
      id: "eq-1",
      formasCusteio: [
        forma({ id: "eq-hora", preferencial: false, unidadeCusteio: { baseEconomica: "HORA", sufixo: "R$/h" } }),
        forma({ id: "eq-dia", preferencial: false, unidadeCusteio: { baseEconomica: "DIA", sufixo: "R$/dia" } })
      ]
    });

    expect(result).toMatchObject({
      status: "MULTIPLAS_FORMAS",
      origem: "EQUIPAMENTO"
    });
  });

  it("herda forma preferencial da referencia tecnica quando o equipamento nao possui forma propria", () => {
    const result = resolverFormaCusteioEquipamento({
      id: "eq-1",
      referenciaTecnicaId: "ref-1",
      referenciaTecnica: {
        id: "ref-1",
        nome: "Caminhao basculante",
        formasCusteio: [forma({ id: "ref-km", unidadeCusteio: { baseEconomica: "KM", sufixo: "R$/km" } })]
      }
    });

    expect(result).toMatchObject({
      status: "RESOLVIDA",
      origem: "REFERENCIA_TECNICA",
      referenciaTecnicaId: "ref-1",
      forma: { id: "ref-km" },
      baseEconomica: "KM"
    });
  });

  it("mantem fallback legado quando nao ha forma configurada", () => {
    const result = resolverFormaCusteioEquipamento({
      id: "eq-1",
      unidadeEconomicaPadrao: "DIA",
      custoPadrao: "800"
    });

    expect(result).toMatchObject({
      status: "RESOLVIDA",
      origem: "LEGADO",
      baseEconomica: "DIA",
      valorReferencia: 800,
      valorAplicado: 800
    });
  });

  it("nao inventa custo quando biblioteca e legado estao vazios", () => {
    const result = resolverFormaCusteioEquipamento({ id: "eq-1" });

    expect(result).toMatchObject({
      status: "SEM_CUSTO",
      origem: "PENDENTE"
    });
    expect(result.valorAplicado).toBeUndefined();
  });

  it("permite escolha explicita de forma sem alterar o valor de referencia", () => {
    const result = resolverFormaCusteioPorId({
      id: "eq-1",
      formasCusteio: [
        forma({ id: "eq-hora", preferencial: false, valorReferencia: 100, unidadeCusteio: { baseEconomica: "HORA", sufixo: "R$/h" } }),
        forma({ id: "eq-dia", preferencial: false, valorReferencia: 700, unidadeCusteio: { baseEconomica: "DIA", sufixo: "R$/dia" } })
      ]
    }, "eq-dia");

    expect(result).toMatchObject({
      status: "RESOLVIDA",
      origem: "EQUIPAMENTO",
      forma: { id: "eq-dia" },
      valorReferencia: 700,
      valorAplicado: 700
    });
  });
});
