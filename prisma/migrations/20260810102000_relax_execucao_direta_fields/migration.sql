-- Permite que execucoes diretas nascam incompletas e sejam complementadas depois.
ALTER TABLE "Execucao" ALTER COLUMN "clienteId" DROP NOT NULL;
ALTER TABLE "Execucao" ALTER COLUMN "descricao" DROP NOT NULL;

ALTER TABLE "FrenteExecutada" ALTER COLUMN "nome" DROP NOT NULL;
ALTER TABLE "FrenteExecutada" ALTER COLUMN "unidade" DROP NOT NULL;
ALTER TABLE "FrenteExecutada" ALTER COLUMN "quantidadeExecutada" DROP NOT NULL;
ALTER TABLE "FrenteExecutada" ALTER COLUMN "receitaRealizada" DROP NOT NULL;
ALTER TABLE "FrenteExecutada" ALTER COLUMN "receitaRealizada" DROP DEFAULT;
