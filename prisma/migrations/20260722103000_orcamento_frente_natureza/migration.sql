CREATE TYPE "NaturezaFrenteOrcamento" AS ENUM ('COMERCIAL', 'OPERACIONAL');

ALTER TABLE "OrcamentoFrente"
ADD COLUMN "natureza" "NaturezaFrenteOrcamento";

UPDATE "OrcamentoFrente" f
SET "natureza" = CASE
  WHEN o."tipo" = 'COMERCIAL' THEN 'COMERCIAL'::"NaturezaFrenteOrcamento"
  ELSE 'OPERACIONAL'::"NaturezaFrenteOrcamento"
END
FROM "Orcamento" o
WHERE o."id" = f."orcamentoId";

UPDATE "OrcamentoFrente"
SET "natureza" = 'OPERACIONAL'::"NaturezaFrenteOrcamento"
WHERE "natureza" IS NULL;

ALTER TABLE "OrcamentoFrente"
ALTER COLUMN "natureza" SET NOT NULL,
ALTER COLUMN "natureza" SET DEFAULT 'OPERACIONAL';

CREATE INDEX "OrcamentoFrente_natureza_idx" ON "OrcamentoFrente"("natureza");
