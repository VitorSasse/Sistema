const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SOURCE_PATH =
  process.env.SOURCE_PATH ||
  findSourceWorkbook() ||
  path.join(process.cwd(), "tmp", "CONTROLE REVISAO.xlsx");
const OUTPUT_SUMMARY_PATH =
  process.env.OUTPUT_SUMMARY_PATH ||
  path.join(process.cwd(), "tmp", "import-controle-revisao-summary.json");
const DRY_RUN = process.env.DRY_RUN === "1";

const CODE_ALIAS_MAP = new Map([
  ["VIO55A", "MINIVI055AMARELA"],
  ["VIO55V", "MINIVI055VERMELHA"],
  ["VIO80", "MINIVI080"],
  ["ESC140", "ESC140"],
  ["ESC150I", "ESC150I"],
  ["ESC150II", "ESC150II"],
  ["BOBCAT", "MINICAR"],
  ["ESC225", "ESC225"],
  ["RETROESCAVADEIRA", "RETRO"],
  ["RYU1D26", "RYU1D26"],
  ["RYU5G46", "RYU5G46"],
  ["AJC3804", "AJC3804"],
  ["RXQ4A30", "RXQ4A30"],
  ["RXQ3J10", "RXQ3J10"],
  ["MGS9A33", "MGS9A33"],
  ["AUQ6157", "AUQ6157"],
  ["MMI4C82", "MMI4C82"]
]);

function findSourceWorkbook() {
  const desktopDir = path.join(process.env.USERPROFILE || "", "Desktop");
  if (!fs.existsSync(desktopDir)) {
    return null;
  }

  const match = fs
    .readdirSync(desktopDir)
    .find((name) => normalizeText(name).startsWith("CONTROLEREVISAO") && name.toLowerCase().endsWith(".xlsx"));

  return match ? path.join(desktopDir, match) : null;
}

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

function unzipWorkbookEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = Buffer.from("504b0304", "hex");
  const entries = new Map();
  let offset = 0;

  while (offset < buffer.length) {
    const nextSignature = buffer.indexOf(signature, offset);
    if (nextSignature === -1) {
      break;
    }

    offset = nextSignature;
    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);
    const fileName = buffer.toString("utf8", offset + 30, offset + 30 + fileNameLength);
    const dataStart = offset + 30 + fileNameLength + extraFieldLength;
    const dataEnd = dataStart + compressedSize;
    const fileData = buffer.slice(dataStart, dataEnd);

    if (compressionMethod === 0) {
      entries.set(fileName, fileData);
    } else if (compressionMethod === 8) {
      entries.set(fileName, require("zlib").inflateRawSync(fileData));
    }

    offset = dataEnd;
  }

  return entries;
}

