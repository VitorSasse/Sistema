-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "ativoParaMedicao" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "exigeMaterial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unidadeApontamento" TEXT;

-- CreateIndex
CREATE INDEX "Servico_codigo_idx" ON "Servico"("codigo");
