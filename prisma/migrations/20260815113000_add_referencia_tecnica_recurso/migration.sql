-- CreateTable
CREATE TABLE "ReferenciaTecnicaRecurso" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenciaTecnicaRecurso_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Equipamento" ADD COLUMN "referenciaTecnicaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReferenciaTecnicaRecurso_empresaId_nomeNormalizado_key" ON "ReferenciaTecnicaRecurso"("empresaId", "nomeNormalizado");

-- CreateIndex
CREATE INDEX "ReferenciaTecnicaRecurso_empresaId_ativo_idx" ON "ReferenciaTecnicaRecurso"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "ReferenciaTecnicaRecurso_nome_idx" ON "ReferenciaTecnicaRecurso"("nome");

-- CreateIndex
CREATE INDEX "Equipamento_referenciaTecnicaId_idx" ON "Equipamento"("referenciaTecnicaId");

-- Backfill references from non-empty legacy operational classes.
WITH classes AS (
    SELECT DISTINCT
        "empresaId",
        trim("classeOperacional") AS "nome",
        lower(regexp_replace(trim("classeOperacional"), '\s+', ' ', 'g')) AS "nomeNormalizado"
    FROM "Equipamento"
    WHERE trim(coalesce("classeOperacional", '')) <> ''
)
INSERT INTO "ReferenciaTecnicaRecurso" ("id", "empresaId", "nome", "nomeNormalizado", "ativo", "updatedAt")
SELECT gen_random_uuid()::text, "empresaId", "nome", "nomeNormalizado", true, CURRENT_TIMESTAMP
FROM classes
ON CONFLICT ("empresaId", "nomeNormalizado") DO NOTHING;

-- Associate equipments when their legacy class maps unambiguously to the generated reference.
UPDATE "Equipamento" AS equipamento
SET "referenciaTecnicaId" = referencia."id"
FROM "ReferenciaTecnicaRecurso" AS referencia
WHERE equipamento."empresaId" = referencia."empresaId"
  AND lower(regexp_replace(trim(equipamento."classeOperacional"), '\s+', ' ', 'g')) = referencia."nomeNormalizado"
  AND trim(coalesce(equipamento."classeOperacional", '')) <> '';

-- AddForeignKey
ALTER TABLE "ReferenciaTecnicaRecurso" ADD CONSTRAINT "ReferenciaTecnicaRecurso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_referenciaTecnicaId_fkey" FOREIGN KEY ("referenciaTecnicaId") REFERENCES "ReferenciaTecnicaRecurso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
