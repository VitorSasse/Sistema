DO $$
BEGIN
  CREATE TYPE "OrigemPrazoFrente" AS ENUM ('AUTOMATICO', 'AJUSTADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TipoCalculoRecurso" AS ENUM ('AUTOMATICO', 'VALOR_TOTAL_MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UnidadeEconomicaCusto" AS ENUM (
    'CUSTO_FIXO',
    'DIA',
    'HORA',
    'KM',
    'M3',
    'M2',
    'VIAGEM',
    'CARGA',
    'MES',
    'UNIDADE_PRODUZIDA',
    'UNIDADE',
    'VALOR_TOTAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "UnidadeEconomicaCusto" ADD VALUE IF NOT EXISTS 'CUSTO_FIXO';
ALTER TYPE "UnidadeEconomicaCusto" ADD VALUE IF NOT EXISTS 'M2';
ALTER TYPE "UnidadeEconomicaCusto" ADD VALUE IF NOT EXISTS 'CARGA';
ALTER TYPE "UnidadeEconomicaCusto" ADD VALUE IF NOT EXISTS 'UNIDADE_PRODUZIDA';

ALTER TABLE "OrcamentoFrente"
ADD COLUMN IF NOT EXISTS "prazoTeoricoDias" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "prazoAdotadoDias" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "origemPrazo" "OrigemPrazoFrente" NOT NULL DEFAULT 'AUTOMATICO';

UPDATE "OrcamentoFrente"
SET "prazoTeoricoDias" = CASE
  WHEN COALESCE("quantidadePrevista", 0) > 0 AND COALESCE("produtividadeDia", 0) > 0
    THEN ROUND("quantidadePrevista" / "produtividadeDia", 2)
  ELSE "prazoEstimadoDias"
END
WHERE "prazoTeoricoDias" IS NULL;

UPDATE "OrcamentoFrente"
SET
  "prazoAdotadoDias" = CASE
    WHEN "prazoEstimadoDias" IS NOT NULL
      AND (
        "prazoTeoricoDias" IS NULL
        OR ABS("prazoEstimadoDias" - "prazoTeoricoDias") > 0.01
      )
      THEN "prazoEstimadoDias"
    ELSE NULL
  END,
  "origemPrazo" = CASE
    WHEN "prazoEstimadoDias" IS NOT NULL
      AND (
        "prazoTeoricoDias" IS NULL
        OR ABS("prazoEstimadoDias" - "prazoTeoricoDias") > 0.01
      )
      THEN 'AJUSTADO'::"OrigemPrazoFrente"
    ELSE 'AUTOMATICO'::"OrigemPrazoFrente"
  END;

ALTER TABLE "OrcamentoItem"
ADD COLUMN IF NOT EXISTS "tipoCalculoRecurso" "TipoCalculoRecurso" NOT NULL DEFAULT 'AUTOMATICO',
ADD COLUMN IF NOT EXISTS "unidadeEconomicaCusto" "UnidadeEconomicaCusto",
ADD COLUMN IF NOT EXISTS "valorCusto" DECIMAL(14, 4),
ADD COLUMN IF NOT EXISTS "horasDia" DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS "horasTotais" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "viagensDia" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "viagensTotais" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "distanciaViagemKm" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "quilometrosTotais" DECIMAL(14, 2),
ADD COLUMN IF NOT EXISTS "cargasTotais" DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS "mesesTotais" DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS "diasTrabalhadosMes" DECIMAL(8, 2) DEFAULT 22,
ADD COLUMN IF NOT EXISTS "custoTotalCalculado" DECIMAL(14, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "memoriaCalculo" TEXT;

-- Recursos existentes permanecem sem unidade economica explicita. Dessa forma,
-- o motor usa a conversao legada ate o engenheiro optar pelo novo calculo.
UPDATE "OrcamentoItem"
SET
  "valorCusto" = "custoUnitario",
  "horasDia" = CASE
    WHEN LOWER("unidade") LIKE '%hora%' OR LOWER("unidade") LIKE '%/h%' THEN 8
    ELSE "horasDia"
  END,
  "custoTotalCalculado" = ROUND("quantidade" * "custoUnitario", 2),
  "memoriaCalculo" = CONCAT(
    "quantidade",
    ' x R$ ',
    "custoUnitario",
    ' = R$ ',
    ROUND("quantidade" * "custoUnitario", 2)
  )
WHERE "tipoItem" = 'RECURSO';
