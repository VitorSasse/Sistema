-- CreateEnum
CREATE TYPE "TipoOrcamento" AS ENUM ('COMERCIAL', 'OPERACIONAL');

-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM (
  'RASCUNHO',
  'EM_ELABORACAO',
  'EM_REVISAO',
  'PRONTO_PARA_PROPOSTA',
  'PROPOSTA_EMITIDA',
  'EM_NEGOCIACAO',
  'APROVADO',
  'REPROVADO',
  'ARQUIVADO'
);

-- CreateEnum
CREATE TYPE "TipoItemOrcamento" AS ENUM (
  'COMERCIAL',
  'SERVICO_PRINCIPAL',
  'SERVICO_AUXILIAR',
  'RECURSO',
  'MATERIAL',
  'OUTRO'
);

-- CreateEnum
CREATE TYPE "TipoPremissaOrcamento" AS ENUM ('PREMISSA', 'CONDICAO', 'EXCLUSAO', 'OBSERVACAO');

-- CreateTable
CREATE TABLE "Orcamento" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "tipo" "TipoOrcamento" NOT NULL DEFAULT 'COMERCIAL',
  "status" "StatusOrcamento" NOT NULL DEFAULT 'RASCUNHO',
  "clienteId" TEXT NOT NULL,
  "obraId" TEXT,
  "responsavelId" TEXT,
  "dataOrcamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validadeAte" TIMESTAMP(3),
  "titulo" TEXT,
  "objeto" TEXT,
  "observacaoInterna" TEXT,
  "observacaoCliente" TEXT,
  "valorSubtotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "valorDesconto" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "valorAcrescimo" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "valorTotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "criadoPorId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoFormacaoPreco" (
  "id" TEXT NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  "custoDireto" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "custoIndireto" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "impostosPercentual" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  "impostosValor" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "margemPercentual" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  "margemValor" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "precoSugerido" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "precoFinal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrcamentoFormacaoPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoFrente" (
  "id" TEXT NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "metodoExecutivo" TEXT,
  "unidadeProducao" TEXT,
  "quantidadePrevista" DECIMAL(12, 2),
  "produtividadeDia" DECIMAL(12, 2),
  "prazoEstimadoDias" INTEGER,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrcamentoFrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoItem" (
  "id" TEXT NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  "frenteId" TEXT,
  "tipoItem" "TipoItemOrcamento" NOT NULL DEFAULT 'COMERCIAL',
  "servicoId" TEXT,
  "materialId" TEXT,
  "equipamentoId" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "codigo" TEXT,
  "descricao" TEXT NOT NULL,
  "unidade" TEXT NOT NULL,
  "quantidade" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "produtividade" DECIMAL(12, 2),
  "custoUnitario" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "valorUnitario" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "valorTotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "observacao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrcamentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoPremissa" (
  "id" TEXT NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  "tipo" "TipoPremissaOrcamento" NOT NULL DEFAULT 'PREMISSA',
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "titulo" TEXT,
  "descricao" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrcamentoPremissa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Orcamento_codigo_key" ON "Orcamento"("codigo");

-- CreateIndex
CREATE INDEX "Orcamento_clienteId_obraId_dataOrcamento_idx" ON "Orcamento"("clienteId", "obraId", "dataOrcamento");

-- CreateIndex
CREATE INDEX "Orcamento_status_dataOrcamento_idx" ON "Orcamento"("status", "dataOrcamento");

-- CreateIndex
CREATE INDEX "Orcamento_tipo_status_idx" ON "Orcamento"("tipo", "status");

-- CreateIndex
CREATE INDEX "Orcamento_deletedAt_status_idx" ON "Orcamento"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "Orcamento_responsavelId_dataOrcamento_idx" ON "Orcamento"("responsavelId", "dataOrcamento");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoFormacaoPreco_orcamentoId_key" ON "OrcamentoFormacaoPreco"("orcamentoId");

-- CreateIndex
CREATE INDEX "OrcamentoFrente_orcamentoId_ordem_idx" ON "OrcamentoFrente"("orcamentoId", "ordem");

-- CreateIndex
CREATE INDEX "OrcamentoItem_orcamentoId_ordem_idx" ON "OrcamentoItem"("orcamentoId", "ordem");

-- CreateIndex
CREATE INDEX "OrcamentoItem_frenteId_ordem_idx" ON "OrcamentoItem"("frenteId", "ordem");

-- CreateIndex
CREATE INDEX "OrcamentoItem_servicoId_idx" ON "OrcamentoItem"("servicoId");

-- CreateIndex
CREATE INDEX "OrcamentoItem_materialId_idx" ON "OrcamentoItem"("materialId");

-- CreateIndex
CREATE INDEX "OrcamentoItem_equipamentoId_idx" ON "OrcamentoItem"("equipamentoId");

-- CreateIndex
CREATE INDEX "OrcamentoPremissa_orcamentoId_tipo_ordem_idx" ON "OrcamentoPremissa"("orcamentoId", "tipo", "ordem");

-- AddForeignKey
ALTER TABLE "Orcamento"
ADD CONSTRAINT "Orcamento_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento"
ADD CONSTRAINT "Orcamento_obraId_fkey"
FOREIGN KEY ("obraId") REFERENCES "Obra"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento"
ADD CONSTRAINT "Orcamento_responsavelId_fkey"
FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento"
ADD CONSTRAINT "Orcamento_criadoPorId_fkey"
FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoFormacaoPreco"
ADD CONSTRAINT "OrcamentoFormacaoPreco_orcamentoId_fkey"
FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoFrente"
ADD CONSTRAINT "OrcamentoFrente_orcamentoId_fkey"
FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem"
ADD CONSTRAINT "OrcamentoItem_orcamentoId_fkey"
FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem"
ADD CONSTRAINT "OrcamentoItem_frenteId_fkey"
FOREIGN KEY ("frenteId") REFERENCES "OrcamentoFrente"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem"
ADD CONSTRAINT "OrcamentoItem_servicoId_fkey"
FOREIGN KEY ("servicoId") REFERENCES "Servico"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem"
ADD CONSTRAINT "OrcamentoItem_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem"
ADD CONSTRAINT "OrcamentoItem_equipamentoId_fkey"
FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoPremissa"
ADD CONSTRAINT "OrcamentoPremissa_orcamentoId_fkey"
FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
