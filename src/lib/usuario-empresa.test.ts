import { describe, expect, it } from "vitest";
import { RoleUsuarioEmpresa } from "@prisma/client";
import { selecionarEmpresaUsuario, type UsuarioEmpresaAcesso } from "@/lib/usuario-empresa";

function acesso(empresaId: string, padrao = false): UsuarioEmpresaAcesso {
  return {
    empresaId,
    nome: empresaId,
    nomeFantasia: null,
    razaoSocial: null,
    roleEmpresa: RoleUsuarioEmpresa.OPERADOR,
    roles: ["OPERACIONAL"],
    modoSomenteLeitura: false,
    permissoesAcesso: {},
    padrao
  };
}

describe("selecionarEmpresaUsuario", () => {
  it("usa a empresa selecionada quando o usuario possui vinculo ativo", () => {
    const result = selecionarEmpresaUsuario({
      acessos: [acesso("empresa-a", true), acesso("empresa-b")],
      empresaSelecionadaId: "empresa-b",
      empresaLegadaId: "empresa-a"
    });

    expect(result?.empresaId).toBe("empresa-b");
  });

  it("ignora empresa selecionada sem vinculo e usa a padrao", () => {
    const result = selecionarEmpresaUsuario({
      acessos: [acesso("empresa-a", true), acesso("empresa-b")],
      empresaSelecionadaId: "empresa-c",
      empresaLegadaId: "empresa-b"
    });

    expect(result?.empresaId).toBe("empresa-a");
  });

  it("usa a empresa legada quando nao ha padrao", () => {
    const result = selecionarEmpresaUsuario({
      acessos: [acesso("empresa-a"), acesso("empresa-b")],
      empresaLegadaId: "empresa-b"
    });

    expect(result?.empresaId).toBe("empresa-b");
  });

  it("retorna null quando o usuario nao possui vinculos", () => {
    const result = selecionarEmpresaUsuario({
      acessos: [],
      empresaSelecionadaId: "empresa-a",
      empresaLegadaId: "empresa-a"
    });

    expect(result).toBeNull();
  });
});
