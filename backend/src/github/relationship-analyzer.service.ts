import { FileDependency } from "./dependency-analyzer.service";

export interface ModuleRelationship {
  source: string;
  target: string;
  type: "imports";
}

export class RelationshipAnalyzerService {
  analyze(
    dependencies: FileDependency[]
  ): ModuleRelationship[] {
    const relationships: ModuleRelationship[] = [];

    for (const dependency of dependencies) {
      for (const imported of dependency.imports) {
        // Ignore third-party libraries
        if (!imported.startsWith(".")) {
          continue;
        }

        relationships.push({
          source: dependency.file,
          target: imported,
          type: "imports",
        });
      }
    }

    return relationships;
  }
}