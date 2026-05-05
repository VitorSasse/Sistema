-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "contatoNome" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "enderecoLinha1" TEXT,
ADD COLUMN     "enderecoLinha2" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "uf" TEXT;

-- CreateIndex
CREATE INDEX "Cliente_nome_idx" ON "Cliente"("nome");

-- CreateIndex
CREATE INDEX "Cliente_status_nome_idx" ON "Cliente"("status", "nome");
