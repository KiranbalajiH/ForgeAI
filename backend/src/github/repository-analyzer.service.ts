import path from "path";
import { FileService } from "./file.service";
import { SupportedFileService } from "./supported-file.service";
import { FileFilterService } from "./file-filter.service";
import { ProjectDetectorService } from "./project-detector.service";
import { PackageAnalyzerService } from "./package-analyzer.service";
import { ReadmeAnalyzerService } from "./readme-analyzer.service";
import { EntryPointDetectorService } from "./entry-point-detector.service";
import { ArchitectureAnalyzerService } from "./architecture-analyzer.service";
import { DependencyAnalyzerService } from "./dependency-analyzer.service";
import { TechnologyDetectorService } from "./technology-detector.service";
import { ProjectSummaryService } from "./project-summary.service";
import { RelationshipAnalyzerService } from "./relationship-analyzer.service";

export class RepositoryAnalyzerService {
  private fileService: FileService;
  private supportedFileService: SupportedFileService;
  private fileFilterService: FileFilterService;
  private projectDetectorService: ProjectDetectorService;
  private packageAnalyzerService: PackageAnalyzerService;
  private readmeAnalyzerService: ReadmeAnalyzerService;
  private entryPointDetectorService: EntryPointDetectorService;
  private architectureAnalyzerService: ArchitectureAnalyzerService;
  private dependencyAnalyzerService: DependencyAnalyzerService;
  private technologyDetectorService: TechnologyDetectorService;
  private projectSummaryService: ProjectSummaryService;
  private relationshipAnalyzerService: RelationshipAnalyzerService;

  constructor() {
    this.fileService = new FileService();
    this.supportedFileService = new SupportedFileService();
    this.fileFilterService = new FileFilterService();
    this.projectDetectorService = new ProjectDetectorService();
    this.packageAnalyzerService = new PackageAnalyzerService();
    this.readmeAnalyzerService = new ReadmeAnalyzerService();
    this.entryPointDetectorService = new EntryPointDetectorService();
    this.architectureAnalyzerService = new ArchitectureAnalyzerService();
    this.dependencyAnalyzerService = new DependencyAnalyzerService();
    this.technologyDetectorService = new TechnologyDetectorService();
    this.projectSummaryService = new ProjectSummaryService();
    this.relationshipAnalyzerService =
      new RelationshipAnalyzerService();
  }

  analyzeRepository(repoName: string) {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    // Core Analysis
    const project = this.projectDetectorService.detect(repoName);
    const packageInfo = this.packageAnalyzerService.analyze(repoName);
    const technology =
      this.technologyDetectorService.detect(packageInfo);

    const readme = this.readmeAnalyzerService.analyze(repoName);
    const entryPoint = this.entryPointDetectorService.detect(repoName);
    const architecture =
      this.architectureAnalyzerService.analyze(repoName);

    const dependencies =
      this.dependencyAnalyzerService.analyze(repoName);

    // NEW: Build relationship graph
    const relationships =
      this.relationshipAnalyzerService.analyze(dependencies);

    // Source Files
    const allFiles = this.fileService.getAllFiles(repoPath);

    const files = allFiles
      .filter((file) => this.supportedFileService.isSupported(file.path))
      .filter(
        (file) =>
          !this.fileFilterService.shouldSkip(file.path, file.size)
      )
      .map((file) => ({
        path: file.path,
        size: file.size,
        content: this.fileService.readFile(repoName, file.path),
      }));

    // High-Level Summary
    const summary = this.projectSummaryService.generate(
      technology,
      architecture,
      files.length
    );

    return {
      repository: repoName,

      project,
      technology,
      summary,

      package: packageInfo,
      readme,
      entryPoint,

      architecture,
      dependencies,
      relationships,

      totalFiles: files.length,
      files,
    };
  }
}