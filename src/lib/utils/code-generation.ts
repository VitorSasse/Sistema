import { prisma } from "@/lib/prisma";

function padSequence(value: number) {
  return String(value).padStart(3, "0");
}

async function getNextSequentialCode(
  prefix: "CLI" | "OBR" | "COL" | "MAT" | "SER" | "FOR" | "OC" | "CCO" | "CAT",
  values: string[]
) {
  const highest = values.reduce((max, current) => {
    const match = current.match(new RegExp(`^${prefix}-(\\d+)$`));

    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  return `${prefix}-${padSequence(highest + 1)}`;
}

export async function generateClienteCode() {
  const existentes = await prisma.cliente.findMany({
    select: { codigo: true }
  });

  return getNextSequentialCode(
    "CLI",
    existentes.map((item) => item.codigo)
  );
}

export async function generateObraCode() {
  const existentes = await prisma.obra.findMany({
    select: { codigo: true }
  });

  return getNextSequentialCode(
    "OBR",
    existentes.map((item) => item.codigo)
  );
}

export async function generateColaboradorCode() {
  const existentes = await prisma.colaborador.findMany({
    select: { codigo: true }
  });

  return getNextSequentialCode(
    "COL",
    existentes.map((item) => item.codigo)
  );
}

export async function generateMaterialCode() {
  const existentes = await prisma.material.findMany({
    select: { codigoMaterial: true }
  });

  return getNextSequentialCode(
    "MAT",
    existentes.map((item) => item.codigoMaterial)
  );
}

export async function generateServicoCode() {
  const existentes = await prisma.servico.findMany({
    select: { codigo: true }
  });

  return getNextSequentialCode(
    "SER",
    existentes.map((item) => item.codigo)
  );
}

export async function generateFornecedorCode() {
  const existentes = await prisma.fornecedor.findMany({
    select: { codigo: true }
  });

  return getNextSequentialCode(
    "FOR",
    existentes.map((item) => item.codigo)
  );
}

export async function generateOrdemCompraCode() {
  const existentes = await prisma.ordemCompra.findMany({
    select: { numeroOrdem: true }
  });

  return getNextSequentialCode(
    "OC",
    existentes.map((item) => item.numeroOrdem)
  );
}

export async function generateCentroCustoCompraCode() {
  const existentes = await prisma.centroCustoCompra.findMany({
    select: { codigo: true }
  });

  return getNextSequentialCode(
    "CCO",
    existentes.map((item) => item.codigo)
  );
}

export async function generateCatalogoCompraCode() {
  const existentes = await prisma.catalogoCompra.findMany({
    select: { codigo: true }
  });

  return getNextSequentialCode(
    "CAT",
    existentes.map((item) => item.codigo)
  );
}
