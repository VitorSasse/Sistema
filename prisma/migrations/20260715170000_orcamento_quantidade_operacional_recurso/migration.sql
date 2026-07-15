CREATE TYPE "OrigemQuantidadeOperacional" AS ENUM ('FRENTE', 'PERSONALIZADA');

ALTER TABLE "OrcamentoItem"
ADD COLUMN "quantidadeOperacional" DECIMAL(14, 4),
ADD COLUMN "origemQuantidadeOperacional" "OrigemQuantidadeOperacional" NOT NULL DEFAULT 'FRENTE';

UPDATE "OrcamentoItem" AS item
SET "quantidadeOperacional" = frente."quantidadePrevista"
FROM "OrcamentoFrente" AS frente
WHERE item."frenteId" = frente."id"
  AND item."tipoItem" = 'RECURSO';
