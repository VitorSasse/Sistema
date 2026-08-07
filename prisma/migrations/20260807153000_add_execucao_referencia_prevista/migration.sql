-- CreateEnum
CREATE TYPE "OrigemReferenciaPrevistaExecucao" AS ENUM ('ORCAMENTO', 'PROPOSTA', 'SNAPSHOT_OFICIAL');

-- CreateTable
CREATE TABLE "ExecucaoReferenciaPrevista" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "origem" "OrigemReferenciaPrevistaExecucao" NOT NULL,
    "orcamentoOrigemId" TEXT,
    "propostaOrigemId" TEXT,
    "cenarioOrigemId" TEXT,
    "referenciaPrevistaJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecucaoReferenciaPrevista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecucaoReferenciaPrevista_execucaoId_key" ON "ExecucaoReferenciaPrevista"("execucaoId");

-- CreateIndex
CREATE INDEX "ExecucaoReferenciaPrevista_empresaId_idx" ON "ExecucaoReferenciaPrevista"("empresaId");

-- CreateIndex
CREATE INDEX "ExecucaoReferenciaPrevista_orcamentoOrigemId_idx" ON "ExecucaoReferenciaPrevista"("orcamentoOrigemId");

-- CreateIndex
CREATE INDEX "ExecucaoReferenciaPrevista_propostaOrigemId_idx" ON "ExecucaoReferenciaPrevista"("propostaOrigemId");

-- CreateIndex
CREATE INDEX "ExecucaoReferenciaPrevista_cenarioOrigemId_idx" ON "ExecucaoReferenciaPrevista"("cenarioOrigemId");

-- AddForeignKey
ALTER TABLE "ExecucaoReferenciaPrevista" ADD CONSTRAINT "ExecucaoReferenciaPrevista_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecucaoReferenciaPrevista" ADD CONSTRAINT "ExecucaoReferenciaPrevista_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecucaoReferenciaPrevista" ADD CONSTRAINT "ExecucaoReferenciaPrevista_orcamentoOrigemId_fkey" FOREIGN KEY ("orcamentoOrigemId") REFERENCES "Orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecucaoReferenciaPrevista" ADD CONSTRAINT "ExecucaoReferenciaPrevista_propostaOrigemId_fkey" FOREIGN KEY ("propostaOrigemId") REFERENCES "OrcamentoPropostaComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecucaoReferenciaPrevista" ADD CONSTRAINT "ExecucaoReferenciaPrevista_cenarioOrigemId_fkey" FOREIGN KEY ("cenarioOrigemId") REFERENCES "OrcamentoCenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
