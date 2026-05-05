-- AlterTable
ALTER TABLE "Equipamento" ADD COLUMN     "anoFabricacao" INTEGER,
ADD COLUMN     "apelido" TEXT,
ADD COLUMN     "marcaModelo" TEXT,
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "unidadeCapacidade" TEXT;

-- CreateIndex
CREATE INDEX "Equipamento_descricao_idx" ON "Equipamento"("descricao");
