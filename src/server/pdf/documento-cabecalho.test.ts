import { describe, expect, it } from "vitest";
import { mergeEmpresaComCabecalho, resolveDocumentoCabecalhoPdf } from "@/server/pdf/documento-cabecalho";

describe("cabecalho de documentos PDF", () => {
  it("mantem precedencia da configuracao especifica sobre dados da empresa", () => {
    const merged = mergeEmpresaComCabecalho(
      {
        nome: "Empresa Padrao",
        nomeFantasia: "Fantasia Padrao",
        razaoSocial: "Razao Padrao",
        cnpj: "00.000.000/0001-00",
        endereco: "Endereco empresa",
        cidade: "Cidade",
        estado: "SC",
        cep: "00000-000",
        telefone: "telefone empresa",
        email: "empresa@example.com"
      },
      {
        nomeEmpresa: "Nome documento",
        telefone: "telefone documento",
        email: "documento@example.com"
      }
    );

    expect(merged?.nome).toBe("Nome documento");
    expect(merged?.nomeFantasia).toBe("Nome documento");
    expect(merged?.telefone).toBe("telefone documento");
    expect(merged?.email).toBe("documento@example.com");
    expect(merged?.endereco).toBe("Endereco empresa");
  });

  it("busca apenas configuracao do tipo necessario e possivel logo global", async () => {
    const calls: unknown[] = [];
    const db = {
      empresa: {
        findUnique: async (args: unknown) => {
          calls.push({ model: "empresa", args });
          return {
            nome: "Empresa",
            nomeFantasia: "Empresa",
            razaoSocial: "Empresa LTDA",
            cnpj: "00.000.000/0001-00",
            endereco: "Rua",
            cidade: "Cidade",
            estado: "SC",
            cep: "00000-000",
            telefone: "telefone",
            email: "empresa@example.com",
            logoUrl: "/logo-empresa.png"
          };
        }
      },
      documentoCabecalhoConfig: {
        findMany: async (args: unknown) => {
          calls.push({ model: "documentoCabecalhoConfig", args });
          return [
            {
              tipo: "RELATORIO",
              nomeEmpresa: "Relatorio",
              cnpj: null,
              endereco: null,
              cidade: null,
              estado: null,
              cep: null,
              telefone: null,
              email: null,
              logoUrl: "/logo-relatorio.png",
              usarLogoGlobal: false
            },
            {
              tipo: "ORCAMENTO",
              nomeEmpresa: null,
              cnpj: null,
              endereco: null,
              cidade: null,
              estado: null,
              cep: null,
              telefone: null,
              email: null,
              logoUrl: "/logo-global.png",
              usarLogoGlobal: true
            }
          ];
        }
      }
    };

    const cabecalho = await resolveDocumentoCabecalhoPdf(db as never, "empresa-1", "RELATORIO");
    const configCall = calls.find((call) => (call as { model: string }).model === "documentoCabecalhoConfig") as {
      args: {
        where: {
          empresaId: string;
          OR: Array<Record<string, unknown>>;
        };
      };
    };

    expect(configCall.args.where).toEqual({
      empresaId: "empresa-1",
      OR: [{ tipo: "RELATORIO" }, { usarLogoGlobal: true }]
    });
    expect(cabecalho.empresaRelatorio.nome).toBe("Relatorio");
    expect(cabecalho.logoUrl).toBe("/logo-global.png");
  });
});
