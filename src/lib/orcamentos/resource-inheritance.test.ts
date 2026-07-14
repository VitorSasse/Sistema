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
    caracteristicasTecnicas: { tipoCarroceria: "basculante" }
  };

  it("herda os valores tecnicos e cria um snapshot independente", () => {
    const snapshot = criarSnapshotCaracteristicasRecurso(mestre);

    expect(valoresEfetivosDaHeranca(snapshot)).toEqual({
      capacidadePorViagem: "14",
      unidadeCapacidade: "m3",
      unidadeEconomicaCusto: "KM"
    });
    expect(snapshot.herdados.caracteristicasTecnicas).toEqual({ tipoCarroceria: "basculante" });

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
      unidadeEconomicaPadrao: null
    });

    expect(campoTecnicoHerdado(snapshot, [], "capacidadePorViagem")).toBe(false);
    expect(campoTecnicoHerdado(snapshot, [], "unidadeEconomicaCusto")).toBe(false);
  });
});
