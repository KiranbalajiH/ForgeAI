import path from "path";
import { FileService } from "./file.service";

export interface ArchitectureAnalysis {
  controllers: string[];
  services: string[];
  routes: string[];
  middleware: string[];
  models: string[];
  configs: string[];
}

export class ArchitectureAnalyzerService {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  analyze(
    repoName: string,
    changedFiles?: Set<string>,
    deletedFiles?: Set<string>,
    previous?: ArchitectureAnalysis
  ): ArchitectureAnalysis {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const allFiles = this.fileService.getAllFiles(repoPath)
      .filter((file) => !changedFiles || changedFiles.has(file.path));

    const architecture: ArchitectureAnalysis = {
      controllers: [],
      services: [],
      routes: [],
      middleware: [],
      models: [],
      configs: [],
    };

    if (previous && changedFiles && deletedFiles) {
      architecture.controllers.push(...previous.controllers.filter(p => !changedFiles.has(p) && !deletedFiles.has(p)));
      architecture.services.push(...previous.services.filter(p => !changedFiles.has(p) && !deletedFiles.has(p)));
      architecture.routes.push(...previous.routes.filter(p => !changedFiles.has(p) && !deletedFiles.has(p)));
      architecture.middleware.push(...previous.middleware.filter(p => !changedFiles.has(p) && !deletedFiles.has(p)));
      architecture.models.push(...previous.models.filter(p => !changedFiles.has(p) && !deletedFiles.has(p)));
      architecture.configs.push(...previous.configs.filter(p => !changedFiles.has(p) && !deletedFiles.has(p)));
    }

    for (const file of allFiles) {
      const filePath = file.path.toLowerCase();

      if (filePath.includes("controller")) {
        architecture.controllers.push(file.path);
      } else if (filePath.includes("service")) {
        architecture.services.push(file.path);
      } else if (filePath.includes("route")) {
        architecture.routes.push(file.path);
      } else if (filePath.includes("middleware")) {
        architecture.middleware.push(file.path);
      } else if (filePath.includes("model")) {
        architecture.models.push(file.path);
      } else if (
        filePath.endsWith("package.json") ||
        filePath.endsWith("tsconfig.json") ||
        filePath.endsWith(".env") ||
        filePath.endsWith(".env.example")
      ) {
        architecture.configs.push(file.path);
      }
    }

    return architecture;
  }
}
