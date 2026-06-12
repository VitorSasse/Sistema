-- CreateEnum
CREATE TYPE "StatusOrdemCompra" AS ENUM ('ABERTA', 'AGUARDANDO_APROVACAO', 'APROVADA', 'COMPRADA', 'RECEBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoCentroCustoOrdemCompra" AS ENUM ('EQUIPAMENTO', 'SETOR');

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "inscricaoEstadual" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "enderecoLinha1" TEXT,
    "enderecoLinha2" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "observacao" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemCompra" (
    "id" TEXT NOT NULL,
    "numeroOrdem" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusOrdemCompra" NOT NULL DEFAULT 'ABERTA',
    "fornecedorId" TEXT NOT NULL,
    "centroCustoTipo" "TipoCentroCustoOrdemCompra" NOT NULL DEFAULT 'SETOR',
    "centroCustoNome" TEXT NOT NULL,
    "centroCustoEquipamentoId" TEXT,
    "formaPagamento" TEXT,
    "numeroParcelas" INTEGER NOT NULL DEFAULT 1,
    "primeiroVencimento" TIMESTAMP(3),
    "observacaoFinanceira" TEXT,
    "observacao" TEXT,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemCompraItem" (
    "id" TEXT NOT NULL,
    "ordemCompraId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "codigo" TEXT,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" DECIMAL(12,2) NOT NULL,
    "valorUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemCompraParcela" (
    "id" TEXT NOT NULL,
    "ordemCompraId" TEXT NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "valorParcela" DECIMAL(14,2) NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemCompraParcela_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_codigo_key" ON "Fornecedor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE INDEX "Fornecedor_razaoSocial_idx" ON "Fornecedor"("razaoSocial");

-- CreateIndex
CREATE INDEX "Fornecedor_nomeFantasia_idx" ON "Fornecedor"("nomeFantasia");

-- CreateIndex
CREATE INDEX "Fornecedor_status_razaoSocial_idx" ON "Fornecedor"("status", "razaoSocial");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemCompra_numeroOrdem_key" ON "OrdemCompra"("numeroOrdem");

-- CreateIndex
CREATE INDEX "OrdemCompra_status_dataEmissao_idx" ON "OrdemCompra"("status", "dataEmissao");

-- CreateIndex
CREATE INDEX "OrdemCompra_fornecedorId_dataEmissao_idx" ON "OrdemCompra"("fornecedorId", "dataEmissao");

-- CreateIndex
CREATE INDEX "OrdemCompra_centroCustoNome_dataEmissao_idx" ON "OrdemCompra"("centroCustoNome", "dataEmissao");

-- CreateIndex
CREATE INDEX "OrdemCompraItem_ordemCompraId_idx" ON "OrdemCompraItem"("ordemCompraId");

-- CreateIndex
CREATE INDEX "OrdemCompraParcela_dataVencimento_idx" ON "OrdemCompraParcela"("dataVencimento");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemCompraParcela_ordemCompraId_numeroParcela_key" ON "OrdemCompraParcela"("ordemCompraId", "numeroParcela");

-- AddForeignKey
ALTER TABLE "OrdemCompra" ADD CONSTRAINT "OrdemCompra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompra" ADD CONSTRAINT "OrdemCompra_centroCustoEquipamentoId_fkey" FOREIGN KEY ("centroCustoEquipamentoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompra" ADD CONSTRAINT "OrdemCompra_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompraItem" ADD CONSTRAINT "OrdemCompraItem_ordemCompraId_fkey" FOREIGN KEY ("ordemCompraId") REFERENCES "OrdemCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompraParcela" ADD CONSTRAINT "OrdemCompraParcela_ordemCompraId_fkey" FOREIGN KEY ("ordemCompraId") REFERENCES "OrdemCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
