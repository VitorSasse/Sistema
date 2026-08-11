-- CreateEnum
CREATE TYPE "EstadoEncargosExecucao" AS ENUM ('SEM_ENCARGOS', 'COM_ENCARGOS', 'ENCARGOS_PENDENTES');

-- CreateEnum
CREATE TYPE "FormaCalculoEncargoExecucao" AS ENUM ('PERCENTUAL_SOBRE_RECEITA', 'VALOR_INFORMADO');

-- CreateEnum
CREATE TYPE "OrigemEncargoExecucao" AS ENUM ('MANUAL', 'OUTRO_MODULO');

-- AlterTable
ALTER TABLE "Execucao" ADD COLUMN "estadoEncargos" "EstadoEncargosExecucao" NOT NULL DEFAULT 'SEM_ENCARGOS';

-- CreateTable
CREATE TABLE "EncargoEconomicoExecucao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "formaCalculo" "FormaCalculoEncargoExecucao" NOT NULL,
    "percentual" DECIMAL(10,4),
    "valorInformado" DECIMAL(14,2),
    "observacao" TEXT,
    "origem" "OrigemEncargoExecucao" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncargoEconomicoExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Execucao_estadoEncargos_idx" ON "Execucao"("estadoEncargos");

-- CreateIndex
CREATE INDEX "EncargoEconomicoExecucao_empresaId_idx" ON "EncargoEconomicoExecucao"("empresaId");

-- CreateIndex
CREATE INDEX "EncargoEconomicoExecucao_execucaoId_idx" ON "EncargoEconomicoExecucao"("execucaoId");

-- CreateIndex
CREATE INDEX "EncargoEconomicoExecucao_origem_idx" ON "EncargoEconomicoExecucao"("origem");

-- AddForeignKey
ALTER TABLE "EncargoEconomicoExecucao" ADD CONSTRAINT "EncargoEconomicoExecucao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncargoEconomicoExecucao" ADD CONSTRAINT "EncargoEconomicoExecucao_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
