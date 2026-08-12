import path from "path";
import fs from "fs";
import {
  AnalysisPipelineService,
  RepositoryAnalysisResult,
} from "./analysis-pipeline.service";
import { analysisCacheService } from "../ai/analysis-cache.service";
import { FileService } from "./file.service";
import { SupportedFileService } from "./supported-file.service";
import { FileFilterService } from "./file-filter.service";

export type IndexChunkType =
  | "file"
  | "symbol"
  | "module"
  | "controller"
  | "service"
  | "apiRoute"
  | "databaseModel"
  | "relationship"
  | "summary";

export type RepositoryIndexState =
  | "NOT_INDEXED"
  | "INDEXING"
  | "INDEXED"
  | "STALE"
  | "FAILED";

export interface RepositoryIndexStatusMetadata {
  repository: string;
  status: RepositoryIndexState;
  lastSuccessfulIndexTime: string | null;
  lastAttemptedIndexTime: string | null;
  indexError: string | null;
  totalFiles?: number;
  totalChunks?: number;
}

export interface IndexChunk {
  /** Unique chunk ID for exact lookup, e.g. "symbol:src/auth/auth.service.ts:loginUser" */
  id: string;
  /** Domain type of the chunk */
  type: IndexChunkType;
  /** Associated file path (if applicable) */
  filePath?: string;
  /** Human-readable identifier (symbol name, route path, controller name, etc.) */
  name: string;
  /** Raw text content ready for indexing/embedding */
  content: string;
  /** Structured metadata payload */
  metadata: Record<string, any>;
}

export interface IndexedRepository {
  /** Repository name/slug */
  repository: string;
  /** Timestamp when the index was constructed */
  indexedAt: Date;
  /** Total count of chunks in the index */
  totalChunks: number;

  /** Flat array of all indexed document chunks */
  chunks: IndexChunk[];

  /** O(1) lookup by exact chunk ID */
  chunkMap: Map<string, IndexChunk>;

  /** O(1) lookup by chunk type */
  chunksByType: Record<IndexChunkType, IndexChunk[]>;

  /** O(1) lookup for exported symbols by symbol name */
  symbolsMap: Map<string, IndexChunk>;

  /** O(1) lookup for code modules/files by path */
  modulesMap: Map<string, IndexChunk>;

  /** O(1) lookup for controller modules by name/path */
  controllersMap: Map<string, IndexChunk>;

  /** O(1) lookup for service modules by name/path */
  servicesMap: Map<string, IndexChunk>;

  /** O(1) lookup for API routes by "METHOD path" */
  routesMap: Map<string, IndexChunk>;

  /** O(1) lookup for database models by model name */
  dbModelsMap: Map<string, IndexChunk>;
}

/**
 * RepositoryIndexService
 *
 * Responsibility: Construct and manage a rich, provider-agnostic, in-memory index
 * from pre-computed RepositoryAnalysisResult data.
 *
 * Provides O(1) dictionary lookups for instant symbol, route, and model retrieval,
 * along with state management (NOT_INDEXED, INDEXING, INDEXED, STALE, FAILED).
 */
export class RepositoryIndexService {
  private pipeline = new AnalysisPipelineService();
  private indexStore = new Map<string, IndexedRepository>();
  private statusStore = new Map<string, RepositoryIndexStatusMetadata>();

  /**
   * Retrieves the current index status metadata for a repository.
   */
  getStatus(repository: string): RepositoryIndexStatusMetadata {
    let metadata = this.statusStore.get(repository);

    if (!metadata) {
      const hasAnalysis = analysisCacheService.has(repository);
      const hasIndex = this.indexStore.has(repository);

      if (hasAnalysis || hasIndex) {
        const cachedAnalysis = analysisCacheService.get(repository);
        const cachedIndex = this.indexStore.get(repository);
        metadata = {
          repository,
          status: "INDEXED",
          lastSuccessfulIndexTime: new Date().toISOString(),
          lastAttemptedIndexTime: new Date().toISOString(),
          indexError: null,
          totalFiles: cachedAnalysis?.totalFiles,
          totalChunks: cachedIndex?.totalChunks,
        };
      } else {
        metadata = {
          repository,
          status: "NOT_INDEXED",
          lastSuccessfulIndexTime: null,
          lastAttemptedIndexTime: null,
          indexError: null,
        };
      }
      this.statusStore.set(repository, metadata);
    }

    // Perform stale check if currently marked INDEXED
    if (metadata.status === "INDEXED" && this.checkIsStale(repository)) {
      metadata.status = "STALE";
      this.statusStore.set(repository, metadata);
    }

    return metadata;
  }

