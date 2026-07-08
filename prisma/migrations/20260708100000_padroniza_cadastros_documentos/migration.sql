ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "enderecoNumero" TEXT;
ALTER TABLE "Fornecedor" ADD COLUMN IF NOT EXISTS "enderecoNumero" TEXT;

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("cpf", ''), '\D', '', 'g') AS digits
  FROM "Cliente"
)
UPDATE "Cliente" AS target
SET "cpf" =
  substring(normalized.digits from 1 for 3) || '.' ||
  substring(normalized.digits from 4 for 3) || '.' ||
  substring(normalized.digits from 7 for 3) || '-' ||
  substring(normalized.digits from 10 for 2)
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) = 11;

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("cnpj", ''), '\D', '', 'g') AS digits
  FROM "Cliente"
)
UPDATE "Cliente" AS target
SET "cnpj" =
  substring(normalized.digits from 1 for 2) || '.' ||
  substring(normalized.digits from 3 for 3) || '.' ||
  substring(normalized.digits from 6 for 3) || '/' ||
  substring(normalized.digits from 9 for 4) || '-' ||
  substring(normalized.digits from 13 for 2)
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) = 14;

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("telefone", ''), '\D', '', 'g') AS digits
  FROM "Cliente"
)
UPDATE "Cliente" AS target
SET "telefone" = CASE
  WHEN length(normalized.digits) = 11 THEN
    '(' || substring(normalized.digits from 1 for 2) || ') ' ||
    substring(normalized.digits from 3 for 1) || ' ' ||
    substring(normalized.digits from 4 for 4) || '-' ||
    substring(normalized.digits from 8 for 4)
  WHEN length(normalized.digits) = 10 THEN
    '(' || substring(normalized.digits from 1 for 2) || ') ' ||
    substring(normalized.digits from 3 for 4) || '-' ||
    substring(normalized.digits from 7 for 4)
  ELSE target."telefone"
END
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) IN (10, 11);

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("cep", ''), '\D', '', 'g') AS digits
  FROM "Cliente"
)
UPDATE "Cliente" AS target
SET "cep" = substring(normalized.digits from 1 for 5) || '-' || substring(normalized.digits from 6 for 3)
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) = 8;

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("cnpj", ''), '\D', '', 'g') AS digits
  FROM "Fornecedor"
)
UPDATE "Fornecedor" AS target
SET "cnpj" =
  substring(normalized.digits from 1 for 2) || '.' ||
  substring(normalized.digits from 3 for 3) || '.' ||
  substring(normalized.digits from 6 for 3) || '/' ||
  substring(normalized.digits from 9 for 4) || '-' ||
  substring(normalized.digits from 13 for 2)
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) = 14;

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("telefone", ''), '\D', '', 'g') AS digits
  FROM "Fornecedor"
)
UPDATE "Fornecedor" AS target
SET "telefone" = CASE
  WHEN length(normalized.digits) = 11 THEN
    '(' || substring(normalized.digits from 1 for 2) || ') ' ||
    substring(normalized.digits from 3 for 1) || ' ' ||
    substring(normalized.digits from 4 for 4) || '-' ||
    substring(normalized.digits from 8 for 4)
  WHEN length(normalized.digits) = 10 THEN
    '(' || substring(normalized.digits from 1 for 2) || ') ' ||
    substring(normalized.digits from 3 for 4) || '-' ||
    substring(normalized.digits from 7 for 4)
  ELSE target."telefone"
END
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) IN (10, 11);

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("cep", ''), '\D', '', 'g') AS digits
  FROM "Fornecedor"
)
UPDATE "Fornecedor" AS target
SET "cep" = substring(normalized.digits from 1 for 5) || '-' || substring(normalized.digits from 6 for 3)
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) = 8;

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("documento", ''), '\D', '', 'g') AS digits
  FROM "Colaborador"
)
UPDATE "Colaborador" AS target
SET "documento" =
  substring(normalized.digits from 1 for 3) || '.' ||
  substring(normalized.digits from 4 for 3) || '.' ||
  substring(normalized.digits from 7 for 3) || '-' ||
  substring(normalized.digits from 10 for 2)
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) = 11;

WITH normalized AS (
  SELECT id, regexp_replace(coalesce("telefone", ''), '\D', '', 'g') AS digits
  FROM "Colaborador"
)
UPDATE "Colaborador" AS target
SET "telefone" = CASE
  WHEN length(normalized.digits) = 11 THEN
    '(' || substring(normalized.digits from 1 for 2) || ') ' ||
    substring(normalized.digits from 3 for 1) || ' ' ||
    substring(normalized.digits from 4 for 4) || '-' ||
    substring(normalized.digits from 8 for 4)
  WHEN length(normalized.digits) = 10 THEN
    '(' || substring(normalized.digits from 1 for 2) || ') ' ||
    substring(normalized.digits from 3 for 4) || '-' ||
    substring(normalized.digits from 7 for 4)
  ELSE target."telefone"
END
FROM normalized
WHERE target.id = normalized.id
  AND length(normalized.digits) IN (10, 11);
