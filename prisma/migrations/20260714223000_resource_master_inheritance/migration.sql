ALTER TABLE "Equipamento"
ADD COLUMN "unidadeEconomicaPadrao" "UnidadeEconomicaCusto",
ADD COLUMN "caracteristicasTecnicas" JSONB;

ALTER TABLE "OrcamentoItem"
ADD COLUMN "caracteristicasRecursoSnapshot" JSONB,
ADD COLUMN "camposTecnicosPersonalizados" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