  /**
   * Updates index status metadata for a repository.
   */
  setStatus(
    repository: string,
    updates: Partial<RepositoryIndexStatusMetadata>
  ): RepositoryIndexStatusMetadata {
    const existing = this.statusStore.get(repository) || {
      repository,
      status: "NOT_INDEXED",
      lastSuccessfulIndexTime: null,
      lastAttemptedIndexTime: null,
      indexError: null,
    };

    const updated: RepositoryIndexStatusMetadata = {
      ...existing,
      ...updates,
      repository,
    };

    this.statusStore.set(repository, updated);
    return updated;
  }

  /**
   * Marks a repository as FAILED, updating indexError while preserving the last valid index.
   */
  setFailed(
    repository: string,
    errorMsg: string,
    attemptedTime?: string
  ): RepositoryIndexStatusMetadata {
    const existing = this.statusStore.get(repository) || {
      repository,
      status: "NOT_INDEXED",
      lastSuccessfulIndexTime: null,
      lastAttemptedIndexTime: null,
      indexError: null,
    };

    const updated: RepositoryIndexStatusMetadata = {
      ...existing,
      status: "FAILED",
      indexError: errorMsg,
      lastAttemptedIndexTime: attemptedTime ?? new Date().toISOString(),
    };

    this.statusStore.set(repository, updated);
    return updated;
  }

