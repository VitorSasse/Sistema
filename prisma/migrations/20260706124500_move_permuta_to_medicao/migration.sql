ALTER TABLE "Medicao"
ADD COLUMN IF NOT EXISTS "permutaPercentual" DECIMAL(5, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'MedicaoItem'
      AND column_name = 'permutaPercentual'
  ) THEN
    UPDATE "Medicao" medicao
    SET "permutaPercentual" = LEAST(100, GREATEST(0, ROUND(migrado."percentualMedicao", 2)))
    FROM (
      SELECT
        item."medicaoId",
        CASE
          WHEN COALESCE(SUM(item."valorTotalItem"), 0) > 0 THEN
            SUM(item."valorTotalItem" * COALESCE(item."permutaPercentual", 0) / 100)
            / SUM(item."valorTotalItem") * 100
          ELSE MAX(COALESCE(item."permutaPercentual", 0))
        END AS "percentualMedicao"
      FROM "MedicaoItem" item
      WHERE item."deletedAt" IS NULL
        AND COALESCE(item."permutaPercentual", 0) > 0
      GROUP BY item."medicaoId"
    ) migrado
    WHERE medicao.id = migrado."medicaoId"
      AND COALESCE(medicao."permutaPercentual", 0) = 0;
  END IF;
END $$;

ALTER TABLE "MedicaoItem"
DROP COLUMN IF EXISTS "permutaPercentual";
