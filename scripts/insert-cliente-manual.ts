import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_EMPRESA_ID = process.env.TARGET_EMPRESA_ID?.trim();

const TARGET_NAME = "JOEL MORAES";

function nextSequentialCode(prefix: string, existingCodes: string[]) {
  let highest = 0;

  for (const code of existingCodes) {
    if (!code.startsWith(prefix)) continue;
    const numeric = Number.parseInt(code.slice(prefix.length), 10);
    if (Number.isFinite(numeric)) {
      highest = Math.max(highest, numeric);
    }
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

async function main() {
  if (!TARGET_EMPRESA_ID) {
    throw new Error("Informe TARGET_EMPRESA_ID para executar este script.");
  }

  const existing = await prisma.cliente.findFirst({
    where: {
      empresaId: TARGET_EMPRESA_ID,
      nome: TARGET_NAME
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true
    }
  });

  if (existing) {
    console.log(
      JSON.stringify(
        {
          action: "already_exists",
          cliente: existing
        },
        null,
        2
      )
    );
    return;
  }

  const codes = await prisma.cliente.findMany({
    where: { empresaId: TARGET_EMPRESA_ID },
    select: { codigo: true }
  });

  const codigo = nextSequentialCode(
    "CLI-",
    codes.map((item) => item.codigo)
  );

  const created = await prisma.cliente.create({
    data: {
      empresaId: TARGET_EMPRESA_ID,
      codigo,
      nome: TARGET_NAME,
      status: "ATIVO"
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true
    }
  });

  console.log(
    JSON.stringify(
      {
        action: "created",
        cliente: created
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
