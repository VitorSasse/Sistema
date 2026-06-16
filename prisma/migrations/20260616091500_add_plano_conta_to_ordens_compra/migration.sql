-- AlterTable
ALTER TABLE "OrdemCompra"
ADD COLUMN "planoContaId" TEXT;

-- CreateIndex
CREATE INDEX "OrdemCompra_planoContaId_dataEmissao_idx"
ON "OrdemCompra"("planoContaId", "dataEmissao");

-- AddForeignKey
ALTER TABLE "OrdemCompra"
ADD CONSTRAINT "OrdemCompra_planoContaId_fkey"
FOREIGN KEY ("planoContaId") REFERENCES "PlanoConta"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
