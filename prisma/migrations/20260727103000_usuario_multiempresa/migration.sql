CREATE TABLE "UsuarioEmpresa" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "roleEmpresa" "RoleUsuarioEmpresa" NOT NULL DEFAULT 'OPERADOR',
  "modoSomenteLeitura" BOOLEAN NOT NULL DEFAULT false,
  "permissoesAcesso" JSONB NOT NULL DEFAULT '{}',
  "status" "StatusCadastro" NOT NULL DEFAULT 'ATIVO',
  "padrao" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UsuarioEmpresa_pkey" PRIMARY KEY ("id")
);

INSERT INTO "UsuarioEmpresa" (
  "id",
  "usuarioId",
  "empresaId",
  "roleEmpresa",
  "modoSomenteLeitura",
  "permissoesAcesso",
  "status",
  "padrao",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  usuario.id,
  usuario."empresaId",
  usuario."roleEmpresa",
  usuario."modoSomenteLeitura",
  usuario."permissoesAcesso"::jsonb,
  usuario.status,
  true,
  usuario."createdAt",
  usuario."updatedAt"
FROM "Usuario" usuario
WHERE usuario."empresaId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "UsuarioEmpresa_usuarioId_empresaId_key" ON "UsuarioEmpresa"("usuarioId", "empresaId");
CREATE INDEX "UsuarioEmpresa_empresaId_status_idx" ON "UsuarioEmpresa"("empresaId", "status");
CREATE INDEX "UsuarioEmpresa_usuarioId_status_idx" ON "UsuarioEmpresa"("usuarioId", "status");
CREATE INDEX "UsuarioEmpresa_usuarioId_padrao_idx" ON "UsuarioEmpresa"("usuarioId", "padrao");

ALTER TABLE "UsuarioEmpresa"
ADD CONSTRAINT "UsuarioEmpresa_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UsuarioEmpresa"
ADD CONSTRAINT "UsuarioEmpresa_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
