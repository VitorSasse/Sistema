-- AlterTable
ALTER TABLE "RecursoBoletimDiario" ADD COLUMN "execucaoId" TEXT;
ALTER TABLE "RecursoBoletimDiario" ADD COLUMN "origemRegistroTipo" TEXT;
ALTER TABLE "RecursoBoletimDiario" ADD COLUMN "origemRegistroId" TEXT;
ALTER TABLE "RecursoBoletimDiario" ADD COLUMN "origemRegistroData" TIMESTAMP(3);
ALTER TABLE "RecursoBoletimDiario" ADD COLUMN "editavel" BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing manual boletim resources with the parent execution.
UPDATE "RecursoBoletimDiario" AS recurso
SET "execucaoId" = boletim."execucaoId"
FROM "BoletimDiarioProducao" AS boletim
WHERE recurso."boletimId" = boletim."id"
  AND recurso."execucaoId" IS NULL;

ALTER TABLE "RecursoBoletimDiario" ALTER COLUMN "execucaoId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "RecursoBoletimDiario_execucaoId_idx" ON "RecursoBoletimDiario"("execucaoId");
CREATE INDEX "RecursoBoletimDiario_origemRegistroTipo_origemRegistroId_idx" ON "RecursoBoletimDiario"("origemRegistroTipo", "origemRegistroId");
CREATE UNIQUE INDEX "RecursoBoletimDiario_execucaoId_origemRegistroTipo_origemRegistroId_key" ON "RecursoBoletimDiario"("execucaoId", "origemRegistroTipo", "origemRegistroId");

-- AddForeignKey
ALTER TABLE "RecursoBoletimDiario" ADD CONSTRAINT "RecursoBoletimDiario_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
