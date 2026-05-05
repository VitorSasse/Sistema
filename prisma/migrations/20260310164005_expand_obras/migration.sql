-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "contratoNumero" TEXT,
ADD COLUMN     "dataFim" TIMESTAMP(3),
ADD COLUMN     "dataInicio" TIMESTAMP(3),
ADD COLUMN     "localidade" TEXT,
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "uf" TEXT;

-- CreateIndex
CREATE INDEX "Obra_nome_idx" ON "Obra"("nome");
