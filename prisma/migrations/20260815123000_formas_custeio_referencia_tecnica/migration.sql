-- AlterTable
ALTER TABLE "FormaCusteioRecurso" ADD COLUMN "referenciaTecnicaId" TEXT;
ALTER TABLE "FormaCusteioRecurso" ALTER COLUMN "equipamentoId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "FormaCusteioRecurso_referenciaTecnicaId_ativo_idx" ON "FormaCusteioRecurso"("referenciaTecnicaId", "ativo");

-- Keep one active preferred cost form per technical reference.
CREATE UNIQUE INDEX "FormaCusteioRecurso_referencia_preferencial_ativo_key"
ON "FormaCusteioRecurso"("referenciaTecnicaId")
WHERE "referenciaTecnicaId" IS NOT NULL AND "preferencial" = true AND "ativo" = true;

-- Ensure a cost form belongs to exactly one owner.
ALTER TABLE "FormaCusteioRecurso"
ADD CONSTRAINT "FormaCusteioRecurso_owner_check"
CHECK (
  ("equipamentoId" IS NOT NULL AND "referenciaTecnicaId" IS NULL)
  OR
  ("equipamentoId" IS NULL AND "referenciaTecnicaId" IS NOT NULL)
);

-- AddForeignKey
ALTER TABLE "FormaCusteioRecurso" ADD CONSTRAINT "FormaCusteioRecurso_referenciaTecnicaId_fkey" FOREIGN KEY ("referenciaTecnicaId") REFERENCES "ReferenciaTecnicaRecurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
