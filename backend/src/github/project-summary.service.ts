import { ArchitectureAnalysis } from "./architecture-analyzer.service";
import { TechnologyStack } from "./technology-detector.service";

export interface ProjectSummary {
  repositoryType: string;
  architecture: string;
  frontend: string;
  backend: string;
  database: string;
  orm: string;
  authentication: string;
  repositorySize: string;
  majorModules: string[];
}

export class ProjectSummaryService {
  generate(
    technology: TechnologyStack,
    architecture: ArchitectureAnalysis,
    totalFiles: number
  ): ProjectSummary {
    const modules = new Set<string>();

    architecture.controllers.forEach((controller) => {
      const parts = controller.replace(/\\/g, "/").split("/");

      const srcIndex = parts.indexOf("src");

      if (srcIndex >= 0 && parts[srcIndex + 1]) {
        modules.add(this.capitalize(parts[srcIndex + 1]));
      }
    });

    let repositorySize = "Small";

    if (totalFiles > 300) {
      repositorySize = "Large";
    } else if (totalFiles > 100) {
      repositorySize = "Medium";
    }

    return {
      repositoryType:
        technology.frontend && technology.backend
          ? "Full Stack Application"
          : technology.backend
          ? "Backend Application"
          : technology.frontend
          ? "Frontend Application"
          : "Software Project",

      architecture:
        architecture.controllers.length > 0 &&
        architecture.services.length > 0
          ? "Controller-Service"
          : "Unknown",

      frontend: technology.frontend ?? "Unknown",
      backend: technology.backend ?? "Unknown",
      database: technology.database ?? "Unknown",
      orm: technology.orm ?? "Unknown",
      authentication: technology.authentication ?? "Unknown",
      repositorySize,
      majorModules: [...modules].sort(),
    };
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}