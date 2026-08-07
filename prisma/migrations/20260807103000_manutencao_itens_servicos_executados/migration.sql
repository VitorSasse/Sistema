-- CreateEnum
CREATE TYPE "TipoItemManutencaoExecutada" AS ENUM ('PECA', 'SERVICO');

-- CreateTable
CREATE TABLE "ItemManutencaoExecutada" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "manutencaoExecutadaId" TEXT NOT NULL,
    "tipo" "TipoItemManutencaoExecutada" NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(14,4),
    "unidade" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemManutencaoExecutada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemManutencaoExecutada_empresaId_idx" ON "ItemManutencaoExecutada"("empresaId");

-- CreateIndex
CREATE INDEX "ItemManutencaoExecutada_manutencaoExecutadaId_idx" ON "ItemManutencaoExecutada"("manutencaoExecutadaId");

-- CreateIndex
CREATE INDEX "ItemManutencaoExecutada_tipo_idx" ON "ItemManutencaoExecutada"("tipo");

-- AddForeignKey
ALTER TABLE "ItemManutencaoExecutada" ADD CONSTRAINT "ItemManutencaoExecutada_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemManutencaoExecutada" ADD CONSTRAINT "ItemManutencaoExecutada_manutencaoExecutadaId_fkey" FOREIGN KEY ("manutencaoExecutadaId") REFERENCES "ManutencaoExecutada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
