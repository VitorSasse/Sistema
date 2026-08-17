-- AlterTable
ALTER TABLE "OrcamentoItem" ADD COLUMN "referenciaTecnicaRecursoId" TEXT;
ALTER TABLE "OrcamentoItem" ADD COLUMN "formaCusteioRecursoId" TEXT;
ALTER TABLE "OrcamentoItem" ADD COLUMN "valorReferenciaCusteio" DECIMAL(14,4);
ALTER TABLE "OrcamentoItem" ADD COLUMN "valorAplicadoCusteio" DECIMAL(14,4);
ALTER TABLE "OrcamentoItem" ADD COLUMN "formaCusteioSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "OrcamentoItem_referenciaTecnicaRecursoId_idx" ON "OrcamentoItem"("referenciaTecnicaRecursoId");
CREATE INDEX "OrcamentoItem_formaCusteioRecursoId_idx" ON "OrcamentoItem"("formaCusteioRecursoId");

-- AddForeignKey
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_referenciaTecnicaRecursoId_fkey" FOREIGN KEY ("referenciaTecnicaRecursoId") REFERENCES "ReferenciaTecnicaRecurso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_formaCusteioRecursoId_fkey" FOREIGN KEY ("formaCusteioRecursoId") REFERENCES "FormaCusteioRecurso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
