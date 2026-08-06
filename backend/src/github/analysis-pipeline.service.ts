import path from "path";

import { FileService } from "./file.service";
import { SupportedFileService } from "./supported-file.service";
import { FileFilterService } from "./file-filter.service";

import { ProjectDetectorService } from "./project-detector.service";
import { PackageAnalyzerService } from "./package-analyzer.service";
import { TechnologyDetectorService } from "./technology-detector.service";
import { DatabaseAnalyzerService } from "./database-analyzer.service";
import { ReadmeAnalyzerService } from "./readme-analyzer.service";
import { EntryPointDetectorService } from "./entry-point-detector.service";
import { ArchitectureAnalyzerService } from "./architecture-analyzer.service";
import { DependencyAnalyzerService } from "./dependency-analyzer.service";
import { RelationshipAnalyzerService } from "./relationship-analyzer.service";
import { ApiRouteAnalyzerService } from "./api-route-analyzer.service";
import { ProjectSummaryService } from "./project-summary.service";
import { SymbolAnalyzerService } from "./symbol-analyzer.service";
import { KnowledgeGraphService } from "./knowledge-graph.service";

export interface RepositoryAnalysisResult {
  repository: string;

  project: any;
  technology: any;
  summary: any;

  package: any;
  database: any;

  readme: any;
  entryPoint: any;

  architecture: any;
  dependencies: any;
  relationships: any;
  apiRoutes: any;
  symbols: any;
  knowledgeGraph: any;

  totalFiles: number;
  files: any[];
}

export class AnalysisPipelineService {
  private fileService = new FileService();
  private supportedFileService =
    new SupportedFileService();
  private fileFilterService =
    new FileFilterService();

  private projectDetector =
    new ProjectDetectorService();

  private packageAnalyzer =
    new PackageAnalyzerService();

  private technologyDetector =
    new TechnologyDetectorService();

  private databaseAnalyzer =
    new DatabaseAnalyzerService();

  private readmeAnalyzer =
    new ReadmeAnalyzerService();

  private entryPointDetector =
    new EntryPointDetectorService();

  private architectureAnalyzer =
    new ArchitectureAnalyzerService();

  private dependencyAnalyzer =
    new DependencyAnalyzerService();

  private relationshipAnalyzer =
    new RelationshipAnalyzerService();

  private apiRouteAnalyzer =
    new ApiRouteAnalyzerService();

  private symbolAnalyzer =
    new SymbolAnalyzerService();

  private knowledgeGraphService =
    new KnowledgeGraphService();

  private summaryGenerator =
    new ProjectSummaryService();

  analyze(
    repoName: string
  ): RepositoryAnalysisResult {
    const repoPath = path.join(
      process.cwd(),
      "temp",
      repoName
    );

    const project =
      this.projectDetector.detect(repoName);

    const packageInfo =
      this.packageAnalyzer.analyze(repoName);

    const technology =
      this.technologyDetector.detect(packageInfo);

    const database =
      this.databaseAnalyzer.analyze(repoName);

    if (database?.provider) {
      technology.database =
        database.provider.charAt(0).toUpperCase() +
        database.provider.slice(1);
    }

    const readme =
      this.readmeAnalyzer.analyze(repoName);

    const entryPoint =
      this.entryPointDetector.detect(repoName);

    const architecture =
      this.architectureAnalyzer.analyze(repoName);

    const dependencies =
      this.dependencyAnalyzer.analyze(repoName);

    const relationships =
      this.relationshipAnalyzer.analyze(
        dependencies
      );

    const apiRoutes =
      this.apiRouteAnalyzer.analyze(repoName);

    const symbols =
      this.symbolAnalyzer.analyze(repoName);

    const knowledgeGraph =
      this.knowledgeGraphService.build(
        architecture,
        apiRoutes,
        symbols
      );

    const allFiles =
      this.fileService.getAllFiles(repoPath);

    const files = allFiles
      .filter((file) =>
        this.supportedFileService.isSupported(
          file.path
        )
      )
      .filter(
        (file) =>
          !this.fileFilterService.shouldSkip(
            file.path,
            file.size
          )
      )
      .map((file) => ({
        path: file.path,
        size: file.size,
        content: this.fileService.readFile(
          repoName,
          file.path
        ),
      }));

    const summary =
      this.summaryGenerator.generate(
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
      database,

      readme,
      entryPoint,

      architecture,
      dependencies,
      relationships,
      apiRoutes,
      symbols,
      knowledgeGraph,

      totalFiles: files.length,
      files,
    };
  }
}