function parseSharedStrings(xml) {
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

function parseWorksheet(xml, sharedStrings) {
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

function parseNextValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferCriteria(equipamento) {
  return equipamento.tipoRecurso === "CAMINHAO" ? "KM" : "HORIMETRO";
}

function buildEquipmentMap(equipamentos) {
  const map = new Map();

  for (const equipamento of equipamentos) {
    const keys = [
      equipamento.placaOuTag,
      equipamento.apelido,
      equipamento.descricao,
      `${equipamento.descricao}${equipamento.placaOuTag ?? ""}`
    ];

    for (const key of keys) {
      if (!key) continue;
      map.set(normalizeText(key), equipamento);
    }
  }

  return map;
}

async function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Planilha nao encontrada: ${SOURCE_PATH}`);
  }

  const entries = unzipWorkbookEntries(SOURCE_PATH);
  const sharedStringsXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sheetXml = entries.get("xl/worksheets/sheet1.xml")?.toString("utf8") ?? "";
  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const rows = parseWorksheet(sheetXml, sharedStrings).filter(
    (row) => row.EQUIPAMENTO && row["PROXIMO VENCIMENTO"]
  );

  const equipamentos = await prisma.equipamento.findMany({
    select: {
      id: true,
      descricao: true,
      placaOuTag: true,
      apelido: true,
      status: true,
      tipoRecurso: true,
      tipoControle: true,
      horimetroAtual: true,
      kmAtual: true,
      planosManutencao: {
        where: { status: "ATIVO" },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          titulo: true,
          tipoManutencao: true,
          criterioControle: true,
          periodicidadeValor: true,
          toleranciaValor: true,
          ultimaExecucaoEm: true,
          ultimaLeituraHorimetro: true,
          ultimaLeituraKm: true,
          proximaExecucaoEm: true,
          proximoHorimetro: true,
          proximoKm: true,
          observacao: true
        }
      }
    }
  });

  const equipamentoMap = buildEquipmentMap(equipamentos);
  const unresolved = [];
  const prepared = [];
  const updates = [];
  const creates = [];

  for (const row of rows) {
    const rawCode = String(row.EQUIPAMENTO ?? "").trim();
    const aliasKey = CODE_ALIAS_MAP.get(normalizeText(rawCode)) ?? normalizeText(rawCode);
    const equipamento =
      equipamentoMap.get(aliasKey) ||
      equipamentoMap.get(normalizeText(rawCode)) ||
      null;

    const nextValue = parseNextValue(row["PROXIMO VENCIMENTO"]);

    if (!equipamento || nextValue == null) {
      unresolved.push({
        row: row._row,
        equipamento: rawCode,
        proximoVencimento: row["PROXIMO VENCIMENTO"] ?? null
      });
      continue;
    }

    const criterioControle = inferCriteria(equipamento);
    const matchingPlan =
      equipamento.planosManutencao.find((plan) => plan.criterioControle === criterioControle) ||
      equipamento.planosManutencao[0] ||
      null;

    const currentReading =
      criterioControle === "HORIMETRO"
        ? toNumberOrNull(equipamento.horimetroAtual)
        : toNumberOrNull(equipamento.kmAtual);
    const currentStoredReading =
      criterioControle === "HORIMETRO"
        ? toNumberOrNull(matchingPlan?.ultimaLeituraHorimetro)
        : toNumberOrNull(matchingPlan?.ultimaLeituraKm);
    const baseReading = currentReading ?? currentStoredReading;
    const periodicidadeValor =
      baseReading != null && nextValue > baseReading
        ? Math.max(1, Math.round(nextValue - baseReading))
        : matchingPlan?.periodicidadeValor ??
          (criterioControle === "HORIMETRO" ? 250 : 10000);
    const toleranciaValor =
      matchingPlan?.toleranciaValor ?? Math.max(1, Math.ceil(periodicidadeValor * 0.1));

    const commonData = {
      titulo: matchingPlan?.titulo || "REVISÃO",
      tipoManutencao: matchingPlan?.tipoManutencao || "REVISÃO",
      criterioControle,
      periodicidadeValor,
      toleranciaValor,
      ultimaExecucaoEm: matchingPlan?.ultimaExecucaoEm ?? null,
      ultimaLeituraHorimetro:
        criterioControle === "HORIMETRO" ? (baseReading != null ? baseReading : null) : null,
      ultimaLeituraKm:
        criterioControle === "KM" ? (baseReading != null ? baseReading : null) : null,
      proximaExecucaoEm: null,
      proximoHorimetro: criterioControle === "HORIMETRO" ? nextValue : null,
      proximoKm: criterioControle === "KM" ? nextValue : null,
      status: "ATIVO",
      observacao: `IMPORTADO DA PLANILHA ${path.basename(SOURCE_PATH)} | ORIGEM: ${rawCode}`
    };

    prepared.push({
      row: row._row,
      equipamento: rawCode,
      equipamentoId: equipamento.id,
      descricao: equipamento.descricao,
      placaOuTag: equipamento.placaOuTag,
      statusEquipamento: equipamento.status,
      criterioControle,
      baseReading,
      nextValue,
      periodicidadeValor,
      action: matchingPlan ? "update" : "create"
    });

    if (matchingPlan) {
      updates.push({
        id: matchingPlan.id,
        data: commonData
      });
    } else {
      creates.push({
        equipamentoId: equipamento.id,
        data: commonData
      });
    }
  }

  if (!DRY_RUN) {
    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        await tx.planoManutencao.update({
          where: { id: item.id },
          data: item.data
        });
      }

      for (const item of creates) {
        await tx.planoManutencao.create({
          data: {
            equipamentoId: item.equipamentoId,
            ...item.data
          }
        });
      }
    });
  }

  const summary = {
    source: SOURCE_PATH,
    dryRun: DRY_RUN,
    totalRows: rows.length,
    preparedCount: prepared.length,
    updatedCount: updates.length,
    createdCount: creates.length,
    unresolvedCount: unresolved.length,
    prepared,
    unresolved
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
