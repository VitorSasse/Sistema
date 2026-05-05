import bcrypt from "bcryptjs";
import { PrismaClient, RoleCodigo, StatusCadastro } from "@prisma/client";

const prisma = new PrismaClient();

async function seedRoles() {
  const roles = Object.values(RoleCodigo);

  for (const codigo of roles) {
    await prisma.role.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nome: codigo
      }
    });
  }
}

async function seedAdmin() {
  const email = (process.env.ADMIN_SEED_EMAIL ?? "admin@gestaofichas.local").trim().toLowerCase();
  const nome = (process.env.ADMIN_SEED_NAME ?? "Administrador").trim() || "Administrador";
  const senhaInformada = process.env.ADMIN_SEED_PASSWORD?.trim();
  const forceReset = process.env.ADMIN_FORCE_RESET === "true";

  if (process.env.NODE_ENV === "production" && !senhaInformada) {
    console.warn("ADMIN_SEED_PASSWORD nao informado. Seed de administrador ignorado em producao.");
    return;
  }

  const senhaBase =
    senhaInformada ||
    (process.env.NODE_ENV === "production"
      ? null
      : "Admin@123");

  if (!senhaBase) {
    return;
  }

  const senhaHash = await bcrypt.hash(senhaBase, 10);

  const existente = await prisma.usuario.findUnique({
    where: { email }
  });

  const usuario = existente
    ? await prisma.usuario.update({
        where: { id: existente.id },
        data: {
          nome,
          status: StatusCadastro.ATIVO,
          ...(forceReset ? { senhaHash } : {})
        }
      })
    : await prisma.usuario.create({
        data: {
          nome,
          email,
          senhaHash,
          status: StatusCadastro.ATIVO
        }
      });

  const roleAdmin = await prisma.role.findUniqueOrThrow({
    where: { codigo: RoleCodigo.ADMIN }
  });

  await prisma.usuarioRole.upsert({
    where: {
      usuarioId_roleId: {
        usuarioId: usuario.id,
        roleId: roleAdmin.id
      }
    },
    update: {},
    create: {
      usuarioId: usuario.id,
      roleId: roleAdmin.id
    }
  });
}

export async function main() {
  await seedRoles();
  await seedAdmin();

  console.log("Seed concluido.");
  console.log("Administrador padrao validado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
