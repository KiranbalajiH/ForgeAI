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
  getDirectoryTree(dir: string): any[] {
    const items = fs.readdirSync(dir);

    return items
      .filter((item) => !IGNORE_FOLDERS.includes(item))
      .map((item) => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          return {
            name: item,
            type: "folder",
            children: this.getDirectoryTree(fullPath),
          };
        }

        return {
          name: item,
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
  ): { path: string; size: number }[] {
    const items = fs.readdirSync(dir);

    let files: { path: string; size: number }[] = [];

    for (const item of items) {
      if (IGNORE_FOLDERS.includes(item)) {
        continue;
      }

      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath, relativePath));
      } else {
        files.push({
          path: relativePath,
          size: stats.size,
        });
      }
    }

    return files;
  }
}