-- CreateEnum
CREATE TYPE "StatusAgendaProgramacao" AS ENUM ('PROGRAMADO', 'EM_EXECUCAO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "TurnoAgendaProgramacao" AS ENUM ('MANHA', 'TARDE', 'NOITE', 'INTEGRAL');

-- CreateTable
CREATE TABLE "AgendaProgramacao" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "obraId" TEXT,
    "local" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "turno" "TurnoAgendaProgramacao",
    "status" "StatusAgendaProgramacao" NOT NULL DEFAULT 'PROGRAMADO',
    "observacoes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaProgramacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaProgramacao_equipamentoId_dataInicio_dataFim_idx" ON "AgendaProgramacao"("equipamentoId", "dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "AgendaProgramacao_obraId_dataInicio_idx" ON "AgendaProgramacao"("obraId", "dataInicio");

-- CreateIndex
CREATE INDEX "AgendaProgramacao_status_dataInicio_idx" ON "AgendaProgramacao"("status", "dataInicio");

-- CreateIndex
CREATE INDEX "AgendaProgramacao_deletedAt_idx" ON "AgendaProgramacao"("deletedAt");

-- AddForeignKey
ALTER TABLE "AgendaProgramacao" ADD CONSTRAINT "AgendaProgramacao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaProgramacao" ADD CONSTRAINT "AgendaProgramacao_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
