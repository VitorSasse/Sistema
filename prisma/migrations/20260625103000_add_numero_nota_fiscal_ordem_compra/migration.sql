ALTER TABLE "OrdemCompra"
ADD COLUMN "numeroNotaFiscal" TEXT;

CREATE INDEX "OrdemCompra_numeroNotaFiscal_idx" ON "OrdemCompra"("numeroNotaFiscal");
