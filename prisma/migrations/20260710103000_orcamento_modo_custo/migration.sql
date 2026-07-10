DO $$
BEGIN
  CREATE TYPE "ModoCustoOrcamento" AS ENUM ('SIMPLIFICADO', 'COMPLETO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "OrcamentoFormacaoPreco"
ADD COLUMN IF NOT EXISTS "modoCusto" "ModoCustoOrcamento" NOT NULL DEFAULT 'SIMPLIFICADO';
