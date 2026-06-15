-- AlterTable
ALTER TABLE "Anexo"
ADD COLUMN "ordemCompraId" TEXT;

-- CreateIndex
CREATE INDEX "Anexo_ordemCompraId_idx" ON "Anexo"("ordemCompraId");

-- AddForeignKey
ALTER TABLE "Anexo"
ADD CONSTRAINT "Anexo_ordemCompraId_fkey"
FOREIGN KEY ("ordemCompraId") REFERENCES "OrdemCompra"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
