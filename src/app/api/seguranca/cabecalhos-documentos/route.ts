import { TipoDocumentoCabecalho } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/empresa-context";
import { canAccessModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DOCUMENTO_CABECALHO_TIPOS, mergeEmpresaComCabecalho } from "@/server/pdf/documento-cabecalho";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i;

const nullableText = z
  .string()
  .trim()
  .max(255, "Use no maximo 255 caracteres.")
  .optional()
  .nullable()
  .transform((value) => value || null);

const nullableLongText = z
  .string()
  .trim()
  .max(3_000_000, "A logo enviada ultrapassa o tamanho permitido.")
  .optional()
  .nullable()
  .transform((value) => value || null);

const logoSchema = nullableLongText.superRefine((value, ctx) => {
  if (!value) {
    return;
  }

  if (!DATA_IMAGE_PATTERN.test(value) && !value.startsWith("/") && !value.startsWith("http://") && !value.startsWith("https://")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Envie uma imagem valida para a logo."
    });
    return;
  }

  if (value.startsWith("data:") && Buffer.byteLength(value, "utf8") > MAX_LOGO_BYTES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A logo deve ter no maximo 2 MB."
    });
  }
});

const cabecalhoSchema = z.object({
  tipo: z.nativeEnum(TipoDocumentoCabecalho),
  nomeEmpresa: nullableText,
  cnpj: nullableText,
  endereco: nullableText,
  cidade: nullableText,
  estado: nullableText,
  cep: nullableText,
  telefone: nullableText,
  email: nullableText,
  logoUrl: logoSchema
});

const payloadSchema = z.object({
  usarLogoGlobal: z.boolean().default(false),
  logoGlobalUrl: logoSchema,
  documentos: z.array(cabecalhoSchema).min(1)
});

async function requirePdfManage() {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Nao autenticado." }, { status: 401 })
    };
  }

  if (!canAccessModule(session.user, "pdfs", "manage")) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Sem permissao para configurar cabecalhos de documentos." }, { status: 403 })
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Nao autenticado." }, { status: 401 })
    };
  }

  const empresaId = user.isMaster ? user.empresaSelecionadaId : user.empresaId;

  if (!empresaId) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Selecione uma empresa antes de configurar os documentos." }, { status: 400 })
    };
  }

  return {
    ok: true as const,
    user,
    empresaId
  };
}

function normalizeConfig(
  tipo: TipoDocumentoCabecalho,
  label: string,
  empresa: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>["empresa"],
  config?: {
    tipo: TipoDocumentoCabecalho;
    nomeEmpresa: string | null;
    cnpj: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    telefone: string | null;
    email: string | null;
    logoUrl: string | null;
  } | null
) {
  const merged = mergeEmpresaComCabecalho(empresa, config);

  return {
    tipo,
    label,
    nomeEmpresa: merged?.nomeFantasia ?? merged?.nome ?? "",
    cnpj: merged?.cnpj ?? "",
    endereco: merged?.endereco ?? "",
    cidade: merged?.cidade ?? "",
    estado: merged?.estado ?? "",
    cep: merged?.cep ?? "",
    telefone: merged?.telefone ?? "",
    email: merged?.email ?? "",
    logoUrl: config?.logoUrl ?? empresa.logoUrl ?? ""
  };
}

export async function GET() {
  const access = await requirePdfManage();

  if (!access.ok) {
    return access.response;
  }

  const configs = await prisma.documentoCabecalhoConfig.findMany({
    where: { empresaId: access.empresaId }
  });

  const usarLogoGlobal = configs.some((item) => item.usarLogoGlobal);
  const logoGlobalUrl = configs.find((item) => item.usarLogoGlobal && item.logoUrl)?.logoUrl ?? "";

  return NextResponse.json({
    usarLogoGlobal,
    logoGlobalUrl,
    documentos: DOCUMENTO_CABECALHO_TIPOS.map(({ tipo, label }) =>
      normalizeConfig(
        tipo,
        label,
        access.user.empresa,
        configs.find((item) => item.tipo === tipo)
      )
    )
  });
}

export async function PUT(request: NextRequest) {
  const access = await requirePdfManage();

  if (!access.ok) {
    return access.response;
  }

  const parsed = payloadSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Dados invalidos.",
        errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const documentos = new Map(payload.documentos.map((item) => [item.tipo, item]));
  const sharedLogo = payload.usarLogoGlobal
    ? payload.logoGlobalUrl || payload.documentos.find((item) => item.logoUrl)?.logoUrl || null
    : null;

  await prisma.$transaction(
    DOCUMENTO_CABECALHO_TIPOS.map(({ tipo }) => {
      const documento = documentos.get(tipo);

      if (!documento) {
        throw new Error(`Configuracao ausente para ${tipo}.`);
      }

      return prisma.documentoCabecalhoConfig.upsert({
        where: {
          empresaId_tipo: {
            empresaId: access.empresaId,
            tipo
          }
        },
        create: {
          empresaId: access.empresaId,
          tipo,
          nomeEmpresa: documento.nomeEmpresa,
          cnpj: documento.cnpj,
          endereco: documento.endereco,
          cidade: documento.cidade,
          estado: documento.estado,
          cep: documento.cep,
          telefone: documento.telefone,
          email: documento.email,
          logoUrl: payload.usarLogoGlobal ? sharedLogo : documento.logoUrl,
          usarLogoGlobal: payload.usarLogoGlobal
        },
        update: {
          nomeEmpresa: documento.nomeEmpresa,
          cnpj: documento.cnpj,
          endereco: documento.endereco,
          cidade: documento.cidade,
          estado: documento.estado,
          cep: documento.cep,
          telefone: documento.telefone,
          email: documento.email,
          logoUrl: payload.usarLogoGlobal ? sharedLogo : documento.logoUrl,
          usarLogoGlobal: payload.usarLogoGlobal
        }
      });
    })
  );

  return NextResponse.json({ message: "Cabecalhos atualizados com sucesso." });
}
