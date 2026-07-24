DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'PROSPECTO'
      AND enumtypid = '"StatusCadastro"'::regtype
  ) THEN
    ALTER TYPE "StatusCadastro" ADD VALUE 'PROSPECTO';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'PROVISORIA'
      AND enumtypid = '"StatusCadastro"'::regtype
  ) THEN
    ALTER TYPE "StatusCadastro" ADD VALUE 'PROVISORIA';
  END IF;
END $$;

ALTER TABLE "Cliente"
  ADD COLUMN IF NOT EXISTS "cadastroCompleto" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Cliente"
SET "cadastroCompleto" = true
WHERE "cadastroCompleto" IS DISTINCT FROM true;
