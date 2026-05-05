const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Uso: node scripts/import-registros-operacionais.cjs <arquivo-json>");
  process.exit(1);
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(/\s+/g, " ");
  return normalized.length ? normalized.toLocaleUpperCase("pt-BR") : null;
}

function normalizeDigits(value) {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length ? digits : null;
}

function normalizeUnit(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized === "M3" || normalized === "M³") return "M³";
  return normalized;
}

function toStatusCadastro(value) {
  const normalized = normalizeText(value);
  return normalized && normalized.startsWith("ATIV") ? "ATIVO" : "INATIVO";
}

function toTipoCliente(documento) {
  if (!documento) return "CNPJ";
  if (documento.length === 11) return "CPF";
  return "CNPJ";
}

function nextSequentialCode(prefix, usedCodes) {
  const highest = usedCodes.reduce((max, current) => {
    const match = String(current).match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  const next = `${prefix}-${String(highest + 1).padStart(3, "0")}`;
  usedCodes.push(next);
  return next;
}

async function main() {
  const raw = fs.readFileSync(path.resolve(inputPath), "utf8").replace(/^\uFEFF/, "");
  const data = JSON.parse(raw);

  const summary = await prisma.$transaction(
    async (tx) => {
      const [existingServicos, existingMateriais, existingClientes, existingObras] =
        await Promise.all([
          tx.servico.findMany({
            select: {
              id: true,
              codigo: true,
              tipoServico: true,
              formaMedicao: true,
              unidadeFaturamento: true,
              observacao: true,
              status: true,
            },
          }),
          tx.material.findMany({
            select: {
              id: true,
              codigoMaterial: true,
              descricao: true,
              unidadePadrao: true,
              observacao: true,
              status: true,
            },
          }),
          tx.cliente.findMany({
            select: {
              id: true,
              codigo: true,
              nome: true,
              cpf: true,
              cnpj: true,
              status: true,
            },
          }),
          tx.obra.findMany({
            select: {
              id: true,
              codigo: true,
              clienteId: true,
              nome: true,
              status: true,
              liberadaParaLancamento: true,
            },
          }),
        ]);

      const usedCodes = {
        servicos: existingServicos.map((item) => item.codigo),
        materiais: existingMateriais.map((item) => item.codigoMaterial),
        clientes: existingClientes.map((item) => item.codigo),
        obras: existingObras.map((item) => item.codigo),
      };

      const result = {
        created: { servicos: 0, materiais: 0, clientes: 0, obras: 0 },
        reused: [],
        errors: [],
        linkageFailures: [],
        uppercaseConfirmed: true,
      };

      const clientPlanilhaToReal = new Map();

      for (const rawItem of data.servicos) {
        const tipoServico = normalizeText(rawItem["Tipo_Serviço"]);
        const formaMedicao = normalizeText(rawItem["Forma_Medição"]);
        const unidadeFaturamento = normalizeUnit(rawItem["Unidade_Faturamento"]);
        const observacao = normalizeText(rawItem["Observação"]);
        const status = toStatusCadastro(rawItem["Status"]);

        const existing = existingServicos.find(
          (item) => normalizeText(item.tipoServico) === tipoServico
        );

        if (existing) {
          await tx.servico.update({
            where: { id: existing.id },
            data: { tipoServico, formaMedicao, unidadeFaturamento, observacao, status },
          });
          result.reused.push(`SERVIÇO: ${existing.codigo} | ${tipoServico}`);
          continue;
        }

        const codigo = nextSequentialCode("SER", usedCodes.servicos);
        const created = await tx.servico.create({
          data: {
            codigo,
            tipoServico,
            formaMedicao,
            unidadeFaturamento,
            observacao,
            status,
          },
        });

        existingServicos.push({
          id: created.id,
          codigo: created.codigo,
          tipoServico,
          formaMedicao,
          unidadeFaturamento,
          observacao,
          status,
        });
        result.created.servicos += 1;
      }

      for (const rawItem of data.materiais) {
        const descricao = normalizeText(rawItem["Descrição"]);
        const unidadePadrao = normalizeUnit(rawItem["Unidade_Padrão"]);
        const status = toStatusCadastro(rawItem["Status"]);
        const observacao = null;
        const materialKey = `${descricao}__${unidadePadrao}`;

        const existing = existingMateriais.find(
          (item) =>
            `${normalizeText(item.descricao)}__${normalizeUnit(item.unidadePadrao)}` ===
            materialKey
        );

        if (existing) {
          await tx.material.update({
            where: { id: existing.id },
            data: { descricao, unidadePadrao, observacao, status },
          });
          result.reused.push(
            `MATERIAL: ${existing.codigoMaterial} | ${descricao} (${unidadePadrao})`
          );
          continue;
        }

        const codigoMaterial = nextSequentialCode("MAT", usedCodes.materiais);
        const created = await tx.material.create({
          data: {
            codigoMaterial,
            descricao,
            unidadePadrao,
            observacao,
            status,
          },
        });

        existingMateriais.push({
          id: created.id,
          codigoMaterial: created.codigoMaterial,
          descricao,
          unidadePadrao,
          observacao,
          status,
        });
        result.created.materiais += 1;
      }

      for (const rawItem of data.clientes) {
        const planilhaId = normalizeText(rawItem["Cliente_ID"]);
        const nome = normalizeText(rawItem["Cliente_Nome"]);
        const documento = normalizeDigits(rawItem["CNPJ/CPF"]);
        const status = toStatusCadastro(rawItem["Status"]);
        const tipoCliente = toTipoCliente(documento);
        const cpf = documento && documento.length === 11 ? documento : null;
        const cnpj = documento && documento.length === 14 ? documento : null;

        let existing = null;
        if (cpf) {
          existing = existingClientes.find((item) => item.cpf === cpf) || null;
        } else if (cnpj) {
          existing = existingClientes.find((item) => item.cnpj === cnpj) || null;
        } else {
          existing =
            existingClientes.find(
              (item) =>
                normalizeText(item.nome) === nome && !item.cpf && !item.cnpj
            ) || null;
        }

        if (existing) {
          await tx.cliente.update({
            where: { id: existing.id },
            data: { nome, status, tipoCliente, cpf, cnpj },
          });
          clientPlanilhaToReal.set(planilhaId, existing.id);
          result.reused.push(`CLIENTE: ${existing.codigo} | ${nome}`);
          continue;
        }

        const codigo = nextSequentialCode("CLI", usedCodes.clientes);
        const created = await tx.cliente.create({
          data: {
            codigo,
            tipoCliente,
            nome,
            cpf,
            cnpj,
            status,
          },
        });

        existingClientes.push({
          id: created.id,
          codigo: created.codigo,
          nome,
          cpf,
          cnpj,
          status,
        });
        clientPlanilhaToReal.set(planilhaId, created.id);
        result.created.clientes += 1;
      }

      for (const rawItem of data.obras) {
        const planilhaClienteId = normalizeText(rawItem["Cliente_ID"]);
        const clienteId = clientPlanilhaToReal.get(planilhaClienteId);
        const nome = normalizeText(rawItem["Nome da Obra"]);
        const status = toStatusCadastro(rawItem["Status"]);
        const liberadaParaLancamento =
          normalizeText(rawItem["Status_Liberado"]) === "OK";

        if (!clienteId) {
          const failure = `${normalizeText(rawItem["Obra_ID"])} | ${nome} | CLIENTE_ID ${planilhaClienteId}`;
          result.errors.push(`VÍNCULO INVÁLIDO: ${failure}`);
          result.linkageFailures.push(failure);
          continue;
        }

        const existing = existingObras.find(
          (item) => item.clienteId === clienteId && normalizeText(item.nome) === nome
        );

        if (existing) {
          await tx.obra.update({
            where: { id: existing.id },
            data: { nome, status, liberadaParaLancamento },
          });
          result.reused.push(`OBRA: ${existing.codigo} | ${nome}`);
          continue;
        }

        const codigo = nextSequentialCode("OBR", usedCodes.obras);
        const created = await tx.obra.create({
          data: { codigo, clienteId, nome, status, liberadaParaLancamento },
        });

        existingObras.push({
          id: created.id,
          codigo: created.codigo,
          clienteId,
          nome,
          status,
          liberadaParaLancamento,
        });
        result.created.obras += 1;
      }

      return result;
    },
    { timeout: 120000 }
  );

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
