import { existsSync, readFileSync } from "fs";
import path from "path";

function getMimeType(extension: string) {
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  return "image/png";
}

export function resolveReportLogoPath(logoUrl?: string | null) {
  const configuredPath = logoUrl?.trim() || process.env.MEDICAO_REPORT_LOGO_PATH?.trim();

  if (configuredPath?.startsWith("http://") || configuredPath?.startsWith("https://") || configuredPath?.startsWith("data:")) {
    return configuredPath;
  }

  const candidate = configuredPath
    ? path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath)
    : path.join(process.cwd(), "public", "assets", "logo-jtbjmx.png");

  return existsSync(candidate) ? candidate : null;
}

export function resolveReportLogoSource(logoUrl?: string | null) {
  const filePath = resolveReportLogoPath(logoUrl);

  if (!filePath) {
    return null;
  }

  if (filePath.startsWith("http://") || filePath.startsWith("https://") || filePath.startsWith("data:")) {
    return filePath;
  }

  const extension = path.extname(filePath).toLowerCase();
  const mimeType = getMimeType(extension);
  const fileBuffer = readFileSync(filePath);

  return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
}
