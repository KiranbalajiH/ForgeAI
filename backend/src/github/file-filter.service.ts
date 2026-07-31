import path from "path";

const SKIP_FILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".DS_Store",
  "Thumbs.db",
];

const MAX_FILE_SIZE = 100 * 1024; // 100 KB

export class FileFilterService {
  shouldSkip(filePath: string, size: number): boolean {
    const fileName = path.basename(filePath);

    if (SKIP_FILES.includes(fileName)) {
      return true;
    }

    if (size > MAX_FILE_SIZE) {
      return true;
    }

    return false;
  }
}