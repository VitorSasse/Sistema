-- CreateTable
CREATE TABLE "UnidadeCusteio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "baseEconomica" TEXT NOT NULL,
    "sufixo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeCusteio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaCusteioRecurso" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidadeCusteioId" TEXT NOT NULL,
    "valorReferencia" DECIMAL(14,4) NOT NULL,
    "preferencial" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormaCusteioRecurso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeCusteio_empresaId_codigo_key" ON "UnidadeCusteio"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "UnidadeCusteio_empresaId_ativo_idx" ON "UnidadeCusteio"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "UnidadeCusteio_baseEconomica_idx" ON "UnidadeCusteio"("baseEconomica");

-- CreateIndex
CREATE INDEX "FormaCusteioRecurso_empresaId_idx" ON "FormaCusteioRecurso"("empresaId");

-- CreateIndex
CREATE INDEX "FormaCusteioRecurso_equipamentoId_ativo_idx" ON "FormaCusteioRecurso"("equipamentoId", "ativo");

-- CreateIndex
CREATE INDEX "FormaCusteioRecurso_unidadeCusteioId_idx" ON "FormaCusteioRecurso"("unidadeCusteioId");

-- CreateIndex
CREATE INDEX "FormaCusteioRecurso_preferencial_idx" ON "FormaCusteioRecurso"("preferencial");

-- CreateIndex
CREATE UNIQUE INDEX "FormaCusteioRecurso_equipamento_preferencial_ativo_key"
ON "FormaCusteioRecurso"("equipamentoId")
WHERE "preferencial" = true AND "ativo" = true;

-- AddForeignKey
ALTER TABLE "UnidadeCusteio" ADD CONSTRAINT "UnidadeCusteio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormaCusteioRecurso" ADD CONSTRAINT "FormaCusteioRecurso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormaCusteioRecurso" ADD CONSTRAINT "FormaCusteioRecurso_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormaCusteioRecurso" ADD CONSTRAINT "FormaCusteioRecurso_unidadeCusteioId_fkey" FOREIGN KEY ("unidadeCusteioId") REFERENCES "UnidadeCusteio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
