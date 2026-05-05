const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { PrismaClient, TipoRecurso, FuncaoColaborador } = require("@prisma/client");

const prisma = new PrismaClient();

const WORKBOOK_PATH =
  process.env.WORKBOOK_JSON_PATH || path.join(process.cwd(), "tmp", "fdb_terrplanagem_2026.json");
const OUTPUT_SQL_PATH =
  process.env.OUTPUT_SQL_PATH || path.join(process.cwd(), "tmp", "carga-lancamentos-diarios-2026.sql");
const OUTPUT_SUMMARY_PATH =
  process.env.OUTPUT_SUMMARY_PATH || path.join(process.cwd(), "tmp", "carga-lancamentos-diarios-2026-summary.json");

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function toSqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function toSqlTimestamp(value) {
  return `TIMESTAMP '${String(value).replace(/'/g, "''")} 00:00:00'`;
}

function toExcelDate(serialValue) {
  const serial = Number(String(serialValue).replace(",", "."));
  if (!Number.isFinite(serial)) {
    throw new Error(`Data inválida na planilha: ${serialValue}`);
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const utc = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
  return utc.toISOString().slice(0, 10);
}

function toDecimal(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const raw = String(value).trim();
  const normalized = raw.includes(",") && raw.includes(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Número inválido na planilha: ${value}`);
  }

  return parsed.toFixed(2);
}

function toDecimalOne(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const raw = String(value).trim();
  const normalized = raw.includes(",") && raw.includes(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Número inválido na planilha: ${value}`);
  }

  return parsed.toFixed(1);
}

function mapUnidadeApontada(value) {
  const normalized = normalizeText(value);
  if (normalized === "H" || normalized === "HORA" || normalized === "HORAS") {
    return "HORA";
  }
  if (normalized === "CARGA" || normalized === "CARGAS") {
    return "CARGA";
  }
  if (normalized === "M3" || normalized === "M³") {
    return "M3";
  }

  throw new Error(`Unidade apontada não suportada: ${value}`);
}

function mapUnidadeFaturada(value) {
  const normalized = normalizeText(value);
  if (normalized === "H" || normalized === "HORA" || normalized === "HORAS") {
    return "HORA";
  }
  if (normalized === "CARGA" || normalized === "CARGAS") {
    return "CARGA";
  }
  if (normalized === "M3" || normalized === "M³") {
    return "M3";
  }
  if (normalized === "DIARIA" || normalized === "DIÁRIA") {
    return "DIARIA";
  }

  throw new Error(`Unidade faturada não suportada: ${value}`);
}

function mapTipoRecurso(value) {
  const normalized = normalizeText(value);
  if (normalized === "CAMINHAO") {
    return TipoRecurso.CAMINHAO;
  }
  if (normalized === "CARRETA") {
    return TipoRecurso.CARRETA;
  }
  if (normalized === "MAQUINA") {
    return TipoRecurso.MAQUINA;
  }
  return TipoRecurso.OUTRO;
}

const EQUIPMENT_ALIAS_MAP = new Map([
  ["MINI V80", "MINI VI080"],
  ["MINI V55 A", "MINI VI055 AMARELA"],
  ["MINI V55 V", "MINI VI055 VERMELHA"],
]);

function inferFuncao(value, tipoRecurso) {
  const normalized = normalizeText(value);
  if (normalized.includes("MOTORISTA")) {
    return FuncaoColaborador.MOTORISTA;
  }
  if (normalized.includes("OPERADOR")) {
    return FuncaoColaborador.OPERADOR;
  }
  if (tipoRecurso === TipoRecurso.CAMINHAO || tipoRecurso === TipoRecurso.CARRETA) {
    return FuncaoColaborador.MOTORISTA;
  }
  return FuncaoColaborador.OPERADOR;
}

