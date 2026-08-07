-- CreateEnum
CREATE TYPE "OrigemExecucao" AS ENUM ('DIRETA', 'ORCAMENTO');

-- CreateEnum
CREATE TYPE "StatusExecucao" AS ENUM ('RASCUNHO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Execucao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "obraId" TEXT,
    "descricao" TEXT NOT NULL,
    "origem" "OrigemExecucao" NOT NULL DEFAULT 'DIRETA',
    "status" "StatusExecucao" NOT NULL DEFAULT 'RASCUNHO',
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "observacoes" TEXT,
    "orcamentoOrigemId" TEXT,
    "propostaOrigemId" TEXT,
    "cenarioOrigemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Execucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrenteExecutada" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidade" TEXT NOT NULL,
    "quantidadeExecutada" DECIMAL(14,4) NOT NULL,
    "receitaRealizada" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrenteExecutada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecursoRealizado" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "frenteExecutadaId" TEXT NOT NULL,
    "recursoId" TEXT,
    "nomeSnapshot" TEXT NOT NULL,
    "quantidadeRealizada" DECIMAL(14,4) NOT NULL,
    "unidadeRealizada" TEXT NOT NULL,
    "quantidadeRecursos" DECIMAL(14,4),
    "snapshotTecnicoEconomico" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecursoRealizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoExecucao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "resultadoOperacionalJson" JSONB NOT NULL,
    "economiaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultadoExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Execucao_empresaId_idx" ON "Execucao"("empresaId");

-- CreateIndex
CREATE INDEX "Execucao_clienteId_obraId_idx" ON "Execucao"("clienteId", "obraId");

-- CreateIndex
CREATE INDEX "Execucao_status_createdAt_idx" ON "Execucao"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Execucao_orcamentoOrigemId_idx" ON "Execucao"("orcamentoOrigemId");

-- CreateIndex
CREATE INDEX "Execucao_propostaOrigemId_idx" ON "Execucao"("propostaOrigemId");

-- CreateIndex
CREATE INDEX "Execucao_cenarioOrigemId_idx" ON "Execucao"("cenarioOrigemId");

-- CreateIndex
CREATE INDEX "FrenteExecutada_empresaId_idx" ON "FrenteExecutada"("empresaId");

-- CreateIndex
CREATE INDEX "FrenteExecutada_execucaoId_idx" ON "FrenteExecutada"("execucaoId");

-- CreateIndex
CREATE INDEX "RecursoRealizado_empresaId_idx" ON "RecursoRealizado"("empresaId");

-- CreateIndex
CREATE INDEX "RecursoRealizado_frenteExecutadaId_idx" ON "RecursoRealizado"("frenteExecutadaId");

-- CreateIndex
CREATE INDEX "RecursoRealizado_recursoId_idx" ON "RecursoRealizado"("recursoId");

-- CreateIndex
CREATE INDEX "ResultadoExecucao_empresaId_idx" ON "ResultadoExecucao"("empresaId");

-- CreateIndex
CREATE INDEX "ResultadoExecucao_execucaoId_createdAt_idx" ON "ResultadoExecucao"("execucaoId", "createdAt");

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_orcamentoOrigemId_fkey" FOREIGN KEY ("orcamentoOrigemId") REFERENCES "Orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_propostaOrigemId_fkey" FOREIGN KEY ("propostaOrigemId") REFERENCES "OrcamentoPropostaComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_cenarioOrigemId_fkey" FOREIGN KEY ("cenarioOrigemId") REFERENCES "OrcamentoCenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrenteExecutada" ADD CONSTRAINT "FrenteExecutada_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrenteExecutada" ADD CONSTRAINT "FrenteExecutada_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoRealizado" ADD CONSTRAINT "RecursoRealizado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoRealizado" ADD CONSTRAINT "RecursoRealizado_frenteExecutadaId_fkey" FOREIGN KEY ("frenteExecutadaId") REFERENCES "FrenteExecutada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoRealizado" ADD CONSTRAINT "RecursoRealizado_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoExecucao" ADD CONSTRAINT "ResultadoExecucao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoExecucao" ADD CONSTRAINT "ResultadoExecucao_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
