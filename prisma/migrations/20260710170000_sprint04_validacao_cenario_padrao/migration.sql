WITH ranked_defaults AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "orcamentoId"
      ORDER BY "createdAt" ASC, "ordem" ASC, "id" ASC
    ) AS row_number
  FROM "OrcamentoCenario"
  WHERE "isPadrao" = true
)
UPDATE "OrcamentoCenario"
SET "isPadrao" = false
WHERE "id" IN (
  SELECT "id"
  FROM ranked_defaults
  WHERE row_number > 1
);

WITH operational_without_default AS (
  SELECT o."id" AS "orcamentoId"
  FROM "Orcamento" o
  WHERE o."tipo" = 'OPERACIONAL'
    AND EXISTS (
      SELECT 1
      FROM "OrcamentoCenario" c
      WHERE c."orcamentoId" = o."id"
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "OrcamentoCenario" c
      WHERE c."orcamentoId" = o."id"
        AND c."isPadrao" = true
    )
),
first_scenario AS (
  SELECT DISTINCT ON (c."orcamentoId")
    c."id"
  FROM "OrcamentoCenario" c
  INNER JOIN operational_without_default missing
    ON missing."orcamentoId" = c."orcamentoId"
  ORDER BY c."orcamentoId", c."ordem" ASC, c."createdAt" ASC, c."id" ASC
)
UPDATE "OrcamentoCenario"
SET "isPadrao" = true
WHERE "id" IN (
  SELECT "id"
  FROM first_scenario
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrcamentoCenario_um_padrao_por_orcamento_idx"
ON "OrcamentoCenario"("orcamentoId")
WHERE "isPadrao" = true;
