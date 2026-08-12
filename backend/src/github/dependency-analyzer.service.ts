import path from "path";
import { FileService } from "./file.service";

export interface FileDependency {
  file: string;
  imports: string[];
}

export class DependencyAnalyzerService {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  analyze(
    repoName: string,
    changedFiles?: Set<string>,
    deletedFiles?: Set<string>,
    previous?: FileDependency[]
  ): FileDependency[] {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const allFiles = this.fileService.getAllFiles(repoPath);

    const sourceFiles = allFiles
      .filter((file) =>
        [".ts", ".tsx", ".js", ".jsx"].some((ext) =>
          file.path.endsWith(ext)
        )
      )
      .filter((file) => !changedFiles || changedFiles.has(file.path));

    const dependencies: FileDependency[] = [];

    if (previous && changedFiles && deletedFiles) {
      dependencies.push(
        ...previous.filter(
          (p) => !changedFiles.has(p.file) && !deletedFiles.has(p.file)
        )
      );
    }

    for (const file of sourceFiles) {
      const content = this.fileService.readFile(
        repoName,
        file.path
      );

      const imports: string[] = [];

      const matches = content.matchAll(
        /import\s+.*?\s+from\s+["'](.+?)["']/g
      );

      for (const match of matches) {
        imports.push(match[1]);
      }

      dependencies.push({
        file: file.path,
        imports,
      });
    }

    return dependencies;
  }
}