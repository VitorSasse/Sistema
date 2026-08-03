import { mkdir, mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildOfficialPropostaPdfLocation,
  LocalOfficialProposalPdfStorage,
  OfficialProposalPdfStorageUnavailableError
} from "@/server/pdf/orcamento-proposta-official-storage";

const STORAGE_DIR_ENV = "BASEPRO_OFFICIAL_PROPOSAL_PDF_STORAGE_DIR";
const STORAGE_ENABLED_ENV = "BASEPRO_OFFICIAL_PROPOSAL_PDF_LOCAL_ENABLED";

let tempDir: string;
let originalStorageDir: string | undefined;
let originalStorageEnabled: string | undefined;
let originalVercel: string | undefined;
let originalVercelEnv: string | undefined;

function restoreEnvValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function restoreEnv() {
  restoreEnvValue(STORAGE_DIR_ENV, originalStorageDir);
  restoreEnvValue(STORAGE_ENABLED_ENV, originalStorageEnabled);
  restoreEnvValue("VERCEL", originalVercel);
  restoreEnvValue("VERCEL_ENV", originalVercelEnv);
}

beforeEach(async () => {
  originalStorageDir = process.env[STORAGE_DIR_ENV];
  originalStorageEnabled = process.env[STORAGE_ENABLED_ENV];
  originalVercel = process.env.VERCEL;
  originalVercelEnv = process.env.VERCEL_ENV;
  tempDir = await mkdtemp(path.join(os.tmpdir(), "basepro-proposta-storage-"));
  process.env[STORAGE_DIR_ENV] = tempDir;
  delete process.env[STORAGE_ENABLED_ENV];
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
});

afterEach(async () => {
  restoreEnv();
  await rm(tempDir, { recursive: true, force: true });
});

describe("armazenamento do PDF oficial da proposta", () => {
  it("gera referencia relativa e caminho local dentro do diretorio permitido", () => {
    const location = buildOfficialPropostaPdfLocation({
      empresaId: "empresa/../teste",
      orcamentoId: "orc:001",
      propostaId: "prop*001",
      fileName: "ORC-001_PROP-001_REV-00_CLIENTE.pdf"
    });

    expect(location.reference).toMatch(/^\/uploads\/orcamentos\/propostas\//);
    expect(location.publicUrl).toBe(location.reference);
    expect(location.reference).not.toContain("..");
    expect(location.reference).not.toContain(":");
    expect(location.absolutePath).toContain(tempDir);
    expect(location.reference).not.toContain(tempDir);
  });

  it("cria diretorios, persiste e recupera o PDF oficial pelo storage local", async () => {
    const storage = new LocalOfficialProposalPdfStorage();
    const buffer = Buffer.from("%PDF-1.4 teste", "utf8");
    const persisted = await storage.save({
      empresaId: "empresa-test",
      orcamentoId: "orcamento-test",
      propostaId: "proposta-test",
      fileName: "proposta-teste.pdf",
      buffer
    });

    const exists = await storage.exists(persisted.reference);
    const restored = await storage.read(persisted.reference);

    expect(persisted.sizeBytes).toBe(buffer.length);
    expect(persisted.reference).toBe("/uploads/orcamentos/propostas/empresa-test/orcamento-test/proposta-test/proposta-teste.pdf");
    expect(exists).toBe(true);
    expect(restored?.toString("utf8")).toBe(buffer.toString("utf8"));
  });

  it("retorna null para arquivo inexistente sem disparar renderizacao no storage", async () => {
    const storage = new LocalOfficialProposalPdfStorage();

    await expect(storage.read("/uploads/orcamentos/propostas/empresa/orcamento/proposta/inexistente.pdf")).resolves.toBeNull();
    await expect(storage.exists("/uploads/orcamentos/propostas/empresa/orcamento/proposta/inexistente.pdf")).resolves.toBe(false);
  });

  it("bloqueia referencias fora do escopo seguro e tentativas de path traversal", async () => {
    const storage = new LocalOfficialProposalPdfStorage();

    await expect(storage.read("/uploads/medicoes/MED-001/teste.pdf")).resolves.toBeNull();
    await expect(storage.read("/api/orcamentos/1/propostas/2/pdf/oficial")).resolves.toBeNull();
    await expect(storage.exists("/uploads/orcamentos/propostas/empresa/../../segredo.pdf")).resolves.toBe(false);
  });

  it("isola arquivos por empresa na referencia persistida", async () => {
    const storage = new LocalOfficialProposalPdfStorage();
    const buffer = Buffer.from("empresa-a", "utf8");
    const persisted = await storage.save({
      empresaId: "empresa-a",
      orcamentoId: "orcamento",
      propostaId: "proposta",
      fileName: "proposta.pdf",
      buffer
    });
    const outraEmpresaReference = persisted.reference.replace("/empresa-a/", "/empresa-b/");

    await expect(storage.read(persisted.reference)).resolves.toEqual(buffer);
    await expect(storage.read(outraEmpresaReference)).resolves.toBeNull();
  });

  it("nao usa filesystem local na Vercel sem storage persistente configurado", async () => {
    const storage = new LocalOfficialProposalPdfStorage();
    delete process.env[STORAGE_DIR_ENV];
    process.env.VERCEL = "1";

    await expect(storage.save({
      empresaId: "empresa",
      orcamentoId: "orcamento",
      propostaId: "proposta",
      fileName: "proposta.pdf",
      buffer: Buffer.from("pdf")
    })).rejects.toBeInstanceOf(OfficialProposalPdfStorageUnavailableError);
    await expect(storage.read("/uploads/orcamentos/propostas/empresa/orcamento/proposta/proposta.pdf")).resolves.toBeNull();
  });

  it("mantem storage local habilitado na Vercel quando um diretorio persistente e configurado", async () => {
    const storage = new LocalOfficialProposalPdfStorage();
    process.env.VERCEL = "1";
    process.env[STORAGE_DIR_ENV] = tempDir;
    const buffer = Buffer.from("pdf persistente", "utf8");

    const persisted = await storage.save({
      empresaId: "empresa",
      orcamentoId: "orcamento",
      propostaId: "proposta",
      fileName: "proposta.pdf",
      buffer
    });

    await expect(storage.read(persisted.reference)).resolves.toEqual(buffer);
  });

  it("propaga erro de leitura diferente de arquivo inexistente", async () => {
    const storage = new LocalOfficialProposalPdfStorage();
    const location = buildOfficialPropostaPdfLocation({
      empresaId: "empresa",
      orcamentoId: "orcamento",
      propostaId: "proposta",
      fileName: "diretorio.pdf"
    });

    await mkdir(location.absolutePath ?? "", { recursive: true });
    await expect(storage.read(location.reference)).rejects.toBeTruthy();
  });
});
