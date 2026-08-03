import { mkdir, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";

const PUBLIC_UPLOAD_PREFIX = "/uploads/orcamentos/propostas";
const STORAGE_ROOT_SEGMENTS = ["uploads", "orcamentos", "propostas"] as const;
const LOCAL_STORAGE_DIR_ENV = "BASEPRO_OFFICIAL_PROPOSAL_PDF_STORAGE_DIR";
const LOCAL_STORAGE_ENABLED_ENV = "BASEPRO_OFFICIAL_PROPOSAL_PDF_LOCAL_ENABLED";

export type StoredOfficialPdf = {
  reference: string;
  publicUrl: string;
  sizeBytes: number;
};

export type OfficialProposalPdfStorageSaveInput = {
  empresaId: string;
  orcamentoId: string;
  propostaId: string;
  fileName: string;
  buffer: Buffer;
};

export interface OfficialProposalPdfStorage {
  save(input: OfficialProposalPdfStorageSaveInput): Promise<StoredOfficialPdf>;
  read(reference: string): Promise<Buffer | null>;
  exists(reference: string): Promise<boolean>;
}

export class OfficialProposalPdfStorageUnavailableError extends Error {
  constructor(message = "Storage persistente de PDF oficial nao configurado.") {
    super(message);
    this.name = "OfficialProposalPdfStorageUnavailableError";
  }
}

function safeSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function isTruthyEnv(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

function isRunningOnVercel() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

function shouldUseLocalStorage() {
  if (process.env[LOCAL_STORAGE_DIR_ENV]) {
    return true;
  }

  if (process.env[LOCAL_STORAGE_ENABLED_ENV] !== undefined) {
    return isTruthyEnv(process.env[LOCAL_STORAGE_ENABLED_ENV]);
  }

  return !isRunningOnVercel();
}

function getBaseDirectory() {
  const configured = process.env[LOCAL_STORAGE_DIR_ENV];
  if (configured) {
    return path.resolve(configured);
  }

  return path.resolve(process.cwd(), "public", ...STORAGE_ROOT_SEGMENTS);
}

function buildReference(input: Omit<OfficialProposalPdfStorageSaveInput, "buffer">) {
  const relativeSegments = [
    safeSegment(input.empresaId, "empresa"),
    safeSegment(input.orcamentoId, "orcamento"),
    safeSegment(input.propostaId, "proposta"),
    safeSegment(input.fileName, "proposta.pdf")
  ];

  return `${PUBLIC_UPLOAD_PREFIX}/${relativeSegments.join("/")}`;
}

function resolveReference(reference: string) {
  if (!reference.startsWith(`${PUBLIC_UPLOAD_PREFIX}/`)) {
    return null;
  }

  const baseDirectory = getBaseDirectory();
  const relativePart = reference.slice(PUBLIC_UPLOAD_PREFIX.length + 1);
  const relativeSegments = relativePart.split("/").map((segment) => safeSegment(segment, "segmento"));
  const absolutePath = path.resolve(baseDirectory, ...relativeSegments);

  if (absolutePath !== baseDirectory && !absolutePath.startsWith(`${baseDirectory}${path.sep}`)) {
    return null;
  }

  return {
    absolutePath,
    baseDirectory
  };
}

export function buildOfficialPropostaPdfLocation(input: {
  empresaId: string;
  orcamentoId: string;
  propostaId: string;
  fileName: string;
}) {
  const reference = buildReference(input);
  const resolved = resolveReference(reference);

  return {
    reference,
    publicUrl: reference,
    absolutePath: resolved?.absolutePath ?? null,
    baseDirectory: getBaseDirectory(),
    enabled: shouldUseLocalStorage()
  };
}

export class LocalOfficialProposalPdfStorage implements OfficialProposalPdfStorage {
  async save(input: OfficialProposalPdfStorageSaveInput): Promise<StoredOfficialPdf> {
    if (!shouldUseLocalStorage()) {
      throw new OfficialProposalPdfStorageUnavailableError();
    }

    const reference = buildReference(input);
    const resolved = resolveReference(reference);

    if (!resolved) {
      throw new Error("Referencia de PDF oficial invalida.");
    }

    await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
    const tempPath = `${resolved.absolutePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, input.buffer);
    await rename(tempPath, resolved.absolutePath);

    return {
      reference,
      publicUrl: reference,
      sizeBytes: input.buffer.length
    };
  }

  async read(reference: string): Promise<Buffer | null> {
    if (!shouldUseLocalStorage()) {
      return null;
    }

    const resolved = resolveReference(reference);
    if (!resolved) {
      return null;
    }

    try {
      return await readFile(resolved.absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async exists(reference: string): Promise<boolean> {
    if (!shouldUseLocalStorage()) {
      return false;
    }

    const resolved = resolveReference(reference);
    if (!resolved) {
      return false;
    }

    try {
      const info = await stat(resolved.absolutePath);
      return info.isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }

      throw error;
    }
  }
}

const localStorage = new LocalOfficialProposalPdfStorage();

export function getOfficialProposalPdfStorage(): OfficialProposalPdfStorage {
  return localStorage;
}

export async function persistOfficialPropostaPdf(input: OfficialProposalPdfStorageSaveInput) {
  return getOfficialProposalPdfStorage().save(input);
}

export async function readOfficialPropostaPdf(reference: string) {
  return getOfficialProposalPdfStorage().read(reference);
}
