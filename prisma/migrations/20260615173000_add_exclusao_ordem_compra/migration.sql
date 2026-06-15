-- AlterTable
ALTER TABLE "OrdemCompra"
ADD COLUMN "motivoExclusao" TEXT,
ADD COLUMN "excluidaEm" TIMESTAMP(3),
ADD COLUMN "excluidaPorNome" TEXT;
