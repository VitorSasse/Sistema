ALTER TABLE "OrcamentoPropostaComercial"
ADD COLUMN "emitidaPorId" TEXT,
ADD COLUMN "pdfOficialUrl" TEXT,
ADD COLUMN "pdfOficialNome" TEXT,
ADD COLUMN "pdfOficialHash" TEXT,
ADD COLUMN "pdfOficialMime" TEXT,
ADD COLUMN "pdfOficialTamanhoBytes" INTEGER;

CREATE INDEX "OrcamentoPropostaComercial_emitidaPorId_idx"
ON "OrcamentoPropostaComercial"("emitidaPorId");

ALTER TABLE "OrcamentoPropostaComercial"
ADD CONSTRAINT "OrcamentoPropostaComercial_emitidaPorId_fkey"
FOREIGN KEY ("emitidaPorId") REFERENCES "Usuario"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
