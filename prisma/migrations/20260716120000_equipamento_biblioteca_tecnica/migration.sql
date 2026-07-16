CREATE TYPE "NaturezaRecursoEquipamento" AS ENUM (
  'PROPRIO',
  'TERCEIRIZADO',
  'LOCADO',
  'SUBCONTRATADO',
  'BIBLIOTECA_TECNICA'
);

ALTER TABLE "Equipamento"
ADD COLUMN "naturezaRecurso" "NaturezaRecursoEquipamento" NOT NULL DEFAULT 'PROPRIO',
ADD COLUMN "descricaoOperacional" TEXT,
ADD COLUMN "custoPadrao" DECIMAL(14, 4),
ADD COLUMN "permitirEdicaoOrcamento" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Equipamento_naturezaRecurso_status_idx"
ON "Equipamento"("naturezaRecurso", "status");
