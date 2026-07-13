DO $$
BEGIN
  CREATE TYPE "ModoCustoFrente" AS ENUM ('AUTO', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "OrcamentoFrente"
ADD COLUMN IF NOT EXISTS "modoCusto" "ModoCustoFrente" NOT NULL DEFAULT 'AUTO';

-- O campo custoManual somente era persistido quando o engenheiro informava
-- explicitamente o custo da frente. Esses registros devem preservar a origem.
UPDATE "OrcamentoFrente"
SET "modoCusto" = 'MANUAL'
WHERE "custoManual" > 0;
