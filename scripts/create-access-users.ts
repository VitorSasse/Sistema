import bcrypt from "bcryptjs";
import { PrismaClient, RoleCodigo, StatusCadastro } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { nome: "ENGENHARIA", email: "engenharia@jtbterraplenagem.com.br" },
  { nome: "SUPORTE", email: "suporte@jtbterraplenagem.com.br" }
] as const;

const PASSWORD = "Jmix2026";
const ROLE = RoleCodigo.ADMIN;

async function main() {
  const senhaHash = await bcrypt.hash(PASSWORD, 10);

  const role = await prisma.role.findUniqueOrThrow({
    where: { codigo: ROLE }
  });

  for (const user of USERS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: user.email },
      update: {
        nome: user.nome,
        senhaHash,
        status: StatusCadastro.ATIVO
      },
      create: {
        nome: user.nome,
        email: user.email,
        senhaHash,
        status: StatusCadastro.ATIVO
      }
    });

    await prisma.usuarioRole.upsert({
      where: {
        usuarioId_roleId: {
          usuarioId: usuario.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        usuarioId: usuario.id,
        roleId: role.id
      }
    });

    console.log(`OK: ${usuario.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
