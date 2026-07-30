import path from "path";
import { FileService } from "./file.service";

export class RepositoryAnalyzerService {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  analyzeRepository(repoName: string) {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const filePaths = this.fileService.getAllFiles(repoPath);

    const files = filePaths.map((filePath) => ({
      path: filePath,
      content: this.fileService.readFile(repoName, filePath),
    }));

    return {
      repository: repoName,
      totalFiles: files.length,
      files,
    };
  }
}