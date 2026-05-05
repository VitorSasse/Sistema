ALTER TABLE "Medicao" ALTER COLUMN "tipoMedicao" DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'MedicaoItem'
      AND column_name = 'valorUnitario'
  ) THEN
    ALTER TABLE "MedicaoItem"
      ADD COLUMN "valorUnitario" DECIMAL(12, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'MedicaoItem'
      AND column_name = 'valorTotalItem'
  ) THEN
    ALTER TABLE "MedicaoItem"
      ADD COLUMN "valorTotalItem" DECIMAL(14, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE TYPE "TipoMedicao_new" AS ENUM ('UNICA', 'QUINZENAL', 'FECHADA');

ALTER TABLE "Medicao"
  ALTER COLUMN "tipoMedicao" TYPE "TipoMedicao_new"
  USING (
    CASE
      WHEN "tipoMedicao"::text = 'UNICA' THEN 'UNICA'
      WHEN "tipoMedicao"::text IN ('FINAL', 'MENSAL', 'FECHADA') THEN 'FECHADA'
      ELSE 'QUINZENAL'
    END
  )::"TipoMedicao_new";

DROP TYPE "TipoMedicao";

ALTER TYPE "TipoMedicao_new" RENAME TO "TipoMedicao";

ALTER TABLE "Medicao" ALTER COLUMN "tipoMedicao" SET DEFAULT 'QUINZENAL';
