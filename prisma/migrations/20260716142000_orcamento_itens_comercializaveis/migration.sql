CREATE TYPE "ModoPrecificacaoItemOrcamento" AS ENUM (
  'PRECO_DIRETO',
  'COMPOSICAO'
);

ALTER TYPE "TipoItemOrcamento" ADD VALUE IF NOT EXISTS 'LOCACAO';
ALTER TYPE "TipoItemOrcamento" ADD VALUE IF NOT EXISTS 'TRANSPORTE';
ALTER TYPE "TipoItemOrcamento" ADD VALUE IF NOT EXISTS 'SUBEMPREITADA';
ALTER TYPE "TipoItemOrcamento" ADD VALUE IF NOT EXISTS 'VERBA';

ALTER TABLE "OrcamentoItem"
ADD COLUMN "modoPrecificacao" "ModoPrecificacaoItemOrcamento" NOT NULL DEFAULT 'PRECO_DIRETO',
ADD COLUMN "precoCompra" DECIMAL(14, 4),
ADD COLUMN "markupPercentual" DECIMAL(7, 4),
ADD COLUMN "precoVendaSobrescrito" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fornecedorPreferencialId" TEXT,
ADD COLUMN "exibirNoPdf" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "observacaoComercial" TEXT;

CREATE INDEX "OrcamentoItem_fornecedorPreferencialId_idx"
ON "OrcamentoItem"("fornecedorPreferencialId");

ALTER TABLE "OrcamentoItem"
ADD CONSTRAINT "OrcamentoItem_fornecedorPreferencialId_fkey"
FOREIGN KEY ("fornecedorPreferencialId") REFERENCES "Fornecedor"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
