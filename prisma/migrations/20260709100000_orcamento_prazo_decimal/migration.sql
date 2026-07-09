ALTER TABLE "OrcamentoFrente"
  ALTER COLUMN "prazoEstimadoDias" TYPE DECIMAL(12,2)
  USING "prazoEstimadoDias"::DECIMAL(12,2);
