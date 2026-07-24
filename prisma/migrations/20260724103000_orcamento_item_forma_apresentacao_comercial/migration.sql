CREATE TYPE "FormaApresentacaoComercialItem" AS ENUM (
  'QUANTIDADE_DEFINIDA',
  'PRECO_UNITARIO_REFERENCIAL'
);

ALTER TABLE "OrcamentoItem"
ADD COLUMN "formaApresentacaoComercial" "FormaApresentacaoComercialItem" NOT NULL DEFAULT 'QUANTIDADE_DEFINIDA';
