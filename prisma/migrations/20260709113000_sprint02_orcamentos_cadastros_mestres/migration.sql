DO $$
BEGIN
  CREATE TYPE "CategoriaRecursoOrcamento" AS ENUM ('EQUIPAMENTO', 'EQUIPE', 'MATERIAL', 'TERCEIRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NaturezaServico" AS ENUM ('OPERACIONAL', 'ORCAMENTARIO_COMPOSTO', 'TECNICO_ADMINISTRATIVO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Equipamento"
  ADD COLUMN IF NOT EXISTS "classeOperacional" TEXT;

ALTER TABLE "Servico"
  ADD COLUMN IF NOT EXISTS "natureza" "NaturezaServico" NOT NULL DEFAULT 'OPERACIONAL',
  ADD COLUMN IF NOT EXISTS "usarEmOrcamentos" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "usarEmFichas" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "usarEmMedicoes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "usarEmFaturamento" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "OrcamentoItem"
  ADD COLUMN IF NOT EXISTS "categoriaRecurso" "CategoriaRecursoOrcamento",
  ADD COLUMN IF NOT EXISTS "classeOperacional" TEXT,
  ADD COLUMN IF NOT EXISTS "recursoReferenciaId" TEXT,
  ADD COLUMN IF NOT EXISTS "recursoNome" TEXT;

CREATE INDEX IF NOT EXISTS "Equipamento_classeOperacional_idx" ON "Equipamento"("classeOperacional");
CREATE INDEX IF NOT EXISTS "Servico_natureza_status_idx" ON "Servico"("natureza", "status");
CREATE INDEX IF NOT EXISTS "OrcamentoItem_categoriaRecurso_idx" ON "OrcamentoItem"("categoriaRecurso");
CREATE INDEX IF NOT EXISTS "OrcamentoItem_classeOperacional_idx" ON "OrcamentoItem"("classeOperacional");
