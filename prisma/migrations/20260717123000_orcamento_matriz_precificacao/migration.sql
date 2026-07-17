CREATE TYPE "OrigemValorAplicadoOrcamento" AS ENUM ('CALCULADO_AUTOMATICAMENTE', 'PERSONALIZADO_PELO_USUARIO');

ALTER TABLE "OrcamentoItem"
ADD COLUMN "custoCalculadoOriginal" DECIMAL(14, 2),
ADD COLUMN "custoBaseSobrescrito" DECIMAL(14, 2),
ADD COLUMN "custoBaseAplicado" DECIMAL(14, 2),
ADD COLUMN "origemCustoAplicado" "OrigemValorAplicadoOrcamento" NOT NULL DEFAULT 'CALCULADO_AUTOMATICAMENTE',
ADD COLUMN "precoCalculado" DECIMAL(14, 4),
ADD COLUMN "precoAplicado" DECIMAL(14, 4),
ADD COLUMN "origemValorAplicado" "OrigemValorAplicadoOrcamento" NOT NULL DEFAULT 'CALCULADO_AUTOMATICAMENTE',
ADD COLUMN "usuarioSobrescritaId" TEXT,
ADD COLUMN "dataHoraSobrescrita" TIMESTAMP(3),
ADD COLUMN "motivoSobrescrita" TEXT;
