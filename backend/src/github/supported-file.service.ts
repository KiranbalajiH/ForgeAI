import path from "path";

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".prisma",
  ".html",
  ".css",
  ".scss",
  ".sql",
  ".yml",
  ".yaml",
  ".env.example",
];

export class SupportedFileService {
  isSupported(filePath: string): boolean {
    const extension = path.extname(filePath);

    return SUPPORTED_EXTENSIONS.includes(extension);
  }
}