import { StatusCadastro, TipoCliente } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { clienteSchema } from "@/lib/validators/cliente";

describe("clienteSchema", () => {
  it("permite prospecto com nome e contato sem CPF/CNPJ", () => {
    const parsed = clienteSchema.safeParse({
      tipoCliente: TipoCliente.CNPJ,
      nome: "Cliente Prospecto",
      telefone: "(47) 99999-9999",
      status: StatusCadastro.PROSPECTO,
      cadastroCompleto: false
    });

    expect(parsed.success).toBe(true);
  });

  it("mantem CPF/CNPJ obrigatorio para cadastro completo", () => {
    const parsed = clienteSchema.safeParse({
      tipoCliente: TipoCliente.CNPJ,
      nome: "Cliente Completo",
      telefone: "(47) 99999-9999",
      status: StatusCadastro.ATIVO,
      cadastroCompleto: true
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Validacao deveria falhar.");
    expect(parsed.error.flatten().fieldErrors.cnpj).toContain("CNPJ e obrigatorio.");
  });

  it("rejeita documento invalido mesmo em prospecto", () => {
    const parsed = clienteSchema.safeParse({
      tipoCliente: TipoCliente.CNPJ,
      nome: "Cliente Prospecto",
      telefone: "(47) 99999-9999",
      cnpj: "12.345",
      status: StatusCadastro.PROSPECTO,
      cadastroCompleto: false
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("Validacao deveria falhar.");
    expect(parsed.error.flatten().fieldErrors.cnpj).toContain("CNPJ invalido.");
  });
});
