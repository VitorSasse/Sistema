import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [, , command, ...args] = process.argv;
const tagPattern = /^v\d+\.\d+\.\d+$/;

function runGit(gitArgs, options = {}) {
  const output = execFileSync("git", gitArgs, {
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"]
  });

  return typeof output === "string" ? output.trim() : "";
}

function exitWithHelp(message) {
  if (message) {
    console.error(`\n${message}\n`);
  }

  console.log(`Uso:
  npm run backup:code
  npm run version:create -- v1.1.0 "Descricao da versao"
  npm run rollback:code -- v1.0.0
  npm run changelog:update -- v1.1.0 "Alteracao realizada"
`);
  process.exit(1);
}

function ensureValidTag(tag) {
  if (!tagPattern.test(tag)) {
    exitWithHelp(`Tag invalida: ${tag}. Use o padrao v1.0.0.`);
  }
}

function currentVersion() {
  if (!existsSync("VERSION.md")) {
    return "v1.0.0";
  }

  const content = readFileSync("VERSION.md", "utf8");
  const match = content.match(/Versao atual:\s*(v\d+\.\d+\.\d+)/);
  return match?.[1] ?? "v1.0.0";
}

function ensureCleanWorkingTree() {
  const status = runGit(["status", "--porcelain"]);
  if (status) {
    console.error(status);
    process.exitCode = 1;
    throw new Error("Existem alteracoes nao commitadas. Faca commit antes de criar tag.");
  }
}

function tagExists(tag) {
  try {
    runGit(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function createTag(tag, description) {
  ensureValidTag(tag);
  ensureCleanWorkingTree();

  if (tagExists(tag)) {
    throw new Error(`A tag ${tag} ja existe.`);
  }

  runGit(["tag", "-a", tag, "-m", description || `Versao estavel ${tag}`], { stdio: "inherit" });
  console.log(`Tag criada: ${tag}`);
  console.log(`Para publicar a tag: git push origin ${tag}`);
}

function backupCurrentCode() {
  const version = currentVersion();
  createTag(version, `Backup de codigo ${version}`);
}

function createVersion() {
  const tag = args[0] ?? currentVersion();
  const description = args.slice(1).join(" ");
  createTag(tag, description || `Versao estavel ${tag}`);
}

function rollbackCode() {
  const tag = args[0];
  if (!tag) {
    exitWithHelp("Informe a tag para rollback. Exemplo: npm run rollback:code -- v1.0.0");
  }

  ensureValidTag(tag);
  runGit(["fetch", "--tags"], { stdio: "inherit" });

  if (!tagExists(tag)) {
    throw new Error(`Tag ${tag} nao encontrada localmente.`);
  }

  console.log(`Fazendo checkout da tag ${tag}. O repositorio ficara em modo detached HEAD.`);
  runGit(["switch", "--detach", tag], { stdio: "inherit" });
  console.log("Rode: npm install && npm run build");
}

function updateChangelog() {
  const tag = args[0] ?? currentVersion();
  const description = args.slice(1).join(" ").trim();
  ensureValidTag(tag);

  if (!description) {
    exitWithHelp("Informe a descricao da alteracao.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const entry = `\n## ${tag} - ${today}\n\n- ${description}\n`;
  const current = existsSync("CHANGELOG.md") ? readFileSync("CHANGELOG.md", "utf8") : "# Changelog\n";
  writeFileSync("CHANGELOG.md", `${current.trimEnd()}\n${entry}`, "utf8");
  console.log(`CHANGELOG.md atualizado para ${tag}.`);
}

try {
  if (command === "backup") backupCurrentCode();
  else if (command === "create") createVersion();
  else if (command === "rollback") rollbackCode();
  else if (command === "changelog") updateChangelog();
  else exitWithHelp("Comando nao reconhecido.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