  /**
   * Checks whether repository source files on disk have changed since last analysis.
   */
  checkIsStale(repository: string): boolean {
    try {
      const repoPath = path.join(process.cwd(), "temp", repository);
      if (!fs.existsSync(repoPath)) return false;

      const previous = analysisCacheService.get(repository);
      if (!previous || !previous.files) return false;

      const fileService = new FileService();
      const supportedFileService = new SupportedFileService();
      const fileFilterService = new FileFilterService();

      const allFiles = fileService
        .getAllFiles(repoPath)
        .filter((f) => supportedFileService.isSupported(f.path))
        .filter((f) => !fileFilterService.shouldSkip(f.path, f.size));

      if (allFiles.length !== previous.files.length) {
        return true;
      }

      const prevMap = new Map(previous.files.map((f: any) => [f.path, f]));
      for (const file of allFiles) {
        const prev = prevMap.get(file.path);
        if (
          !prev ||
          prev.size !== file.size ||
          (prev.mtimeMs && prev.mtimeMs !== file.mtimeMs)
        ) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Builds a rich in-memory searchable index from a repository's analysis result.
   * Reuses existing AnalysisPipelineService output (cache-first).
   * Updates status to INDEXING -> INDEXED (or FAILED on error).
   *
   * @param repository - Repository slug/name
   */
  buildIndex(repository: string): IndexedRepository {
    const attemptedTime = new Date().toISOString();
    const currentMetadata = this.statusStore.get(repository);
    if (!currentMetadata || currentMetadata.status !== "INDEXING") {
      this.setStatus(repository, {
        status: "INDEXING",
        lastAttemptedIndexTime: attemptedTime,
        indexError: null,
      });
    }

    try {
      // 1. Fetch analysis from cache or run pipeline
      let analysis = analysisCacheService.get(repository);
      if (!analysis) {
        analysis = this.pipeline.analyze(repository);
      }

    const chunks: IndexChunk[] = [];
    const chunkMap = new Map<string, IndexChunk>();

    const chunksByType: Record<IndexChunkType, IndexChunk[]> = {
      file: [],
      symbol: [],
      module: [],
      controller: [],
      service: [],
      apiRoute: [],
      databaseModel: [],
      relationship: [],
      summary: [],
    };

    // Fast O(1) section dictionaries
    const symbolsMap = new Map<string, IndexChunk>();
    const modulesMap = new Map<string, IndexChunk>();
    const controllersMap = new Map<string, IndexChunk>();
    const servicesMap = new Map<string, IndexChunk>();
    const routesMap = new Map<string, IndexChunk>();
    const dbModelsMap = new Map<string, IndexChunk>();

    const addChunk = (chunk: IndexChunk) => {
      if (chunkMap.has(chunk.id)) return;
      chunks.push(chunk);
      chunkMap.set(chunk.id, chunk);
      chunksByType[chunk.type].push(chunk);
    };

    // 2. Index Project Summary
    if (analysis.summary || analysis.project) {
      const summaryText = [
        `Repository: ${analysis.repository}`,
        `Type: ${analysis.summary?.repositoryType ?? "Unknown"}`,
        `Language: ${analysis.project?.language ?? analysis.technology?.language ?? "Unknown"}`,
        `Framework: ${analysis.project?.framework ?? analysis.technology?.framework ?? "Unknown"}`,
        `Frontend: ${analysis.summary?.frontend ?? "Unknown"}`,
        `Backend: ${analysis.summary?.backend ?? "Unknown"}`,
        `Database: ${analysis.summary?.database ?? "Unknown"}`,
        `ORM: ${analysis.summary?.orm ?? "Unknown"}`,
        `Entry Point: ${analysis.entryPoint?.exists ? analysis.entryPoint.path : "None"}`,
      ].join("\n");

      addChunk({
        id: `summary:${analysis.repository}`,
        type: "summary",
        name: `${analysis.repository} Overview`,
        content: summaryText,
        metadata: {
          project: analysis.project,
          technology: analysis.technology,
          summary: analysis.summary,
        },
      });
    }

    // 3. Index Source Files (no separate module chunks — file chunks carry actual content)
    const fileContentMap = new Map<string, string>();
    if (analysis.files?.length) {
      for (const file of analysis.files) {
        const fileContent = file.content ?? "";
        fileContentMap.set(file.path, fileContent);
        // Also map by basename for architecture cross-referencing
        fileContentMap.set(path.basename(file.path), fileContent);

        const fileChunk: IndexChunk = {
          id: `file:${file.path}`,
          type: "file",
          filePath: file.path,
          name: path.basename(file.path),
          content: fileContent,
          metadata: {
            size: file.size,
            ext: path.extname(file.path),
          },
        };
        addChunk(fileChunk);
        modulesMap.set(file.path, fileChunk);
        modulesMap.set(fileChunk.name, fileChunk);
      }
    }

    // 4. Index Controllers (Architecture) — with actual source code from file content
    if (analysis.architecture?.controllers?.length) {
      for (const controllerPath of analysis.architecture.controllers as string[]) {
        const name = path.basename(controllerPath);
        const sourceContent = fileContentMap.get(controllerPath) || fileContentMap.get(name) || "";
        const truncatedContent = sourceContent.length > 4000
          ? sourceContent.slice(0, 4000) + "\n... [truncated]"
          : sourceContent;
        const chunk: IndexChunk = {
          id: `controller:${controllerPath}`,
          type: "controller",
          filePath: controllerPath,
          name,
          content: truncatedContent || `Controller at ${controllerPath}`,
          metadata: { path: controllerPath },
        };
        addChunk(chunk);
        controllersMap.set(controllerPath, chunk);
        controllersMap.set(name, chunk);
      }
    }

    // 5. Index Services (Architecture) — with actual source code from file content
    if (analysis.architecture?.services?.length) {
      for (const servicePath of analysis.architecture.services as string[]) {
        const name = path.basename(servicePath);
        const sourceContent = fileContentMap.get(servicePath) || fileContentMap.get(name) || "";
        const truncatedContent = sourceContent.length > 4000
          ? sourceContent.slice(0, 4000) + "\n... [truncated]"
          : sourceContent;
        const chunk: IndexChunk = {
          id: `service:${servicePath}`,
          type: "service",
          filePath: servicePath,
          name,
          content: truncatedContent || `Service at ${servicePath}`,
          metadata: { path: servicePath },
        };
        addChunk(chunk);
        servicesMap.set(servicePath, chunk);
        servicesMap.set(name, chunk);
      }
    }

    // 6. Index Database Models
    if (analysis.database?.models?.length) {
      for (const model of analysis.database.models as string[]) {
        const chunk: IndexChunk = {
          id: `dbModel:${analysis.database.provider || "db"}:${model}`,
          type: "databaseModel",
          name: model,
          content: `Database model ${model} defined via ORM ${analysis.database.orm || "schema"} (${analysis.database.provider || "database"})`,
          metadata: {
            model,
            provider: analysis.database.provider,
            orm: analysis.database.orm,
          },
        };
        addChunk(chunk);
        dbModelsMap.set(model, chunk);
      }
    }

    // 7. Index Exported Symbols — with code excerpt from source file
    if (analysis.symbols?.length) {
      for (const fileSymbols of analysis.symbols) {
        if (!fileSymbols.symbols?.length) continue;
        const fileContent = fileContentMap.get(fileSymbols.file) || fileContentMap.get(path.basename(fileSymbols.file)) || "";
        const fileLines = fileContent ? fileContent.split("\n") : [];

        for (const sym of fileSymbols.symbols) {
          // Extract a code excerpt around the symbol declaration
          let symbolContent = `${sym.type} ${sym.name} exported in ${fileSymbols.file}`;
          if (fileLines.length > 0) {
            const symbolNameLower = sym.name.toLowerCase();
            let declLineIdx = fileLines.findIndex((line) =>
              line.toLowerCase().includes(symbolNameLower) &&
              /\b(export|class|function|interface|type|const|enum|abstract)\b/i.test(line)
            );
            if (declLineIdx === -1) {
              declLineIdx = fileLines.findIndex((line) => line.toLowerCase().includes(symbolNameLower));
            }
            if (declLineIdx !== -1) {
              const excerptStart = Math.max(0, declLineIdx - 2);
              const excerptEnd = Math.min(fileLines.length, declLineIdx + 30);
              const excerpt = fileLines.slice(excerptStart, excerptEnd).join("\n");
              symbolContent = excerpt.length > 2000
                ? excerpt.slice(0, 2000) + "\n... [truncated]"
                : excerpt;
            }
          }

          const chunk: IndexChunk = {
            id: `symbol:${fileSymbols.file}:${sym.name}`,
            type: "symbol",
            filePath: fileSymbols.file,
            name: sym.name,
            content: symbolContent,
            metadata: {
              symbolType: sym.type,
              file: fileSymbols.file,
            },
          };
          addChunk(chunk);
          symbolsMap.set(sym.name, chunk);
          symbolsMap.set(`${fileSymbols.file}:${sym.name}`, chunk);
        }
      }
    }

    // 8. Index Module Import Relationships
    if (analysis.relationships?.length) {
      for (const rel of analysis.relationships) {
        addChunk({
          id: `rel:${rel.source}->${rel.target}`,
          type: "relationship",
          filePath: rel.source,
          name: `${path.basename(rel.source)} -> ${path.basename(rel.target)}`,
          content: `Module ${rel.source} imports and depends on ${rel.target}`,
          metadata: {
            source: rel.source,
            target: rel.target,
          },
        });
      }
    }

    // 9. Index API Routes
    if (analysis.apiRoutes?.length) {
      for (const route of analysis.apiRoutes) {
        const routeKey = `${route.method.toUpperCase()} ${route.path}`;
        const chunk: IndexChunk = {
          id: `route:${route.method}:${route.path}`,
          type: "apiRoute",
          name: routeKey,
          content: `API Endpoint ${route.method} ${route.path} handled by ${route.handler}`,
          metadata: {
            method: route.method,
            path: route.path,
            handler: route.handler,
          },
        };
        addChunk(chunk);
        routesMap.set(routeKey, chunk);
        routesMap.set(route.path, chunk);
      }
    }

    const indexedRepo: IndexedRepository = {
      repository,
      indexedAt: new Date(),
      totalChunks: chunks.length,
      chunks,
      chunkMap,
      chunksByType,
      symbolsMap,
      modulesMap,
      controllersMap,
      servicesMap,
      routesMap,
      dbModelsMap,
    };

    // Store in-memory
    this.indexStore.set(repository, indexedRepo);

    this.setStatus(repository, {
      status: "INDEXED",
      lastSuccessfulIndexTime: new Date().toISOString(),
      lastAttemptedIndexTime: attemptedTime,
      indexError: null,
      totalFiles: analysis.totalFiles,
      totalChunks: chunks.length,
    });

    return indexedRepo;
    } catch (error: any) {
      this.setFailed(repository, error.message || "Failed to build index", attemptedTime);
      throw error;
    }
  }

  /**
   * Retrieves an in-memory index for a repository if it exists.
   *
   * @param repository - Repository slug/name
   */
  getIndex(repository: string): IndexedRepository | null {
    return this.indexStore.get(repository) ?? null;
  }

  /**
   * Clears an in-memory index for a repository.
   *
   * @param repository - Repository slug/name
   */
  clearIndex(repository: string): void {
    this.indexStore.delete(repository);
  }

  // ── O(1) Fast Lookup Helpers ──────────────────────────────────────────────

  findSymbol(repository: string, symbolName: string): IndexChunk | null {
    const index = this.getIndex(repository);
    return index?.symbolsMap.get(symbolName) ?? null;
  }

  findModule(repository: string, modulePath: string): IndexChunk | null {
    const index = this.getIndex(repository);
    return index?.modulesMap.get(modulePath) ?? null;
  }

  findController(repository: string, controllerNameOrPath: string): IndexChunk | null {
    const index = this.getIndex(repository);
    return index?.controllersMap.get(controllerNameOrPath) ?? null;
  }

  findService(repository: string, serviceNameOrPath: string): IndexChunk | null {
    const index = this.getIndex(repository);
    return index?.servicesMap.get(serviceNameOrPath) ?? null;
  }

  findRoute(repository: string, method: string, routePath: string): IndexChunk | null {
    const index = this.getIndex(repository);
    const routeKey = `${method.toUpperCase()} ${routePath}`;
    return index?.routesMap.get(routeKey) ?? index?.routesMap.get(routePath) ?? null;
  }

  findDatabaseModel(repository: string, modelName: string): IndexChunk | null {
    const index = this.getIndex(repository);
    return index?.dbModelsMap.get(modelName) ?? null;
  }
}

export const repositoryIndexService = new RepositoryIndexService();
