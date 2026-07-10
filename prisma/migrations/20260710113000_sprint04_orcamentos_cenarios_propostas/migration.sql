DO $$
BEGIN
  CREATE TYPE "StatusCenarioOrcamento" AS ENUM ('EM_ESTUDO', 'ACEITO', 'REJEITADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "StatusPropostaComercial" AS ENUM ('RASCUNHO', 'EMITIDA', 'ACEITA', 'REJEITADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrcamentoCenario" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  "orcamentoId" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "metodoExecutivo" TEXT,
  "observacao" TEXT,
  "isPadrao" BOOLEAN NOT NULL DEFAULT false,
  "status" "StatusCenarioOrcamento" NOT NULL DEFAULT 'EM_ESTUDO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrcamentoCenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrcamentoPropostaComercial" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  "orcamentoId" TEXT NOT NULL,
  "cenarioId" TEXT,
  "codigo" TEXT NOT NULL,
  "revisao" INTEGER NOT NULL DEFAULT 0,
  "titulo" TEXT,
  "status" "StatusPropostaComercial" NOT NULL DEFAULT 'RASCUNHO',
  "condicoesComerciais" TEXT,
  "observacao" TEXT,
  "valorSubtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "valorDesconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "valorAcrescimo" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "valorTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "snapshotJson" JSONB,
  "emitidaEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrcamentoPropostaComercial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrcamentoPropostaOpcional" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  "propostaId" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "codigo" TEXT,
  "descricao" TEXT NOT NULL,
  "unidade" TEXT NOT NULL,
  "quantidade" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "valorUnitario" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "valorTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "condicoes" TEXT,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrcamentoPropostaOpcional_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrcamentoFrente"
ADD COLUMN IF NOT EXISTS "cenarioId" TEXT;

ALTER TABLE "OrcamentoPremissa"
ADD COLUMN IF NOT EXISTS "cenarioId" TEXT;

CREATE INDEX IF NOT EXISTS "OrcamentoCenario_empresaId_idx" ON "OrcamentoCenario"("empresaId");
CREATE INDEX IF NOT EXISTS "OrcamentoCenario_orcamentoId_ordem_idx" ON "OrcamentoCenario"("orcamentoId", "ordem");
CREATE INDEX IF NOT EXISTS "OrcamentoCenario_orcamentoId_status_idx" ON "OrcamentoCenario"("orcamentoId", "status");
CREATE INDEX IF NOT EXISTS "OrcamentoFrente_cenarioId_ordem_idx" ON "OrcamentoFrente"("cenarioId", "ordem");
CREATE INDEX IF NOT EXISTS "OrcamentoPremissa_cenarioId_tipo_ordem_idx" ON "OrcamentoPremissa"("cenarioId", "tipo", "ordem");
CREATE INDEX IF NOT EXISTS "OrcamentoPropostaComercial_empresaId_idx" ON "OrcamentoPropostaComercial"("empresaId");
CREATE INDEX IF NOT EXISTS "OrcamentoPropostaComercial_orcamentoId_revisao_idx" ON "OrcamentoPropostaComercial"("orcamentoId", "revisao");
CREATE INDEX IF NOT EXISTS "OrcamentoPropostaComercial_cenarioId_status_idx" ON "OrcamentoPropostaComercial"("cenarioId", "status");
CREATE INDEX IF NOT EXISTS "OrcamentoPropostaComercial_status_idx" ON "OrcamentoPropostaComercial"("status");
CREATE INDEX IF NOT EXISTS "OrcamentoPropostaOpcional_empresaId_idx" ON "OrcamentoPropostaOpcional"("empresaId");
CREATE INDEX IF NOT EXISTS "OrcamentoPropostaOpcional_propostaId_ordem_idx" ON "OrcamentoPropostaOpcional"("propostaId", "ordem");

DO $$
BEGIN
  ALTER TABLE "OrcamentoCenario" ADD CONSTRAINT "OrcamentoCenario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoCenario" ADD CONSTRAINT "OrcamentoCenario_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoFrente" ADD CONSTRAINT "OrcamentoFrente_cenarioId_fkey" FOREIGN KEY ("cenarioId") REFERENCES "OrcamentoCenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoPremissa" ADD CONSTRAINT "OrcamentoPremissa_cenarioId_fkey" FOREIGN KEY ("cenarioId") REFERENCES "OrcamentoCenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoPropostaComercial" ADD CONSTRAINT "OrcamentoPropostaComercial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoPropostaComercial" ADD CONSTRAINT "OrcamentoPropostaComercial_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoPropostaComercial" ADD CONSTRAINT "OrcamentoPropostaComercial_cenarioId_fkey" FOREIGN KEY ("cenarioId") REFERENCES "OrcamentoCenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoPropostaOpcional" ADD CONSTRAINT "OrcamentoPropostaOpcional_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrcamentoPropostaOpcional" ADD CONSTRAINT "OrcamentoPropostaOpcional_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "OrcamentoPropostaComercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "OrcamentoCenario" (
  "id",
  "empresaId",
  "orcamentoId",
  "ordem",
  "nome",
  "descricao",
  "isPadrao",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  o."empresaId",
  o."id",
  1,
  'Cenario principal',
  'Cenario principal criado automaticamente para preservar o fluxo rapido.',
  true,
  'EM_ESTUDO',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Orcamento" o
WHERE o."tipo" = 'OPERACIONAL'
  AND NOT EXISTS (
    SELECT 1 FROM "OrcamentoCenario" c WHERE c."orcamentoId" = o."id"
  );

UPDATE "OrcamentoFrente" f
SET "cenarioId" = c."id"
FROM "Orcamento" o
JOIN "OrcamentoCenario" c ON c."orcamentoId" = o."id" AND c."isPadrao" = true
WHERE f."orcamentoId" = o."id"
  AND o."tipo" = 'OPERACIONAL'
  AND f."cenarioId" IS NULL;

UPDATE "OrcamentoPremissa"
SET "cenarioId" = NULL
WHERE "cenarioId" IS NOT NULL;
