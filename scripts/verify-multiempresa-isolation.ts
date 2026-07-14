import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, RoleUsuarioEmpresa } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext, runWithoutTenantScope, type TenantContext } from "@/lib/tenant-store";

const admin = new PrismaClient();

function context(empresaId: string, usuarioId = "verificacao"): TenantContext {
  return {
    usuarioId,
    empresaId,
    roleEmpresa: RoleUsuarioEmpresa.ADMIN_EMPRESA,
    isMaster: false,
    empresaSelecionadaId: null,
    initialized: true,
    bypassTenantScope: false
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function counts(empresaId: string) {
  return runWithTenantContext(context(empresaId), async () => ({
    clientes: await prisma.cliente.count(),
    obras: await prisma.obra.count(),
    equipamentos: await prisma.equipamento.count(),
    lancamentos: await prisma.lancamentoDiario.count(),
    medicoes: await prisma.medicao.count(),
    ordensCompra: await prisma.ordemCompra.count(),
    orcamentos: await prisma.orcamento.count(),
    fornecedores: await prisma.fornecedor.count()
  }));
}

async function main() {
  const empresas = await admin.empresa.findMany({
    select: { id: true, nome: true, status: true, deletedAt: true },
    orderBy: { createdAt: "asc" }
  });
  const empresasAtivas = empresas.filter((empresa) => empresa.status === "ATIVO" && empresa.deletedAt === null);
  assert(empresasAtivas.length >= 2, "A verificacao integrada exige ao menos duas empresas ativas.");

  const contagens = await Promise.all(empresas.map(async (empresa) => ({ empresa, dados: await counts(empresa.id) })));
  const idsAtivos = new Set(empresasAtivas.map((empresa) => empresa.id));
  const origem = contagens.find((item) => idsAtivos.has(item.empresa.id) && item.dados.clientes > 0);
  const destino = contagens.find((item) => idsAtivos.has(item.empresa.id) && item.empresa.id !== origem?.empresa.id);
  assert(origem && destino, "Nao foi possivel escolher duas empresas distintas para o teste.");

  const clienteOrigem = await admin.cliente.findFirst({
    where: { empresaId: origem.empresa.id },
    select: { id: true }
  });
  assert(clienteOrigem, "A empresa de origem precisa possuir ao menos um cliente.");

  const acessoCruzado = await runWithTenantContext(context(destino.empresa.id), async () =>
    prisma.cliente.findUnique({ where: { id: clienteOrigem.id }, select: { id: true } })
  );
  assert(acessoCruzado === null, "Uma empresa conseguiu consultar cliente de outra empresa por ID.");

  const updateCruzado = await runWithTenantContext(context(destino.empresa.id), async () =>
    prisma.cliente.updateMany({ where: { id: clienteOrigem.id }, data: { updatedAt: new Date() } })
  );
  assert(updateCruzado.count === 0, "Uma empresa conseguiu atualizar registro de outra empresa.");

  const deleteCruzado = await runWithTenantContext(context(destino.empresa.id), async () =>
    prisma.cliente.deleteMany({ where: { id: clienteOrigem.id } })
  );
  assert(deleteCruzado.count === 0, "Uma empresa conseguiu excluir registro de outra empresa.");

  let clienteTemporarioId: string | null = null;
  try {
    const codigo = `ISO-${randomUUID().slice(0, 8).toUpperCase()}`;
    const criado = await runWithTenantContext(context(destino.empresa.id), async () =>
      prisma.cliente.create({
        data: {
          codigo,
          nome: "CLIENTE TEMPORARIO TESTE ISOLAMENTO"
        } as Prisma.ClienteUncheckedCreateInput,
        select: { id: true, empresaId: true }
      })
    );
    clienteTemporarioId = criado.id;
    assert(criado.empresaId === destino.empresa.id, "Create nao injetou a empresa do contexto.");

    const leituraPropria = await runWithTenantContext(context(destino.empresa.id), async () =>
      prisma.cliente.findUnique({ where: { id: criado.id }, select: { id: true } })
    );
    assert(leituraPropria?.id === criado.id, "A empresa nao conseguiu consultar o proprio registro.");

    const leituraOutraEmpresa = await runWithTenantContext(context(origem.empresa.id), async () =>
      prisma.cliente.findUnique({ where: { id: criado.id }, select: { id: true } })
    );
    assert(leituraOutraEmpresa === null, "Registro novo vazou para outra empresa.");

    let empresaFrontendRejeitada = false;
    try {
      await runWithTenantContext(context(destino.empresa.id), async () =>
        prisma.cliente.create({
          data: {
            empresaId: origem.empresa.id,
            codigo: `ISO-${randomUUID().slice(0, 8).toUpperCase()}`,
            nome: "TENTATIVA EMPRESA FRONTEND"
          }
        })
      );
    } catch {
      empresaFrontendRejeitada = true;
    }
    assert(empresaFrontendRejeitada, "Create aceitou empresaId diferente do contexto autenticado.");
  } finally {
    if (clienteTemporarioId) {
      await admin.cliente.deleteMany({ where: { id: clienteTemporarioId } });
    }
  }

  await Promise.all(
    Array.from({ length: 8 }, async (_, index) => {
      const target = index % 2 === 0 ? origem : destino;
      const result = await counts(target.empresa.id);
      assert(result.clientes === target.dados.clientes, "Contextos concorrentes misturaram contagens de clientes.");
    })
  );

  await runWithTenantContext(
    {
      ...context(origem.empresa.id),
      isMaster: true,
      roleEmpresa: RoleUsuarioEmpresa.MASTER,
      empresaSelecionadaId: destino.empresa.id
    },
    async () => {
      const total = await prisma.cliente.count();
      assert(total === destino.dados.clientes, "MASTER nao respeitou a empresa selecionada.");
    }
  );

  let masterSemEmpresaBloqueado = false;
  try {
    await runWithTenantContext(
      {
        ...context(origem.empresa.id),
        isMaster: true,
        roleEmpresa: RoleUsuarioEmpresa.MASTER,
        empresaSelecionadaId: null
      },
      async () => await prisma.cliente.count()
    );
  } catch {
    masterSemEmpresaBloqueado = true;
  }
  assert(masterSemEmpresaBloqueado, "MASTER acessou dados operacionais sem selecionar empresa.");

  const globalClientes = await runWithoutTenantScope(async () => await prisma.cliente.count());
  assert(globalClientes === contagens.reduce((total, item) => total + item.dados.clientes, 0), "Contagem global diverge da soma dos tenants.");

  console.log(JSON.stringify({ status: "APROVADO", empresas: contagens }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.$disconnect();
    await prisma.$disconnect();
  });