function sqlValuesBlock(rows, mapper) {
  return rows.map((row) => `  (${mapper(row)})`).join(",\n");
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function nextSequentialCode(prefix, existingCodes) {
  const numbers = existingCodes
    .map((code) => {
      const match = String(code).match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => Number.isFinite(value));

  let current = numbers.length > 0 ? Math.max(...numbers) : 0;
  return () => {
    current += 1;
    return `${prefix}${String(current).padStart(3, "0")}`;
  };
}

function buildNaturalKey(row) {
  return [
    row.data,
    row.fichaNumero,
    row.obraId ?? "SEM-OBRA",
    row.servicoId,
    row.materialId ?? "SEM-MATERIAL",
    row.equipamentoId,
    row.colaboradorId,
    row.quantidadeApontada,
    row.unidadeApontada,
    row.quantidadeFaturada,
    row.unidadeFaturada,
  ].join("|");
}

async function main() {
  const workbook = JSON.parse(fs.readFileSync(WORKBOOK_PATH, "utf8").replace(/^\uFEFF/, ""));
  const [
    usuario,
    clientesDb,
    obrasDb,
    equipamentosDb,
    materiaisDb,
    servicosDb,
    colaboradoresDb,
    fichasDb,
    lancamentosDb,
  ] = await Promise.all([
    prisma.usuario.findFirst({ select: { id: true, email: true } }),
    prisma.cliente.findMany({ select: { id: true, codigo: true, nome: true, cnpj: true, cpf: true, status: true } }),
    prisma.obra.findMany({ select: { id: true, codigo: true, nome: true, clienteId: true, status: true } }),
    prisma.equipamento.findMany({
      select: { id: true, descricao: true, placaOuTag: true, apelido: true, tipoRecurso: true, status: true },
    }),
    prisma.material.findMany({ select: { id: true, codigoMaterial: true, descricao: true, unidadePadrao: true, status: true } }),
    prisma.servico.findMany({
      select: { id: true, codigo: true, tipoServico: true, formaMedicao: true, unidadeFaturamento: true, status: true },
    }),
    prisma.colaborador.findMany({ select: { id: true, codigo: true, nome: true, funcao: true, status: true } }),
    prisma.ficha.findMany({ select: { id: true, numero: true, data: true, clienteId: true, obraId: true } }),
    prisma.lancamentoDiario.findMany({
      select: {
        id: true,
        data: true,
        ficha: { select: { numero: true } },
        obraId: true,
        servicoId: true,
        materialId: true,
        equipamentoId: true,
        colaboradorId: true,
        quantidadeApontada: true,
        unidadeApontada: true,
        quantidadeFaturada: true,
        unidadeFaturada: true,
      },
    }),
  ]);

  if (!usuario) {
    throw new Error("Nenhum usuário encontrado para atribuir a carga importada.");
  }

  const existingNaturalKeys = new Set(
    lancamentosDb.map((item) =>
      [
        item.data.toISOString().slice(0, 10),
        item.ficha.numero,
        item.obraId ?? "SEM-OBRA",
        item.servicoId,
        item.materialId ?? "SEM-MATERIAL",
        item.equipamentoId,
        item.colaboradorId,
        item.quantidadeApontada.toFixed(2),
        item.unidadeApontada,
        item.quantidadeFaturada.toFixed(2),
        item.unidadeFaturada,
      ].join("|"),
    ),
  );

  const clienteSheetByOldCode = new Map(
    workbook.clientes.map((item) => [
      normalizeText(item.Cliente_ID),
      {
        oldCode: normalizeText(item.Cliente_ID),
        nome: normalizeText(item.Cliente_Nome),
        cnpjCpf: item["CNPJ/CPF"]?.trim() || null,
        status: normalizeText(item.Status || "ATIVO"),
      },
    ]),
  );

  const obraSheetByOldCode = new Map(
    workbook.obras.map((item) => [
      normalizeText(item.Obra_ID),
      {
        oldCode: normalizeText(item.Obra_ID),
        clienteOldCode: normalizeText(item.Cliente_ID),
        nome: normalizeText(item["Nome da Obra"]),
        status: normalizeText(item.Status || "ATIVA"),
      },
    ]),
  );

  const equipamentoSheetByCode = new Map(
    workbook.equipamentos.map((item) => [
      normalizeText(item.Recurso_ID),
      {
        codigoPlanilha: normalizeText(item.Recurso_ID),
        tipoRecurso: mapTipoRecurso(item.Tipo_Recurso),
        descricao: normalizeText(item.Descrição || item.Placa_ou_Tag),
        placaOuTag: normalizeText(item.Placa_ou_Tag || item.Descrição),
        status: normalizeText(item.Status || "ATIVO"),
      },
    ]),
  );

  const servicoSheetByTipo = new Map(
    workbook.servicos.map((item) => [
      normalizeText(item.Tipo_Serviço),
      {
        tipoServico: normalizeText(item.Tipo_Serviço),
        formaMedicao: normalizeText(item.Forma_Medição),
        unidadeFaturamento: normalizeText(item.Unidade_Faturamento),
        status: normalizeText(item.Status || "ATIVO"),
      },
    ]),
  );

  const colaboradorSheet = workbook.colaboradores.map((item) => ({
    nome: normalizeText(item.Nome),
    funcao: normalizeText(item.Função || "OUTRO"),
    status: normalizeText(item.Status || "ATIVO"),
  }));

  const clientsByName = new Map(clientesDb.map((item) => [normalizeText(item.nome), item]));
  const worksByClientAndName = new Map(
    obrasDb.map((item) => {
      const cliente = clientesDb.find((client) => client.id === item.clienteId);
      return [`${normalizeText(cliente?.nome)}|${normalizeText(item.nome)}`, item];
    }),
  );
  const materialsByName = new Map(materiaisDb.map((item) => [normalizeText(item.descricao), item]));
  const servicesByType = new Map(servicosDb.map((item) => [normalizeText(item.tipoServico), item]));
  const equipmentByTag = new Map(equipamentosDb.map((item) => [normalizeText(item.placaOuTag), item]));
  const equipmentByDescription = new Map(equipamentosDb.map((item) => [normalizeText(item.descricao), item]));
  const collaboratorsByName = new Map(colaboradoresDb.map((item) => [normalizeText(item.nome), item]));
  const fichaByNaturalKey = new Map(
    fichasDb.map((item) => [
      `${item.numero}|${item.data.toISOString().slice(0, 10)}`,
      item,
    ]),
  );

  const nextClientCode = nextSequentialCode("CLI-", clientesDb.map((item) => item.codigo));
  const nextWorkCode = nextSequentialCode("OBR-", obrasDb.map((item) => item.codigo));
  const nextServiceCode = nextSequentialCode("SER-", servicosDb.map((item) => item.codigo));
  const nextColabCode = nextSequentialCode("COL-", colaboradoresDb.map((item) => item.codigo));

  const missingClients = [];
  const missingWorks = [];
  const missingServices = [];
  const missingEquipments = [];
  const missingCollaborators = [];
  const generatedFichas = [];
  const generatedLancamentos = [];
  const warnings = [];

  function resolveClientByOldCode(oldCode) {
    const clienteSheet = clienteSheetByOldCode.get(normalizeText(oldCode));
    if (!clienteSheet) {
      throw new Error(`Cliente da planilha não encontrado para código ${oldCode}`);
    }

    let client = clientsByName.get(clienteSheet.nome);
    if (!client) {
      client = {
        id: randomUUID(),
        codigo: nextClientCode(),
        nome: clienteSheet.nome,
        cnpjCpf: clienteSheet.cnpjCpf,
        status: "ATIVO",
      };
      clientsByName.set(clienteSheet.nome, client);
      missingClients.push(client);
    }

    return client;
  }

  function resolveWork(oldCode, obraNameFallback) {
    const obraSheet = obraSheetByOldCode.get(normalizeText(oldCode));
    const obraName = normalizeText(obraSheet?.nome || obraNameFallback);
    const client = resolveClientByOldCode(obraSheet?.clienteOldCode);
    const key = `${normalizeText(client.nome)}|${obraName}`;

    let work = worksByClientAndName.get(key);
    if (!work) {
      work = {
        id: randomUUID(),
        codigo: nextWorkCode(),
        nome: obraName,
        clienteId: client.id,
        status: "ATIVO",
        liberadaParaLancamento: true,
      };
      worksByClientAndName.set(key, work);
      missingWorks.push(work);
    }

    return { work, client };
  }

  function resolveService(rawType) {
    const type = normalizeText(rawType);
    let service = servicesByType.get(type);
    if (!service) {
      const sheet = servicoSheetByTipo.get(type);
      service = {
        id: randomUUID(),
        codigo: nextServiceCode(),
        tipoServico: type,
        formaMedicao: sheet?.formaMedicao || type,
        unidadeFaturamento: sheet?.unidadeFaturamento || "H",
        status: "ATIVO",
      };
      servicesByType.set(type, service);
      missingServices.push(service);
    }

    return service;
  }

  function resolveMaterial(rawName) {
    const normalized = normalizeText(rawName);
    if (!normalized) {
      return null;
    }

    const material = materialsByName.get(normalized);
    if (!material) {
      warnings.push(`Material não encontrado e mantido como NULL: ${normalized}`);
      return null;
    }

    return material;
  }

  function resolveEquipment(row) {
    const planilhaCode = normalizeText(row.Recurso_ID);
    const planilhaTag = normalizeText(row.Placa_ou_Tag);
    const sheetEquip = equipamentoSheetByCode.get(planilhaCode);
    const aliases = [
      planilhaTag,
      EQUIPMENT_ALIAS_MAP.get(planilhaTag) ?? null,
      sheetEquip?.placaOuTag,
      sheetEquip?.descricao,
    ].filter(Boolean);

    for (const alias of aliases) {
      const exactTag = equipmentByTag.get(alias);
      if (exactTag) {
        return exactTag;
      }
      const exactDescription = equipmentByDescription.get(alias);
      if (exactDescription) {
        return exactDescription;
      }
    }

    const created = {
      id: randomUUID(),
      descricao: sheetEquip?.descricao || planilhaTag || planilhaCode,
      placaOuTag: sheetEquip?.placaOuTag || planilhaTag || planilhaCode,
      apelido: planilhaCode || null,
      tipoRecurso: sheetEquip?.tipoRecurso || mapTipoRecurso(row.Tipo_Recurso),
      status: "ATIVO",
    };
    equipmentByTag.set(normalizeText(created.placaOuTag), created);
    equipmentByDescription.set(normalizeText(created.descricao), created);
    missingEquipments.push(created);
    return created;
  }

  function resolveCollaborator(row, equipment) {
    const rawName = normalizeText(row["Operador/Motorista"]);
    if (!rawName) {
      throw new Error(`Linha sem operador/motorista para ficha ${row.Ficha}`);
    }

    const exact = collaboratorsByName.get(rawName);
    if (exact) {
      return exact;
    }

    const partial = colaboradoresDb.find((item) => {
      const normalized = normalizeText(item.nome);
      return normalized.includes(rawName) || rawName.includes(normalized);
    });
    if (partial) {
      collaboratorsByName.set(rawName, partial);
      return partial;
    }

    const fromSheet = colaboradorSheet.find((item) => {
      return item.nome.includes(rawName) || rawName.includes(item.nome);
    });

    const created = {
      id: randomUUID(),
      codigo: nextColabCode(),
      nome: fromSheet?.nome || rawName,
      funcao: inferFuncao(fromSheet?.funcao || "", equipment.tipoRecurso),
      status: "ATIVO",
    };
    collaboratorsByName.set(rawName, created);
    missingCollaborators.push(created);
    return created;
  }

  for (const rawRow of workbook.lancamentos) {
    const row = Object.fromEntries(
      Object.entries(rawRow).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
    );

    if (!row.Data || !row.Ficha || !row.Obra_ID || !row.Tipo_Serviço || !row.Recurso_ID) {
      continue;
    }

    const data = toExcelDate(row.Data);
    const { work, client } = resolveWork(row.Obra_ID, row["Nome da Obra"]);
    const service = resolveService(row.Tipo_Serviço);
    const material = resolveMaterial(row.Material_ID);
    const equipment = resolveEquipment(row);
    const collaborator = resolveCollaborator(row, equipment);

    const quantidadeApontada = toDecimal(row.Qtde_Apontada);
    const quantidadeFaturada = toDecimal(row.Qtde_Faturar || row.Qtde_Apontada || "0");
    const unidadeApontada = mapUnidadeApontada(row.Unidade_Apontada);
    const unidadeFaturada = mapUnidadeFaturada(row.Unidade_Faturar || row.Unidade_Apontada);
    const observacoes = [
      row.Observação ? normalizeText(row.Observação) : null,
      row["Status-Linha"] ? `STATUS_LINHA=${normalizeText(row["Status-Linha"])}` : null,
      row.Status_Conversao ? `STATUS_CONVERSAO=${normalizeText(row.Status_Conversao)}` : null,
      row.Status_Recurso ? `STATUS_RECURSO=${normalizeText(row.Status_Recurso)}` : null,
    ].filter(Boolean);

    const fichaKey = `${String(row.Ficha)}|${data}`;
    let ficha = fichaByNaturalKey.get(fichaKey);
    if (!ficha) {
      ficha = {
        id: randomUUID(),
        numero: String(row.Ficha),
        data,
        clienteId: client.id,
        obraId: work.id,
        observacao: "IMPORTADO DA PLANILHA FDB_TERRAPLENAGEM_2026",
      };
      fichaByNaturalKey.set(fichaKey, ficha);
      generatedFichas.push(ficha);
    } else if ((ficha.clienteId && ficha.clienteId !== client.id) || (ficha.obraId && ficha.obraId !== work.id)) {
      warnings.push(`Ficha ${ficha.numero} em ${data} reaproveitada com cliente/obra diferentes no cabeçalho da ficha.`);
    }

    const lancamento = {
      id: randomUUID(),
      fichaId: ficha.id,
      fichaNumero: ficha.numero,
      data,
      clienteId: client.id,
      obraId: work.id,
      servicoId: service.id,
      materialId: material?.id ?? null,
      equipamentoId: equipment.id,
      colaboradorId: collaborator.id,
      quantidadeApontada,
      unidadeApontada,
      quantidadeFaturada,
      unidadeFaturada,
      horimetroInformado: null,
      kmInformado: null,
      observacao: observacoes.length > 0 ? observacoes.join(" | ") : null,
      statusValidacao:
        normalizeText(row["Status-Linha"]) === "OK" && normalizeText(row.Status_Recurso || "OK") === "OK"
          ? "VALIDO"
          : "DIVERGENTE",
      origem: "IMPORTADO",
      criadoPorId: usuario.id,
      atualizadoPorId: null,
    };

    const naturalKey = buildNaturalKey(lancamento);
    if (existingNaturalKeys.has(naturalKey)) {
      continue;
    }
    existingNaturalKeys.add(naturalKey);
    generatedLancamentos.push(lancamento);
  }

  const sqlParts = [];
  sqlParts.push("-- INÍCIO CARGA LANÇAMENTOS 2026");
  sqlParts.push(`-- GERADO EM ${new Date().toISOString()}`);
  sqlParts.push("");

  if (missingClients.length > 0) {
    sqlParts.push("-- BLOCO CLIENTES AUSENTES");
    sqlParts.push(
      `INSERT INTO "Cliente" ("id", "codigo", "tipoCliente", "nome", "cnpj", "cpf", "status", "createdAt", "updatedAt")`,
    );
    sqlParts.push("VALUES");
    sqlParts.push(
      sqlValuesBlock(
        missingClients,
        (row) =>
          [
            toSqlString(row.id),
            toSqlString(row.codigo),
            toSqlString(row.cnpjCpf && row.cnpjCpf.length > 14 ? "CNPJ" : "CPF"),
            toSqlString(row.nome),
            row.cnpjCpf && row.cnpjCpf.length > 14 ? toSqlString(row.cnpjCpf) : "NULL",
            row.cnpjCpf && row.cnpjCpf.length <= 14 ? toSqlString(row.cnpjCpf) : "NULL",
            toSqlString(row.status),
            "CURRENT_TIMESTAMP",
            "CURRENT_TIMESTAMP",
          ].join(", "),
      ) + ";",
    );
    sqlParts.push("");
  }

  if (missingWorks.length > 0) {
    sqlParts.push("-- BLOCO OBRAS AUSENTES");
    sqlParts.push(
      `INSERT INTO "Obra" ("id", "codigo", "clienteId", "nome", "status", "liberadaParaLancamento", "createdAt", "updatedAt")`,
    );
    sqlParts.push("VALUES");
    sqlParts.push(
      sqlValuesBlock(
        missingWorks,
        (row) =>
          [
            toSqlString(row.id),
            toSqlString(row.codigo),
            toSqlString(row.clienteId),
            toSqlString(row.nome),
            toSqlString(row.status),
            "TRUE",
            "CURRENT_TIMESTAMP",
            "CURRENT_TIMESTAMP",
          ].join(", "),
      ) + ";",
    );
    sqlParts.push("");
  }

  if (missingServices.length > 0) {
    sqlParts.push("-- BLOCO SERVIÇOS AUSENTES");
    sqlParts.push(
      `INSERT INTO "Servico" ("id", "codigo", "tipoServico", "formaMedicao", "unidadeApontamento", "unidadeFaturamento", "exigeMaterial", "ativoParaMedicao", "status", "createdAt", "updatedAt")`,
    );
    sqlParts.push("VALUES");
    sqlParts.push(
      sqlValuesBlock(
        missingServices,
        (row) =>
          [
            toSqlString(row.id),
            toSqlString(row.codigo),
            toSqlString(row.tipoServico),
            toSqlString(row.formaMedicao),
            "NULL",
            toSqlString(row.unidadeFaturamento),
            "FALSE",
            "TRUE",
            toSqlString(row.status),
            "CURRENT_TIMESTAMP",
            "CURRENT_TIMESTAMP",
          ].join(", "),
      ) + ";",
    );
    sqlParts.push("");
  }

  if (missingEquipments.length > 0) {
    sqlParts.push("-- BLOCO EQUIPAMENTOS AUSENTES");
    sqlParts.push(
      `INSERT INTO "Equipamento" ("id", "tipoRecurso", "tipoControle", "descricao", "placaOuTag", "apelido", "status", "statusOperacional", "createdAt", "updatedAt")`,
    );
    sqlParts.push("VALUES");
    sqlParts.push(
      sqlValuesBlock(
        missingEquipments,
        (row) =>
          [
            toSqlString(row.id),
            toSqlString(row.tipoRecurso),
            toSqlString(row.tipoRecurso === "CAMINHAO" || row.tipoRecurso === "CARRETA" ? "KM" : "HORIMETRO"),
            toSqlString(row.descricao),
            toSqlString(row.placaOuTag),
            row.apelido ? toSqlString(row.apelido) : "NULL",
            toSqlString(row.status),
            toSqlString("ATIVO"),
            "CURRENT_TIMESTAMP",
            "CURRENT_TIMESTAMP",
          ].join(", "),
      ) + ";",
    );
    sqlParts.push("");
  }

  if (missingCollaborators.length > 0) {
    sqlParts.push("-- BLOCO COLABORADORES AUSENTES");
    sqlParts.push(
      `INSERT INTO "Colaborador" ("id", "codigo", "nome", "funcao", "status", "createdAt", "updatedAt")`,
    );
    sqlParts.push("VALUES");
    sqlParts.push(
      sqlValuesBlock(
        missingCollaborators,
        (row) =>
          [
            toSqlString(row.id),
            toSqlString(row.codigo),
            toSqlString(row.nome),
            toSqlString(row.funcao),
            toSqlString(row.status),
            "CURRENT_TIMESTAMP",
            "CURRENT_TIMESTAMP",
          ].join(", "),
      ) + ";",
    );
    sqlParts.push("");
  }

  if (generatedFichas.length > 0) {
    sqlParts.push("-- BLOCO FICHAS");
    sqlParts.push(
      `INSERT INTO "Ficha" ("id", "numero", "data", "clienteId", "obraId", "observacao", "origem", "criadoPorId", "createdAt", "updatedAt")`,
    );
    sqlParts.push("VALUES");
    sqlParts.push(
      sqlValuesBlock(
        generatedFichas,
        (row) =>
          [
            toSqlString(row.id),
            toSqlString(row.numero),
            toSqlTimestamp(row.data),
            toSqlString(row.clienteId),
            toSqlString(row.obraId),
            toSqlString(row.observacao),
            toSqlString("IMPORTADO"),
            toSqlString(usuario.id),
            "CURRENT_TIMESTAMP",
            "CURRENT_TIMESTAMP",
          ].join(", "),
      ) + "\nON CONFLICT (\"numero\", \"data\") DO NOTHING;",
    );
    sqlParts.push("");
  }

  const lancamentoBlocks = chunk(generatedLancamentos, 1000);
  lancamentoBlocks.forEach((block, index) => {
    sqlParts.push(`-- BLOCO ${index + 1}`);
    sqlParts.push(
      `INSERT INTO "LancamentoDiario" ("id", "fichaId", "data", "clienteId", "obraId", "servicoId", "materialId", "equipamentoId", "colaboradorId", "quantidadeApontada", "unidadeApontada", "quantidadeFaturada", "unidadeFaturada", "horimetroInformado", "kmInformado", "observacao", "statusValidacao", "origem", "precoAplicadoId", "criadoPorId", "atualizadoPorId", "createdAt", "updatedAt", "deletedAt")`,
    );
    sqlParts.push("VALUES");
    sqlParts.push(
      sqlValuesBlock(
        block,
        (row) =>
          [
            toSqlString(row.id),
            toSqlString(row.fichaId),
            toSqlTimestamp(row.data),
            toSqlString(row.clienteId),
            toSqlString(row.obraId),
            toSqlString(row.servicoId),
            row.materialId ? toSqlString(row.materialId) : "NULL",
            toSqlString(row.equipamentoId),
            toSqlString(row.colaboradorId),
            row.quantidadeApontada,
            `${toSqlString(row.unidadeApontada)}::"UnidadeApontada"`,
            row.quantidadeFaturada,
            `${toSqlString(row.unidadeFaturada)}::"UnidadeFaturada"`,
            "NULL",
            "NULL",
            row.observacao ? toSqlString(row.observacao) : "NULL",
            `${toSqlString(row.statusValidacao)}::"StatusLancamento"`,
            `${toSqlString(row.origem)}::"OrigemLancamento"`,
            "NULL",
            toSqlString(row.criadoPorId),
            "NULL",
            "CURRENT_TIMESTAMP",
            "CURRENT_TIMESTAMP",
            "NULL",
          ].join(", "),
      ),
    );
    sqlParts.push('ON CONFLICT ("id") DO NOTHING;');
    sqlParts.push("");
  });

  sqlParts.push("-- FIM CARGA");
  fs.writeFileSync(OUTPUT_SQL_PATH, `${sqlParts.join("\n")}\n`, "utf8");

  const summary = {
    usuario: usuario.email,
    missingClients: missingClients.length,
    missingWorks: missingWorks.length,
    missingServices: missingServices.length,
    missingEquipments: missingEquipments.length,
    missingCollaborators: missingCollaborators.length,
    generatedFichas: generatedFichas.length,
    generatedLancamentos: generatedLancamentos.length,
    warnings,
  };
  fs.writeFileSync(OUTPUT_SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
