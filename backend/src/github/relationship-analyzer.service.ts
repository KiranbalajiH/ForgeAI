import path from "path";
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

    const sourceFiles = new Set(
      dependencies.map((d) =>
        d.file.replace(/\\/g, "/")
      )
    );

    for (const dependency of dependencies) {
      const source = dependency.file.replace(/\\/g, "/");

      for (const imported of dependency.imports) {
        // Ignore external libraries
        if (!imported.startsWith(".")) {
          continue;
        }

        const sourceDir = path.posix.dirname(source);

        const candidates = [
          path.posix.normalize(
            path.posix.join(sourceDir, imported + ".ts")
          ),
          path.posix.normalize(
            path.posix.join(sourceDir, imported + ".tsx")
          ),
          path.posix.normalize(
            path.posix.join(sourceDir, imported + ".js")
          ),
          path.posix.normalize(
            path.posix.join(sourceDir, imported + ".jsx")
          ),
          path.posix.normalize(
            path.posix.join(sourceDir, imported, "index.ts")
          ),
          path.posix.normalize(
            path.posix.join(sourceDir, imported, "index.tsx")
          ),
        ];

        const resolvedTarget =
          candidates.find((candidate) =>
            sourceFiles.has(candidate)
          ) ?? imported;

        relationships.push({
          source,
          target: resolvedTarget,
          type: "imports",
        });
      }
    }

    return relationships;
  }
}