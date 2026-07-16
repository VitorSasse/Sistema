import { describe, expect, it } from "vitest";
import {
  campoTecnicoHerdado,
  criarSnapshotCaracteristicasRecurso,
  normalizarSnapshotCaracteristicasRecurso,
  personalizarCampoTecnico,
  valoresEfetivosDaHeranca
} from "@/lib/orcamentos/resource-inheritance";

describe("heranca de caracteristicas do recurso mestre", () => {
  const mestre = {
    id: "equipamento-1",
    capacidadeM3: "14.00",
    unidadeCapacidade: "m3",
    unidadeEconomicaPadrao: "KM",
    custoPadrao: "8.50",
    permitirEdicaoOrcamento: true,
    naturezaRecurso: "TERCEIRIZADO",
    tipoRecurso: "CAMINHAO",
    classeOperacional: "Caminhao basculante 14 m3",
    descricaoOperacional: "Transporte de material",
    caracteristicasTecnicas: { tipoCarroceria: "basculante" }
  };

  it("herda os valores tecnicos e cria um snapshot independente", () => {
    const snapshot = criarSnapshotCaracteristicasRecurso(mestre);

    expect(valoresEfetivosDaHeranca(snapshot)).toEqual({
      capacidadePorViagem: "14",
      unidadeCapacidade: "m3",
      unidadeEconomicaCusto: "KM",
      valorCusto: "8.5",
      permitirEdicaoOrcamento: true
    });
    expect(snapshot.herdados.caracteristicasTecnicas).toEqual({ tipoCarroceria: "basculante" });
    expect(snapshot.herdados.naturezaRecurso).toBe("TERCEIRIZADO");
    expect(snapshot.herdados.tipoRecurso).toBe("CAMINHAO");
    expect(snapshot.herdados.classeOperacional).toBe("Caminhao basculante 14 m3");

    mestre.capacidadeM3 = "18";
    mestre.caracteristicasTecnicas.tipoCarroceria = "cacamba";
    expect(snapshot.herdados.capacidadePorViagem).toBe(14);
    expect(snapshot.herdados.caracteristicasTecnicas).toEqual({ tipoCarroceria: "basculante" });
  });

  it("mantem os campos bloqueados ate serem personalizados na frente", () => {
    const snapshot = criarSnapshotCaracteristicasRecurso(mestre);
    const personalizados = personalizarCampoTecnico([], "capacidadePorViagem");

    expect(campoTecnicoHerdado(snapshot, [], "capacidadePorViagem")).toBe(true);
    expect(campoTecnicoHerdado(snapshot, personalizados, "capacidadePorViagem")).toBe(false);
    expect(campoTecnicoHerdado(snapshot, [], "unidadeCapacidade")).toBe(true);
  });

  it("preserva o snapshot e a personalizacao depois da serializacao", () => {
    const snapshot = criarSnapshotCaracteristicasRecurso(mestre);
    const persisted = JSON.parse(JSON.stringify(snapshot)) as unknown;
    const restored = normalizarSnapshotCaracteristicasRecurso(persisted);
    const personalizados = personalizarCampoTecnico([], "unidadeEconomicaCusto");

    expect(restored).toEqual(snapshot);
    expect(campoTecnicoHerdado(restored, personalizados, "unidadeEconomicaCusto")).toBe(false);
    expect(campoTecnicoHerdado(restored, personalizados, "capacidadePorViagem")).toBe(true);
  });

  it("deixa editavel uma caracteristica que nao existe no cadastro mestre", () => {
    const snapshot = criarSnapshotCaracteristicasRecurso({
      id: "equipamento-2",
      capacidadeM3: null,
      unidadeCapacidade: null,
      unidadeEconomicaPadrao: null,
      custoPadrao: null
    });

    expect(campoTecnicoHerdado(snapshot, [], "capacidadePorViagem")).toBe(false);
    expect(campoTecnicoHerdado(snapshot, [], "unidadeEconomicaCusto")).toBe(false);
    expect(campoTecnicoHerdado(snapshot, [], "valorCusto")).toBe(false);
  });

  it("preserva custo padrao e permissao de edicao no snapshot do orcamento", () => {
    const snapshot = criarSnapshotCaracteristicasRecurso({
      ...mestre,
      custoPadrao: 900,
      permitirEdicaoOrcamento: false
    });
    const herdados = valoresEfetivosDaHeranca(snapshot);

    expect(herdados.valorCusto).toBe("900");
    expect(herdados.permitirEdicaoOrcamento).toBe(false);
    expect(snapshot.herdados.valorCusto).toBe(900);
  });
});
