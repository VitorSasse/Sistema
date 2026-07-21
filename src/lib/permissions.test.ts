import { describe, expect, it } from "vitest";
import { canAccessModule } from "@/lib/permissions";

describe("canAccessModule", () => {
  it("usa permissoes personalizadas como fonte autoritativa quando elas existem", () => {
    const subject = {
      roles: ["CONSULTA"],
      roleEmpresa: "VISUALIZADOR",
      modoSomenteLeitura: true,
      permissoesAcesso: {
        clientes: { view: true, manage: false }
      }
    };

    expect(canAccessModule(subject, "clientes", "view")).toBe(true);
    expect(canAccessModule(subject, "obras", "view")).toBe(false);
    expect(canAccessModule(subject, "clientes", "manage")).toBe(false);
  });

  it("usa o perfil base apenas quando nao ha configuracao personalizada", () => {
    const subject = {
      roles: ["OPERACIONAL"],
      roleEmpresa: "OPERADOR",
      modoSomenteLeitura: false,
      permissoesAcesso: {}
    };

    expect(canAccessModule(subject, "lancamentos", "manage")).toBe(true);
    expect(canAccessModule(subject, "fornecedores", "view")).toBe(false);
  });
});
