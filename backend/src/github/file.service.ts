import fs from "fs";
import path from "path";

const IGNORE_FOLDERS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  ".idea",
  ".vscode",
];

export class FileService {
  getDirectoryTree(dir: string, currentRelativePath = ""): any[] {
    if (!fs.existsSync(dir)) return [];
    const items = fs.readdirSync(dir);

    return items
      .filter((item) => !IGNORE_FOLDERS.includes(item))
      .map((item) => {
        const fullPath = path.join(dir, item);
        const relPath = currentRelativePath ? `${currentRelativePath}/${item}` : item;
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          return {
            name: item,
            path: relPath,
            type: "folder",
            children: this.getDirectoryTree(fullPath, relPath),
          };
        }

        return {
          name: item,
          path: relPath,
          type: "file",
        };
      });
  }

  readRepository(repoName: string) {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    if (!fs.existsSync(repoPath)) {
      throw new Error("Repository not found");
    }

    return this.getDirectoryTree(repoPath);
  }

  readFile(repoName: string, filePath: string) {
    const fullPath = path.join(process.cwd(), "temp", repoName, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error("File not found");
    }

    return fs.readFileSync(fullPath, "utf8");
  }

  getAllFiles(
    dir: string,
    basePath = ""
  ): { path: string; size: number; mtimeMs: number }[] {
    const items = fs.readdirSync(dir);

    let files: { path: string; size: number; mtimeMs: number }[] = [];

    for (const item of items) {
      if (IGNORE_FOLDERS.includes(item)) {
        continue;
      }

      const fullPath = path.join(dir, item);
      const relativePath = basePath ? `${basePath}/${item}` : item;
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath, relativePath));
      } else {
        files.push({
          path: relativePath,
          size: stats.size,
          mtimeMs: stats.mtimeMs,
        });
      }
    }

    return files;
  }
}