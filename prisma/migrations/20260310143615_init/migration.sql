-- CreateEnum
CREATE TYPE "StatusCadastro" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipoRecurso" AS ENUM ('CAMINHAO', 'MAQUINA', 'CARRETA', 'EQUIPAMENTO_APOIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "FuncaoColaborador" AS ENUM ('MOTORISTA', 'OPERADOR', 'ENCARREGADO', 'ADMINISTRATIVO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoMedicao" AS ENUM ('QUINZENAL', 'MENSAL', 'UNICA');

-- CreateEnum
CREATE TYPE "StatusMedicao" AS ENUM ('EM_ELABORACAO', 'ENVIADA', 'APROVADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('VALIDO', 'PENDENTE_OBRA', 'PENDENTE_PRECO', 'DIVERGENTE', 'MEDIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OrigemLancamento" AS ENUM ('MANUAL', 'IMPORTADO', 'API');

-- CreateEnum
CREATE TYPE "TipoAlteracao" AS ENUM ('CRIACAO', 'EDICAO', 'EXCLUSAO_LOGICA', 'MUDANCA_STATUS', 'FECHAMENTO_MEDICAO', 'CANCELAMENTO_MEDICAO');

-- CreateEnum
CREATE TYPE "TipoLogAuditoria" AS ENUM ('LOGIN', 'LOGOUT', 'CRUD', 'EXPORTACAO', 'FECHAMENTO_MEDICAO', 'CANCELAMENTO_MEDICAO', 'ERRO_NEGOCIO');

-- CreateEnum
CREATE TYPE "RoleCodigo" AS ENUM ('ADMIN', 'GESTOR', 'OPERACIONAL', 'FINANCEIRO', 'CONSULTA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "ultimoLoginEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "codigo" "RoleCodigo" NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioRole" (
    "usuarioId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UsuarioRole_pkey" PRIMARY KEY ("usuarioId","roleId")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpjCpf" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "centroCusto" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "liberadaParaLancamento" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipamento" (
    "id" TEXT NOT NULL,
    "codigoRecurso" TEXT NOT NULL,
    "tipoRecurso" "TipoRecurso" NOT NULL,
    "descricao" TEXT NOT NULL,
    "placaOuTag" TEXT NOT NULL,
    "capacidadeM3" DECIMAL(10,2),
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "dataSaida" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "codigoMaterial" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidadePadrao" TEXT NOT NULL,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "formaMedicao" TEXT NOT NULL,
    "unidadeFaturamento" TEXT NOT NULL,
    "observacao" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "funcao" "FuncaoColaborador" NOT NULL,
    "dataAdmissao" TIMESTAMP(3),
    "dataSaida" TIMESTAMP(3),
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecoClienteObra" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "materialId" TEXT,
    "equipamentoId" TEXT,
    "unidadeFaturamento" TEXT NOT NULL,
    "valorUnitario" DECIMAL(12,2) NOT NULL,
    "vigenciaInicial" TIMESTAMP(3) NOT NULL,
    "vigenciaFinal" TIMESTAMP(3),
    "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecoClienteObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ficha" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "obraId" TEXT,
    "observacao" TEXT,
    "origem" "OrigemLancamento" NOT NULL DEFAULT 'MANUAL',
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ficha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoDiario" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "obraId" TEXT,
    "servicoId" TEXT NOT NULL,
    "materialId" TEXT,
    "equipamentoId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "quantidadeApontada" DECIMAL(12,2) NOT NULL,
    "unidade" TEXT NOT NULL,
    "observacao" TEXT,
    "statusValidacao" "StatusLancamento" NOT NULL DEFAULT 'VALIDO',
    "origem" "OrigemLancamento" NOT NULL DEFAULT 'MANUAL',
    "precoAplicadoId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "atualizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LancamentoDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicao" (
    "id" TEXT NOT NULL,
    "codigoMedicao" TEXT NOT NULL,
    "tipoMedicao" "TipoMedicao" NOT NULL DEFAULT 'QUINZENAL',
    "clienteId" TEXT NOT NULL,
    "obraId" TEXT,
    "periodoInicial" TIMESTAMP(3) NOT NULL,
    "periodoFinal" TIMESTAMP(3) NOT NULL,
    "status" "StatusMedicao" NOT NULL DEFAULT 'EM_ELABORACAO',
    "valorTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "fechadoPorId" TEXT,
    "fechadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicaoItem" (
    "id" TEXT NOT NULL,
    "medicaoId" TEXT NOT NULL,
    "lancamentoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "ficha" TEXT NOT NULL,
    "placaOuTag" TEXT NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "material" TEXT,
    "unidade" TEXT NOT NULL,
    "quantidadeMedida" DECIMAL(12,2) NOT NULL,
    "m3SeAplicavel" DECIMAL(12,2),
    "precoUnitario" DECIMAL(12,2) NOT NULL,
    "valorItem" DECIMAL(14,2) NOT NULL,
    "origem" "OrigemLancamento" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicaoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoAlteracao" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "motivo" TEXT,
    "tipoAlteracao" "TipoAlteracao" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoAlteracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "urlArquivo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL,
    "tipo" "TipoLogAuditoria" NOT NULL,
    "entidade" TEXT,
    "entidadeId" TEXT,
    "acao" TEXT NOT NULL,
    "detalhes" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_codigo_key" ON "Role"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

-- CreateIndex
CREATE INDEX "Obra_clienteId_status_idx" ON "Obra"("clienteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Obra_clienteId_codigo_key" ON "Obra"("clienteId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_codigoRecurso_key" ON "Equipamento"("codigoRecurso");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_placaOuTag_key" ON "Equipamento"("placaOuTag");

-- CreateIndex
CREATE INDEX "Equipamento_tipoRecurso_status_idx" ON "Equipamento"("tipoRecurso", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Material_codigoMaterial_key" ON "Material"("codigoMaterial");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_codigo_key" ON "Servico"("codigo");

-- CreateIndex
CREATE INDEX "Servico_status_tipoServico_idx" ON "Servico"("status", "tipoServico");

-- CreateIndex
CREATE INDEX "Colaborador_funcao_status_idx" ON "Colaborador"("funcao", "status");

-- CreateIndex
CREATE INDEX "PrecoClienteObra_clienteId_obraId_servicoId_vigenciaInicial_idx" ON "PrecoClienteObra"("clienteId", "obraId", "servicoId", "vigenciaInicial");

-- CreateIndex
CREATE INDEX "PrecoClienteObra_materialId_idx" ON "PrecoClienteObra"("materialId");

-- CreateIndex
CREATE INDEX "PrecoClienteObra_equipamentoId_idx" ON "PrecoClienteObra"("equipamentoId");

-- CreateIndex
CREATE INDEX "Ficha_clienteId_obraId_data_idx" ON "Ficha"("clienteId", "obraId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Ficha_numero_data_key" ON "Ficha"("numero", "data");

-- CreateIndex
CREATE INDEX "LancamentoDiario_data_clienteId_obraId_idx" ON "LancamentoDiario"("data", "clienteId", "obraId");

-- CreateIndex
CREATE INDEX "LancamentoDiario_fichaId_idx" ON "LancamentoDiario"("fichaId");

-- CreateIndex
CREATE INDEX "LancamentoDiario_equipamentoId_data_idx" ON "LancamentoDiario"("equipamentoId", "data");

-- CreateIndex
CREATE INDEX "LancamentoDiario_colaboradorId_data_idx" ON "LancamentoDiario"("colaboradorId", "data");

-- CreateIndex
CREATE INDEX "LancamentoDiario_statusValidacao_data_idx" ON "LancamentoDiario"("statusValidacao", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Medicao_codigoMedicao_key" ON "Medicao"("codigoMedicao");

-- CreateIndex
CREATE INDEX "Medicao_clienteId_obraId_periodoInicial_periodoFinal_idx" ON "Medicao"("clienteId", "obraId", "periodoInicial", "periodoFinal");

-- CreateIndex
CREATE INDEX "Medicao_status_idx" ON "Medicao"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicaoItem_lancamentoId_key" ON "MedicaoItem"("lancamentoId");

-- CreateIndex
CREATE INDEX "MedicaoItem_medicaoId_data_idx" ON "MedicaoItem"("medicaoId", "data");

-- CreateIndex
CREATE INDEX "HistoricoAlteracao_entidade_entidadeId_createdAt_idx" ON "HistoricoAlteracao"("entidade", "entidadeId", "createdAt");

-- CreateIndex
CREATE INDEX "Anexo_fichaId_idx" ON "Anexo"("fichaId");

-- CreateIndex
CREATE INDEX "LogAuditoria_tipo_createdAt_idx" ON "LogAuditoria"("tipo", "createdAt");

-- CreateIndex
CREATE INDEX "LogAuditoria_entidade_entidadeId_idx" ON "LogAuditoria"("entidade", "entidadeId");

-- AddForeignKey
ALTER TABLE "UsuarioRole" ADD CONSTRAINT "UsuarioRole_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRole" ADD CONSTRAINT "UsuarioRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoClienteObra" ADD CONSTRAINT "PrecoClienteObra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoClienteObra" ADD CONSTRAINT "PrecoClienteObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoClienteObra" ADD CONSTRAINT "PrecoClienteObra_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoClienteObra" ADD CONSTRAINT "PrecoClienteObra_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoClienteObra" ADD CONSTRAINT "PrecoClienteObra_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_precoAplicadoId_fkey" FOREIGN KEY ("precoAplicadoId") REFERENCES "PrecoClienteObra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoDiario" ADD CONSTRAINT "LancamentoDiario_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicao" ADD CONSTRAINT "Medicao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicao" ADD CONSTRAINT "Medicao_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicao" ADD CONSTRAINT "Medicao_fechadoPorId_fkey" FOREIGN KEY ("fechadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicaoItem" ADD CONSTRAINT "MedicaoItem_medicaoId_fkey" FOREIGN KEY ("medicaoId") REFERENCES "Medicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicaoItem" ADD CONSTRAINT "MedicaoItem_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "LancamentoDiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoAlteracao" ADD CONSTRAINT "HistoricoAlteracao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
