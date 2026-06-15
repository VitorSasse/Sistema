-- CreateEnum
CREATE TYPE "TipoPlanoConta" AS ENUM ('DESPESA', 'RECEITA');

-- CreateTable
CREATE TABLE "PlanoConta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPlanoConta" NOT NULL,
    "categoria" TEXT,
    "descricao" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoConta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanoConta_codigo_key" ON "PlanoConta"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoConta_classificacao_key" ON "PlanoConta"("classificacao");

-- CreateIndex
CREATE INDEX "PlanoConta_tipo_status_nome_idx" ON "PlanoConta"("tipo", "status", "nome");

-- CreateIndex
CREATE INDEX "PlanoConta_status_nome_idx" ON "PlanoConta"("status", "nome");

-- CreateIndex
CREATE INDEX "PlanoConta_classificacao_idx" ON "PlanoConta"("classificacao");
