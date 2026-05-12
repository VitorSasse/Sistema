const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { PrismaClient, OrigemLeituraEquipamento } = require("@prisma/client");

const prisma = new PrismaClient();

const EXTRACT_DIR =
  process.env.EXTRACT_DIR || path.join(process.cwd(), "tmp", "xlsx_agenda_extract");
const SHEET_PATH = path.join(EXTRACT_DIR, "xl", "worksheets", "sheet6.xml");
const SHARED_STRINGS_PATH = path.join(EXTRACT_DIR, "xl", "sharedStrings.xml");
const SOURCE_NAME = process.env.SOURCE_NAME || "AGENDA_FROTA_2026_REV03 (3).xlsx";
const OUTPUT_SUMMARY_PATH =
  process.env.OUTPUT_SUMMARY_PATH ||
  path.join(process.cwd(), "tmp", "import-controle-horimetro-summary.json");
const DRY_RUN = process.env.DRY_RUN === "1";

const CODE_ALIAS_MAP = new Map([
  ["ESC150I", "ESC150I"],
  ["ESC150II", "ESC150II"],
  ["ESC140", "ESC140"],
  ["ESC225", "ESC225"],
  ["VIO80", "MINIVI080"],
  ["VIO55V", "MINIVI055VERMELHA"],
  ["VIO55A", "MINIVI055AMARELA"],
  ["CAMRYU1", "RYU1D26"],
  ["CAMRYU5", "RYU5G46"],
  ["CAMRXQ4", "RXQ4A30"],
  ["CARAUQ6", "AUQ6157"],
  ["CAMMMI4", "MMI4C82"],
  ["CAMRXQ3", "RXQ3J10"],
  ["RETRO", "RETRO"],
  ["PRANCHA", "PRANCHA"],
  ["MINICAR", "MINICAR"],
]);

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripTags(value) {
  return decodeXml(String(value ?? "").replace(/<[^>]+>/g, ""));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .trim();
}

function getColumnIndex(cellRef) {
  const letters = String(cellRef).match(/[A-Z]+/)?.[0] ?? "";
  let index = 0;

  for (const char of letters) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }

  return index - 1;
}

function parseSharedStrings(filePath) {
  const xml = fs.readFileSync(filePath, "utf8");
  const items = [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)];

  return items.map((match) => {
    const textParts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]);
    return stripTags(textParts.join(""));
  });
}

function readCellValue(cellXml, sharedStrings) {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1] ?? "";
  const inlineText = cellXml.match(/<is\b[^>]*>([\s\S]*?)<\/is>/)?.[1];
  if (inlineText) {
    return stripTags(inlineText);
  }

  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
  if (!valueMatch) {
    return null;
  }

  const rawValue = decodeXml(valueMatch[1]);
  if (type === "s") {
    return sharedStrings[Number(rawValue)] ?? null;
  }

  return rawValue;
}

function parseWorksheet(filePath, sharedStrings) {
  const xml = fs.readFileSync(filePath, "utf8");
  const rowMatches = [...xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
  const rows = [];
  const headers = {};

  for (const rowMatch of rowMatches) {
    const rowNumber = Number(rowMatch[1]);
    const cells = [...rowMatch[2].matchAll(/<c\b[^>]*r="([^"]+)"[^>]*>[\s\S]*?<\/c>/g)];
    const rowData = { _row: rowNumber };

    for (const cellMatch of cells) {
      const columnIndex = getColumnIndex(cellMatch[1]);
      const value = readCellValue(cellMatch[0], sharedStrings);

      if (rowNumber === 1) {
        headers[columnIndex] = value;
      } else {
        rowData[headers[columnIndex] ?? columnIndex] = value;
      }
    }

    if (rowNumber > 1) {
      rows.push(rowData);
    }
  }

  return rows;
}

function excelSerialToIso(serialValue) {
  const serial = Number(String(serialValue).replace(",", "."));
  if (!Number.isFinite(serial)) {
    throw new Error(`Data invalida na planilha: ${serialValue}`);
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const utc = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
  return utc.toISOString().slice(0, 10);
}

function parseNullableNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(decimals));
}

function buildNaturalKey(equipamentoId, dataLeitura, horimetroValor, kmValor) {
  return [
    equipamentoId,
    dataLeitura,
    horimetroValor == null ? "NULL" : horimetroValor.toFixed(2),
    kmValor == null ? "NULL" : kmValor.toFixed(1),
  ].join("|");
}

function createObservation(row) {
  const parts = [`IMPORTADO DA PLANILHA ${SOURCE_NAME}`];

  if (row["Cod_maquina"]) parts.push(`COD: ${row["Cod_maquina"]}`);
  if (row["Máquina / Caminhão"]) parts.push(`RECURSO: ${row["Máquina / Caminhão"]}`);
  if (row.Operador) parts.push(`OPERADOR: ${row.Operador}`);
  if (row["Horas/dia"] && Number(row["Horas/dia"]) > 0) parts.push(`HORAS/DIA: ${row["Horas/dia"]}`);
  if (row["Km/dia"] && Number(row["Km/dia"]) > 0) parts.push(`KM/DIA: ${row["Km/dia"]}`);
  if (row["Observações"]) parts.push(`OBS: ${row["Observações"]}`);

  return parts.join(" | ");
}

