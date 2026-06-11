import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = await Promise.all([
    prisma.usuario.count(),
    prisma.cliente.count(),
    prisma.obra.count(),
    prisma.equipamento.count(),
    prisma.material.count(),
    prisma.servico.count(),
    prisma.colaborador.count(),
    prisma.ficha.count(),
    prisma.lancamentoDiario.count(),
    prisma.medicao.count(),
    prisma.medicaoItem.count(),
    prisma.agendaProgramacao.count(),
    prisma.leituraEquipamento.count(),
    prisma.planoManutencao.count(),
    prisma.historicoAlteracao.count(),
    prisma.anexo.count()
  ]);

  console.log(
    JSON.stringify(
      {
        usuarios: counts[0],
        clientes: counts[1],
        obras: counts[2],
        equipamentos: counts[3],
        materiais: counts[4],
        servicos: counts[5],
        colaboradores: counts[6],
        fichas: counts[7],
        lancamentos: counts[8],
        medicoes: counts[9],
        medicaoItens: counts[10],
        agendaProgramacao: counts[11],
        leiturasEquipamento: counts[12],
        planosManutencao: counts[13],
        historicoAlteracao: counts[14],
        anexos: counts[15]
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
