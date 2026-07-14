import bcrypt from "bcryptjs";
import { PrismaClient, RoleCodigo, StatusCadastro } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_EMPRESA_ID = process.env.TARGET_EMPRESA_ID?.trim();

const USERS = [
  { nome: "ENGENHARIA", email: "engenharia@jtbterraplenagem.com.br" },
  { nome: "SUPORTE", email: "suporte@jtbterraplenagem.com.br" }
] as const;

const PASSWORD = "Jmix2026";
const ROLE = RoleCodigo.ADMIN;

async function main() {
  if (!TARGET_EMPRESA_ID) {
    throw new Error("Informe TARGET_EMPRESA_ID para criar usuarios sem assumir uma empresa padrao.");
  }

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
        empresaId: TARGET_EMPRESA_ID,
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
