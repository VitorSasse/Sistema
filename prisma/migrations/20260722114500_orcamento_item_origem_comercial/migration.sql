CREATE TYPE "OrigemItemComercialOrcamento" AS ENUM ('SERVICE', 'RESOURCE', 'MANUAL');

ALTER TABLE "OrcamentoItem"
ADD COLUMN "origemItemComercial" "OrigemItemComercialOrcamento",
ADD COLUMN "descricaoManualComercial" TEXT;

UPDATE "OrcamentoItem"
SET "origemItemComercial" = CASE
  WHEN "tipoItem" <> 'RECURSO' AND "equipamentoId" IS NOT NULL THEN 'RESOURCE'::"OrigemItemComercialOrcamento"
  WHEN "tipoItem" <> 'RECURSO' AND "servicoId" IS NOT NULL THEN 'SERVICE'::"OrigemItemComercialOrcamento"
  WHEN "tipoItem" <> 'RECURSO' THEN 'MANUAL'::"OrigemItemComercialOrcamento"
  ELSE NULL
END,
"descricaoManualComercial" = CASE
  WHEN "tipoItem" <> 'RECURSO' AND "servicoId" IS NULL AND "equipamentoId" IS NULL THEN "descricao"
  ELSE NULL
END;

CREATE INDEX "OrcamentoItem_origemItemComercial_idx" ON "OrcamentoItem"("origemItemComercial");
