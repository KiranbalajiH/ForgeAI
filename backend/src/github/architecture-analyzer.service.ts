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

  analyze(repoName: string): ArchitectureAnalysis {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const allFiles = this.fileService.getAllFiles(repoPath);

    const architecture: ArchitectureAnalysis = {
      controllers: [],
      services: [],
      routes: [],
      middleware: [],
      models: [],
      configs: [],
    };

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
