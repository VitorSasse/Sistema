const fs = require("fs");
const path = require("path");

const extractDir = process.argv[2];
const outputPath = process.argv[3];

if (!extractDir || !outputPath) {
  console.error("Uso: node scripts/extract-fdb-workbook.js <diretorio-extraido> <arquivo-saida-json>");
  process.exit(1);
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

function normalizeHeader(value) {
  const raw = stripTags(value)
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const map = new Map([
    ["CLIENTE_ID", "Cliente_ID"],
    ["CLIENTE_NOME", "Cliente_Nome"],
    ["CNPJ/CPF", "CNPJ/CPF"],
    ["STATUS", "Status"],
    ["OBRA_ID", "Obra_ID"],
    ["NOME DA OBRA", "Nome da Obra"],
    ["CENTRO DE CUSTO", "Centro de Custo"],
    ["STATUS_LIBERADO", "Status_Liberado"],
    ["RECURSO_ID", "Recurso_ID"],
    ["TIPO_RECURSO", "Tipo_Recurso"],
    ["DESCRICAO", "Descrição"],
    ["PLACA_OU_TAG", "Placa_ou_Tag"],
    ["CAPCIDADE_M3", "Capcidade_m³"],
    ["VALIDACAO_ID", "Validação_ID"],
    ["MATERIAL_ID", "Material_ID"],
    ["UNIDADE_PADRAO", "Unidade_Padrão"],
    ["TIPO_SERVICO", "Tipo_Serviço"],
    ["FORMA_MEDICAO", "Forma_Medição"],
    ["UNIDADE_FATURAMENTO", "Unidade_Faturamento"],
    ["OBSERVACAO", "Observação"],
    ["VALIDACAO_UNIDADE", "Validação_Unidade"],
    ["VALIDACAO_DUPLICIDADE", "Validação_Duplicidade"],
    ["UNIDADE_FATURADA", "Unidade_Faturada"],
    ["DATA_ADMISSAO", "Data_Admissão"],
    ["NOME", "Nome"],
    ["FUNCAO", "Função"],
    ["DATA_SAIDA", "Data Saída"],
    ["DATA", "Data"],
    ["FICHA", "Ficha"],
    ["OPERADOR/MOTORISTA", "Operador/Motorista"],
    ["QTDE_APONTADA", "Qtde_Apontada"],
    ["UNIDADE_APONTADA", "Unidade_Apontada"],
    ["QTDE_FATURAR", "Qtde_Faturar"],
    ["STATUS-LINHA", "Status-Linha"],
    ["UNIDADE_FATURAR", "Unidade_Faturar"],
    ["CHAVE_DUPLICIDADE", "Chave_Duplicidade"],
    ["QTD_CHAVE", "Qtd_Chave"],
    ["FATOR_CONV", "Fator_Conv"],
    ["QTDE_CALCULADA_FATURAR", "Qtde_Calculada_Faturar"],
    ["STATUS_CONVERSAO", "Status_Conversao"],
    ["STATUS_RECURSO", "Status_Recurso"],
    ["TESTE DATA", "teste data"],
  ]);

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9/_ -]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return map.get(normalized) ?? raw;
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
  if (rowMatches.length === 0) {
    return [];
  }

  const headerCells = [...rowMatches[0][2].matchAll(/<c\b[^>]*r="([^"]+)"[^>]*>[\s\S]*?<\/c>/g)];
  const headers = [];

  for (const cellMatch of headerCells) {
    const columnIndex = getColumnIndex(cellMatch[1]);
    headers[columnIndex] = normalizeHeader(readCellValue(cellMatch[0], sharedStrings));
  }

  const items = [];
  for (const rowMatch of rowMatches.slice(1)) {
    const cells = [...rowMatch[2].matchAll(/<c\b[^>]*r="([^"]+)"[^>]*>[\s\S]*?<\/c>/g)];
    const rowData = {};
    let hasAnyValue = false;

    for (const cellMatch of cells) {
      const columnIndex = getColumnIndex(cellMatch[1]);
      const header = headers[columnIndex];
      if (!header) {
        continue;
      }

      const value = readCellValue(cellMatch[0], sharedStrings);
      if (value !== null && String(value).trim() !== "") {
        hasAnyValue = true;
      }
      rowData[header] = value;
    }

    if (hasAnyValue) {
      items.push(rowData);
    }
  }

  return items;
}

function main() {
  const sharedStrings = parseSharedStrings(path.join(extractDir, "xl", "sharedStrings.xml"));
  const worksheetsDir = path.join(extractDir, "xl", "worksheets");

  const workbook = {
    clientes: parseWorksheet(path.join(worksheetsDir, "sheet1.xml"), sharedStrings),
    obras: parseWorksheet(path.join(worksheetsDir, "sheet2.xml"), sharedStrings),
    equipamentos: parseWorksheet(path.join(worksheetsDir, "sheet3.xml"), sharedStrings),
    materiais: parseWorksheet(path.join(worksheetsDir, "sheet4.xml"), sharedStrings),
    servicos: parseWorksheet(path.join(worksheetsDir, "sheet5.xml"), sharedStrings),
    colaboradores: parseWorksheet(path.join(worksheetsDir, "sheet6.xml"), sharedStrings),
    lancamentos: parseWorksheet(path.join(worksheetsDir, "sheet7.xml"), sharedStrings),
  };

  fs.writeFileSync(outputPath, JSON.stringify(workbook, null, 2), "utf8");
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(workbook).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]),
      ),
      null,
      2,
    ),
  );
}

main();
