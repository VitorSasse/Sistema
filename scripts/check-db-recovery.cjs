const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const counts = {
    usuario: await prisma.usuario.count(),
    cliente: await prisma.cliente.count(),
    obra: await prisma.obra.count(),
    equipamento: await prisma.equipamento.count(),
    material: await prisma.material.count(),
    servico: await prisma.servico.count(),
    colaborador: await prisma.colaborador.count(),
    ficha: await prisma.ficha.count(),
    lancamentoDiario: await prisma.lancamentoDiario.count(),
    medicao: await prisma.medicao.count(),
    medicaoItem: await prisma.medicaoItem.count(),
    agendaProgramacao: await prisma.agendaProgramacao.count(),
    leituraEquipamento: await prisma.leituraEquipamento.count(),
    planoManutencao: await prisma.planoManutencao.count(),
    historicoAlteracao: await prisma.historicoAlteracao.count(),
    anexo: await prisma.anexo.count(),
  };

  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((error) => {
    console.error("DB_CHECK_ERROR");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
