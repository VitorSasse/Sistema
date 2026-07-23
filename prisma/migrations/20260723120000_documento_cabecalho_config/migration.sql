-- CreateEnum
CREATE TYPE "TipoDocumentoCabecalho" AS ENUM ('ORCAMENTO', 'ORDEM_COMPRA', 'MEDICAO', 'RELATORIO');

-- CreateTable
CREATE TABLE "DocumentoCabecalhoConfig" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoDocumentoCabecalho" NOT NULL,
    "nomeEmpresa" TEXT,
    "cnpj" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "usarLogoGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoCabecalhoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoCabecalhoConfig_empresaId_idx" ON "DocumentoCabecalhoConfig"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCabecalhoConfig_empresaId_tipo_key" ON "DocumentoCabecalhoConfig"("empresaId", "tipo");

-- AddForeignKey
ALTER TABLE "DocumentoCabecalhoConfig" ADD CONSTRAINT "DocumentoCabecalhoConfig_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
