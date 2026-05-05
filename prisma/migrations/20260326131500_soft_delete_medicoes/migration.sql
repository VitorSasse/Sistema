ALTER TABLE "Medicao"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "MedicaoItem"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "MedicaoItem"
  DROP CONSTRAINT IF EXISTS "MedicaoItem_lancamentoId_key";

CREATE INDEX IF NOT EXISTS "Medicao_deletedAt_status_idx"
  ON "Medicao"("deletedAt", "status");

CREATE INDEX IF NOT EXISTS "MedicaoItem_lancamentoId_idx"
  ON "MedicaoItem"("lancamentoId");

CREATE INDEX IF NOT EXISTS "MedicaoItem_deletedAt_idx"
  ON "MedicaoItem"("deletedAt");