async function loadEquipamentosMap() {
  const equipamentos = await prisma.equipamento.findMany({
    select: {
      id: true,
      descricao: true,
      placaOuTag: true,
      apelido: true,
      tipoRecurso: true,
      status: true,
    },
  });

  const map = new Map();

  for (const equipamento of equipamentos) {
    const keys = [
      equipamento.placaOuTag,
      equipamento.apelido,
      equipamento.descricao,
      `${equipamento.descricao}${equipamento.placaOuTag ?? ""}`,
    ];

    for (const key of keys) {
      if (!key) continue;
      map.set(normalizeText(key), equipamento);
    }
  }

  return map;
}

async function main() {
  const sharedStrings = parseSharedStrings(SHARED_STRINGS_PATH);
  const rows = parseWorksheet(SHEET_PATH, sharedStrings).filter((row) => row.Data && row.Cod_maquina);
  const usuario = await prisma.usuario.findFirst({
    where: { email: "admin@gestaofichas.local" },
    select: { id: true, email: true },
  });

  if (!usuario) {
    throw new Error("Usuario admin@gestaofichas.local nao encontrado para atribuir a importacao.");
  }

  const equipamentosMap = await loadEquipamentosMap();
  const leiturasExistentes = await prisma.leituraEquipamento.findMany({
    select: {
      equipamentoId: true,
      dataLeitura: true,
      horimetroValor: true,
      kmValor: true,
    },
  });

  const naturalKeysExistentes = new Set(
    leiturasExistentes.map((item) =>
      buildNaturalKey(
        item.equipamentoId,
        item.dataLeitura.toISOString().slice(0, 10),
        item.horimetroValor == null ? null : Number(item.horimetroValor),
        item.kmValor == null ? null : Number(item.kmValor),
      ),
    ),
  );

  const unresolved = [];
  const duplicates = [];
  const prepared = [];
  const touchedEquipmentIds = new Set();

  for (const row of rows) {
    const normalizedCode = normalizeText(row.Cod_maquina);
    const aliasKey = CODE_ALIAS_MAP.get(normalizedCode) ?? normalizedCode;
    const equipamento =
      equipamentosMap.get(aliasKey) ||
      equipamentosMap.get(normalizeText(row["Máquina / Caminhão"])) ||
      null;

    if (!equipamento) {
      unresolved.push({
        row: row._row,
        codigo: row.Cod_maquina,
        nome: row["Máquina / Caminhão"] ?? null,
      });
      continue;
    }

    const dataLeitura = excelSerialToIso(row.Data);
    const horimetroValor = parseNullableNumber(row["Horímetro atual"], 2);
    const kmValor = parseNullableNumber(row["Km atual"], 1);

    if (horimetroValor == null && kmValor == null) {
      continue;
    }

    const naturalKey = buildNaturalKey(equipamento.id, dataLeitura, horimetroValor, kmValor);

    if (naturalKeysExistentes.has(naturalKey)) {
      duplicates.push({
        row: row._row,
        codigo: row.Cod_maquina,
        dataLeitura,
      });
      continue;
    }

    naturalKeysExistentes.add(naturalKey);
    touchedEquipmentIds.add(equipamento.id);

    prepared.push({
      id: randomUUID(),
      equipamentoId: equipamento.id,
      dataLeitura: new Date(`${dataLeitura}T00:00:00.000Z`),
      horimetroValor,
      kmValor,
      origem: OrigemLeituraEquipamento.IMPORTADO,
      usuarioId: usuario.id,
      observacao: createObservation(row),
      rowNumber: row._row,
      codigoPlanilha: row.Cod_maquina,
      equipamentoDescricao: equipamento.descricao,
      equipamentoPlacaOuTag: equipamento.placaOuTag,
      statusEquipamento: equipamento.status,
    });
  }

  const summary = {
    sourceName: SOURCE_NAME,
    usuario: usuario.email,
    totalRows: rows.length,
    unresolvedCount: unresolved.length,
    duplicateCount: duplicates.length,
    preparedCount: prepared.length,
    touchedEquipments: touchedEquipmentIds.size,
    unresolved,
    duplicates: duplicates.slice(0, 50),
  };

  if (unresolved.length > 0) {
    fs.writeFileSync(OUTPUT_SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");
    throw new Error(
      `Existem ${unresolved.length} codigos da planilha sem conciliacao com equipamentos cadastrados.`,
    );
  }

  if (!DRY_RUN && prepared.length > 0) {
    for (let index = 0; index < prepared.length; index += 200) {
      const chunk = prepared.slice(index, index + 200);

      await prisma.leituraEquipamento.createMany({
        data: chunk.map((item) => ({
          id: item.id,
          equipamentoId: item.equipamentoId,
          dataLeitura: item.dataLeitura,
          horimetroValor: item.horimetroValor,
          kmValor: item.kmValor,
          origem: item.origem,
          usuarioId: item.usuarioId,
          observacao: item.observacao,
        })),
      });
    }

    for (const equipamentoId of touchedEquipmentIds) {
      const ultimaLeitura = await prisma.leituraEquipamento.findFirst({
        where: { equipamentoId },
        orderBy: [{ dataLeitura: "desc" }, { createdAt: "desc" }],
        select: {
          horimetroValor: true,
          kmValor: true,
        },
      });

      await prisma.equipamento.update({
        where: { id: equipamentoId },
        data: {
          horimetroAtual: ultimaLeitura?.horimetroValor ?? null,
          kmAtual: ultimaLeitura?.kmValor ?? null,
        },
      });
    }
  }

  fs.writeFileSync(OUTPUT_SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .then(async () => {
    await prisma.$disconnect();
  });
