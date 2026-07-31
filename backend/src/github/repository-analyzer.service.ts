import path from "path";
import { FileService } from "./file.service";
import { SupportedFileService } from "./supported-file.service";
import { FileFilterService } from "./file-filter.service";
import { ProjectDetectorService } from "./project-detector.service";

export class RepositoryAnalyzerService {
  private fileService: FileService;
  private supportedFileService: SupportedFileService;
  private fileFilterService: FileFilterService;
  private projectDetectorService: ProjectDetectorService;

  constructor() {
    this.fileService = new FileService();
    this.supportedFileService = new SupportedFileService();
    this.fileFilterService = new FileFilterService();
    this.projectDetectorService = new ProjectDetectorService();
  }

  analyzeRepository(repoName: string) {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const project = this.projectDetectorService.detect(repoName);

    const allFiles = this.fileService.getAllFiles(repoPath);

    const files = allFiles
      .filter((file) => this.supportedFileService.isSupported(file.path))
      .filter(
        (file) => !this.fileFilterService.shouldSkip(file.path, file.size)
      )
      .map((file) => ({
        path: file.path,
        size: file.size,
        content: this.fileService.readFile(repoName, file.path),
      }));

    return {
      repository: repoName,
      project,
      totalFiles: files.length,
      files,
    };
  }
}