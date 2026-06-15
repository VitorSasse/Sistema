-- CreateEnum
CREATE TYPE "TipoCatalogoCompra" AS ENUM ('PRODUTO', 'SERVICO');

-- AlterTable
ALTER TABLE "OrdemCompra"
ADD COLUMN "centroCustoId" TEXT,
ADD COLUMN "tipoCompra" "TipoCatalogoCompra" NOT NULL DEFAULT 'PRODUTO';

-- AlterTable
ALTER TABLE "OrdemCompraItem"
ADD COLUMN "catalogoCompraId" TEXT,
ADD COLUMN "tipoItem" "TipoCatalogoCompra" NOT NULL DEFAULT 'PRODUTO';

-- CreateTable
CREATE TABLE "CentroCustoCompra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentroCustoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoCompra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCatalogoCompra" NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidadePadrao" TEXT NOT NULL,
    "observacao" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentroCustoCompra_codigo_key" ON "CentroCustoCompra"("codigo");

-- CreateIndex
CREATE INDEX "CentroCustoCompra_nome_idx" ON "CentroCustoCompra"("nome");

-- CreateIndex
CREATE INDEX "CentroCustoCompra_status_nome_idx" ON "CentroCustoCompra"("status", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoCompra_codigo_key" ON "CatalogoCompra"("codigo");

-- CreateIndex
CREATE INDEX "CatalogoCompra_tipo_status_descricao_idx" ON "CatalogoCompra"("tipo", "status", "descricao");

-- CreateIndex
CREATE INDEX "CatalogoCompra_descricao_idx" ON "CatalogoCompra"("descricao");

-- CreateIndex
CREATE INDEX "OrdemCompra_centroCustoId_dataEmissao_idx" ON "OrdemCompra"("centroCustoId", "dataEmissao");

-- CreateIndex
CREATE INDEX "OrdemCompraItem_catalogoCompraId_idx" ON "OrdemCompraItem"("catalogoCompraId");

-- AddForeignKey
ALTER TABLE "OrdemCompra"
ADD CONSTRAINT "OrdemCompra_centroCustoId_fkey"
FOREIGN KEY ("centroCustoId") REFERENCES "CentroCustoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompraItem"
ADD CONSTRAINT "OrdemCompraItem_catalogoCompraId_fkey"
FOREIGN KEY ("catalogoCompraId") REFERENCES "CatalogoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
