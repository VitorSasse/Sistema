import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_EMPRESA_ID = process.env.TARGET_EMPRESA_ID?.trim();

const TARGET_CLIENT = "JACKSON";
const TARGET_WORK = "JACKSON(AREIA SUJA)";

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

async function ensureClient() {
  const existing = await prisma.cliente.findFirst({
    where: { empresaId: TARGET_EMPRESA_ID!, nome: TARGET_CLIENT },
    select: { id: true, codigo: true, nome: true, status: true }
  });

  if (existing) {
    return { action: "client_exists", cliente: existing };
  }

  const codes = await prisma.cliente.findMany({
    where: { empresaId: TARGET_EMPRESA_ID! },
    select: { codigo: true }
  });

  const created = await prisma.cliente.create({
    data: {
      empresaId: TARGET_EMPRESA_ID!,
      codigo: nextSequentialCode(
        "CLI-",
        codes.map((item) => item.codigo)
      ),
      nome: TARGET_CLIENT,
      status: "ATIVO"
    },
    select: { id: true, codigo: true, nome: true, status: true }
  });

  return { action: "client_created", cliente: created };
}

async function ensureWork(clienteId: string) {
  const existing = await prisma.obra.findFirst({
    where: {
      empresaId: TARGET_EMPRESA_ID!,
      clienteId,
      nome: TARGET_WORK
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true,
      clienteId: true
    }
  });

  if (existing) {
    return { action: "work_exists", obra: existing };
  }

  const codes = await prisma.obra.findMany({
    where: { empresaId: TARGET_EMPRESA_ID! },
    select: { codigo: true }
  });

  const created = await prisma.obra.create({
    data: {
      empresaId: TARGET_EMPRESA_ID!,
      codigo: nextSequentialCode(
        "OBR-",
        codes.map((item) => item.codigo)
      ),
      clienteId,
      nome: TARGET_WORK,
      status: "ATIVO",
      liberadaParaLancamento: true
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true,
      clienteId: true
    }
  });

  return { action: "work_created", obra: created };
}

async function main() {
  if (!TARGET_EMPRESA_ID) {
    throw new Error("Informe TARGET_EMPRESA_ID para executar este script.");
  }

  const clientResult = await ensureClient();
  const workResult = await ensureWork(clientResult.cliente.id);

  console.log(
    JSON.stringify(
      {
        clientResult,
        workResult
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
