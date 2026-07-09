-- CreateEnum
CREATE TYPE "RoleUsuarioEmpresa" AS ENUM ('MASTER', 'ADMIN_EMPRESA', 'GERENTE', 'OPERADOR', 'FINANCEIRO', 'VISUALIZADOR');

-- AlterTable
ALTER TABLE "AgendaManutencao" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "AgendaProgramacao" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "AlertaManutencao" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Anexo" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "AnexoManutencao" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "CatalogoCompra" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "CentroCustoCompra" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Equipamento" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Ficha" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "FichaRomaneio" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Fornecedor" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "HistoricoAlteracao" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "LancamentoDiario" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "LancamentoRomaneio" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "LeituraEquipamento" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "LogAuditoria" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "ManutencaoExecutada" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Medicao" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "MedicaoItem" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "OrcamentoFormacaoPreco" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "OrcamentoFrente" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "OrcamentoItem" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "OrcamentoPremissa" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "OrdemCompra" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "OrdemCompraItem" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "OrdemCompraParcela" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "PlanoConta" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "PlanoManutencao" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "PrecoClienteObra" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
ADD COLUMN     "roleEmpresa" "RoleUsuarioEmpresa" NOT NULL DEFAULT 'ADMIN_EMPRESA';

-- Usuarios com perfil legado ADMIN passam a ser os administradores globais iniciais do SaaS.
UPDATE "Usuario"
SET "roleEmpresa" = 'MASTER'
WHERE "id" IN (
    SELECT "ur"."usuarioId"
    FROM "UsuarioRole" "ur"
    INNER JOIN "Role" "r" ON "r"."id" = "ur"."roleId"
    WHERE "r"."codigo" = 'ADMIN'
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "razaoSocial" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "logoUrl" TEXT,
    "corPrimaria" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "plano" TEXT DEFAULT 'PADRAO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- Empresa padrao para preservar todos os dados existentes na migracao inicial.
INSERT INTO "Empresa" (
    "id",
    "nome",
    "nomeFantasia",
    "razaoSocial",
    "telefone",
    "corPrimaria",
    "status",
    "plano",
    "createdAt",
    "updatedAt"
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'JMIX TERRAPLANAGEM',
    'JMIX',
    'JMIX TERRAPLANAGEM',
    '(47) 98803-1610',
    '#F97316',
    'ATIVO',
    'PADRAO',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE INDEX "Empresa_status_nome_idx" ON "Empresa"("status", "nome");

-- CreateIndex
CREATE INDEX "Empresa_deletedAt_idx" ON "Empresa"("deletedAt");

-- CreateIndex
CREATE INDEX "AgendaManutencao_empresaId_idx" ON "AgendaManutencao"("empresaId");

-- CreateIndex
CREATE INDEX "AgendaProgramacao_empresaId_idx" ON "AgendaProgramacao"("empresaId");

-- CreateIndex
CREATE INDEX "AlertaManutencao_empresaId_idx" ON "AlertaManutencao"("empresaId");

-- CreateIndex
CREATE INDEX "Anexo_empresaId_idx" ON "Anexo"("empresaId");

-- CreateIndex
CREATE INDEX "AnexoManutencao_empresaId_idx" ON "AnexoManutencao"("empresaId");

-- CreateIndex
CREATE INDEX "CatalogoCompra_empresaId_idx" ON "CatalogoCompra"("empresaId");

-- CreateIndex
CREATE INDEX "CentroCustoCompra_empresaId_idx" ON "CentroCustoCompra"("empresaId");

-- CreateIndex
CREATE INDEX "Cliente_empresaId_idx" ON "Cliente"("empresaId");

-- CreateIndex
CREATE INDEX "Colaborador_empresaId_idx" ON "Colaborador"("empresaId");

-- CreateIndex
CREATE INDEX "Equipamento_empresaId_idx" ON "Equipamento"("empresaId");

-- CreateIndex
CREATE INDEX "Ficha_empresaId_idx" ON "Ficha"("empresaId");

-- CreateIndex
CREATE INDEX "FichaRomaneio_empresaId_idx" ON "FichaRomaneio"("empresaId");

-- CreateIndex
CREATE INDEX "Fornecedor_empresaId_idx" ON "Fornecedor"("empresaId");

-- CreateIndex
CREATE INDEX "HistoricoAlteracao_empresaId_idx" ON "HistoricoAlteracao"("empresaId");

-- CreateIndex
CREATE INDEX "LancamentoDiario_empresaId_idx" ON "LancamentoDiario"("empresaId");

-- CreateIndex
CREATE INDEX "LancamentoRomaneio_empresaId_idx" ON "LancamentoRomaneio"("empresaId");

-- CreateIndex
CREATE INDEX "LeituraEquipamento_empresaId_idx" ON "LeituraEquipamento"("empresaId");

-- CreateIndex
CREATE INDEX "LogAuditoria_empresaId_idx" ON "LogAuditoria"("empresaId");

-- CreateIndex
CREATE INDEX "ManutencaoExecutada_empresaId_idx" ON "ManutencaoExecutada"("empresaId");

-- CreateIndex
CREATE INDEX "Material_empresaId_idx" ON "Material"("empresaId");

-- CreateIndex
CREATE INDEX "Medicao_empresaId_idx" ON "Medicao"("empresaId");

-- CreateIndex
CREATE INDEX "MedicaoItem_empresaId_idx" ON "MedicaoItem"("empresaId");

-- CreateIndex
CREATE INDEX "Obra_empresaId_idx" ON "Obra"("empresaId");

-- CreateIndex
CREATE INDEX "Orcamento_empresaId_idx" ON "Orcamento"("empresaId");

-- CreateIndex
CREATE INDEX "OrcamentoFormacaoPreco_empresaId_idx" ON "OrcamentoFormacaoPreco"("empresaId");

-- CreateIndex
CREATE INDEX "OrcamentoFrente_empresaId_idx" ON "OrcamentoFrente"("empresaId");

-- CreateIndex
CREATE INDEX "OrcamentoItem_empresaId_idx" ON "OrcamentoItem"("empresaId");

-- CreateIndex
CREATE INDEX "OrcamentoPremissa_empresaId_idx" ON "OrcamentoPremissa"("empresaId");

-- CreateIndex
CREATE INDEX "OrdemCompra_empresaId_idx" ON "OrdemCompra"("empresaId");

-- CreateIndex
CREATE INDEX "OrdemCompraItem_empresaId_idx" ON "OrdemCompraItem"("empresaId");

-- CreateIndex
CREATE INDEX "OrdemCompraParcela_empresaId_idx" ON "OrdemCompraParcela"("empresaId");

-- CreateIndex
CREATE INDEX "PlanoConta_empresaId_idx" ON "PlanoConta"("empresaId");

-- CreateIndex
CREATE INDEX "PlanoManutencao_empresaId_idx" ON "PlanoManutencao"("empresaId");

-- CreateIndex
CREATE INDEX "PrecoClienteObra_empresaId_idx" ON "PrecoClienteObra"("empresaId");

-- CreateIndex
CREATE INDEX "Servico_empresaId_idx" ON "Servico"("empresaId");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE INDEX "Usuario_roleEmpresa_idx" ON "Usuario"("roleEmpresa");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroCustoCompra" ADD CONSTRAINT "CentroCustoCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoCompra" ADD CONSTRAINT "CatalogoCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoConta" ADD CONSTRAINT "PlanoConta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompra" ADD CONSTRAINT "OrdemCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompraItem" ADD CONSTRAINT "OrdemCompraItem_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemCompraParcela" ADD CONSTRAINT "OrdemCompraParcela_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoFormacaoPreco" ADD CONSTRAINT "OrcamentoFormacaoPreco_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoFrente" ADD CONSTRAINT "OrcamentoFrente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoPremissa" ADD CONSTRAINT "OrcamentoPremissa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoClienteObra" ADD CONSTRAINT "PrecoClienteObra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaRomaneio" ADD CONSTRAINT "FichaRomaneio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoRomaneio" ADD CONSTRAINT "LancamentoRomaneio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeituraEquipamento" ADD CONSTRAINT "LeituraEquipamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoManutencao" ADD CONSTRAINT "PlanoManutencao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaManutencao" ADD CONSTRAINT "AgendaManutencao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaProgramacao" ADD CONSTRAINT "AgendaProgramacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManutencaoExecutada" ADD CONSTRAINT "ManutencaoExecutada_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaManutencao" ADD CONSTRAINT "AlertaManutencao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnexoManutencao" ADD CONSTRAINT "AnexoManutencao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicao" ADD CONSTRAINT "Medicao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicaoItem" ADD CONSTRAINT "MedicaoItem_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoAlteracao" ADD CONSTRAINT "HistoricoAlteracao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
