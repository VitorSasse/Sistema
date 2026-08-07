-- CreateEnum
CREATE TYPE "StatusBoletimDiarioProducao" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "OrigemFatoBoletimDiario" AS ENUM ('MANUAL', 'PRODUCAO', 'APONTAMENTO', 'TELEMETRIA', 'ABASTECIMENTO', 'OUTRO_MODULO');

-- CreateTable
CREATE TABLE "BoletimDiarioProducao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "dataBoletim" TIMESTAMP(3) NOT NULL,
    "status" "StatusBoletimDiarioProducao" NOT NULL DEFAULT 'ABERTO',
    "observacoes" TEXT,
    "fechadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoletimDiarioProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecursoBoletimDiario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "boletimId" TEXT NOT NULL,
    "frenteExecutadaId" TEXT NOT NULL,
    "recursoId" TEXT,
    "nomeSnapshot" TEXT NOT NULL,
    "quantidadeRealizada" DECIMAL(14,4) NOT NULL,
    "unidadeRealizada" TEXT NOT NULL,
    "quantidadeRecursos" DECIMAL(14,4),
    "origem" "OrigemFatoBoletimDiario" NOT NULL DEFAULT 'MANUAL',
    "snapshotTecnicoEconomico" JSONB NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecursoBoletimDiario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoletimDiarioProducao_execucaoId_dataBoletim_key" ON "BoletimDiarioProducao"("execucaoId", "dataBoletim");

-- CreateIndex
CREATE INDEX "BoletimDiarioProducao_empresaId_idx" ON "BoletimDiarioProducao"("empresaId");

-- CreateIndex
CREATE INDEX "BoletimDiarioProducao_execucaoId_status_idx" ON "BoletimDiarioProducao"("execucaoId", "status");

-- CreateIndex
CREATE INDEX "BoletimDiarioProducao_dataBoletim_idx" ON "BoletimDiarioProducao"("dataBoletim");

-- CreateIndex
CREATE INDEX "RecursoBoletimDiario_empresaId_idx" ON "RecursoBoletimDiario"("empresaId");

-- CreateIndex
CREATE INDEX "RecursoBoletimDiario_boletimId_idx" ON "RecursoBoletimDiario"("boletimId");

-- CreateIndex
CREATE INDEX "RecursoBoletimDiario_frenteExecutadaId_idx" ON "RecursoBoletimDiario"("frenteExecutadaId");

-- CreateIndex
CREATE INDEX "RecursoBoletimDiario_origem_idx" ON "RecursoBoletimDiario"("origem");

-- CreateIndex
CREATE INDEX "RecursoBoletimDiario_recursoId_idx" ON "RecursoBoletimDiario"("recursoId");

-- AddForeignKey
ALTER TABLE "BoletimDiarioProducao" ADD CONSTRAINT "BoletimDiarioProducao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoletimDiarioProducao" ADD CONSTRAINT "BoletimDiarioProducao_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoBoletimDiario" ADD CONSTRAINT "RecursoBoletimDiario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoBoletimDiario" ADD CONSTRAINT "RecursoBoletimDiario_boletimId_fkey" FOREIGN KEY ("boletimId") REFERENCES "BoletimDiarioProducao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoBoletimDiario" ADD CONSTRAINT "RecursoBoletimDiario_frenteExecutadaId_fkey" FOREIGN KEY ("frenteExecutadaId") REFERENCES "FrenteExecutada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoBoletimDiario" ADD CONSTRAINT "RecursoBoletimDiario_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
