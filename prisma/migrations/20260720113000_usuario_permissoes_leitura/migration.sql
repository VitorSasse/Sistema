ALTER TABLE "Usuario"
ADD COLUMN "modoSomenteLeitura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "permissoesAcesso" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "Usuario_modoSomenteLeitura_idx" ON "Usuario"("modoSomenteLeitura");
