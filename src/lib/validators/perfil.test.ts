import { describe, expect, it } from "vitest";
import { alterarSenhaSchema, perfilUpdateSchema } from "@/lib/validators/perfil";

describe("perfilUpdateSchema", () => {
  it("aceita dados pessoais validos sem foto", () => {
    const result = perfilUpdateSchema.safeParse({
      nome: "Usuario de Teste",
      email: "usuario@basepro.com.br",
      telefone: "(47) 9 0000-0000",
      fotoPerfilUrl: null
    });

    expect(result.success).toBe(true);
  });

  it("rejeita telefone sem DDD completo", () => {
    const result = perfilUpdateSchema.safeParse({
      nome: "Usuario de Teste",
      email: "usuario@basepro.com.br",
      telefone: "9999-0000",
      fotoPerfilUrl: null
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.telefone).toContain("Informe um telefone valido com DDD.");
  });

  it("rejeita avatar maior que 2 MB", () => {
    const oversizedImage = `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64")}`;
    const result = perfilUpdateSchema.safeParse({
      nome: "Usuario de Teste",
      email: "usuario@basepro.com.br",
      telefone: "",
      fotoPerfilUrl: oversizedImage
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.fotoPerfilUrl?.[0]).toContain("no maximo 2 MB");
  });

  it("aceita a referencia autenticada da foto ja persistida", () => {
    const result = perfilUpdateSchema.safeParse({
      nome: "Usuario de Teste",
      email: "usuario@basepro.com.br",
      telefone: "",
      fotoPerfilUrl: "/api/perfil/foto?v=1720958400000"
    });

    expect(result.success).toBe(true);
  });
});

describe("alterarSenhaSchema", () => {
  it("aceita uma nova senha forte e confirmada", () => {
    expect(alterarSenhaSchema.safeParse({
      senhaAtual: "SenhaAtual1",
      novaSenha: "NovaSenha2",
      confirmarSenha: "NovaSenha2"
    }).success).toBe(true);
  });

  it("rejeita confirmacao diferente", () => {
    const result = alterarSenhaSchema.safeParse({
      senhaAtual: "SenhaAtual1",
      novaSenha: "NovaSenha2",
      confirmarSenha: "OutraSenha3"
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.confirmarSenha).toContain("A confirmacao deve ser igual a nova senha.");
  });

  it("rejeita a repeticao textual da senha atual", () => {
    const result = alterarSenhaSchema.safeParse({
      senhaAtual: "SenhaAtual1",
      novaSenha: "SenhaAtual1",
      confirmarSenha: "SenhaAtual1"
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.novaSenha).toContain("A nova senha deve ser diferente da senha atual.");
  });
});
