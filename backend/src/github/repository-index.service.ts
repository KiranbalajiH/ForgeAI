import path from "path";
import {
  AnalysisPipelineService,
  RepositoryAnalysisResult,
} from "./analysis-pipeline.service";
import { analysisCacheService } from "../ai/analysis-cache.service";

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
 * Indexed Sections:
 *  1. Project Overview & Summary (`summary`)
 *  2. Source Files (`file`)
 *  3. Modules & Dependencies (`module`, `relationship`)
 *  4. Controllers (`controller`)
 *  5. Services (`service`)
 *  6. Exported Symbols (`symbol`)
 *  7. API Routes (`apiRoute`)
 *  8. Database Models (`databaseModel`)
 *
 * Provides O(1) dictionary lookups for instant symbol, route, and model retrieval.
 */
export class RepositoryIndexService {
  private pipeline = new AnalysisPipelineService();
  private indexStore = new Map<string, IndexedRepository>();

  /**
   * Builds a rich in-memory searchable index from a repository's analysis result.
   * Reuses existing AnalysisPipelineService output (cache-first).
   *
   * @param repository - Repository slug/name
   */
  buildIndex(repository: string): IndexedRepository {
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

    // 3. Index Source Files & Code Modules
    if (analysis.files?.length) {
      for (const file of analysis.files) {
        const fileChunk: IndexChunk = {
          id: `file:${file.path}`,
          type: "file",
          filePath: file.path,
          name: path.basename(file.path),
          content: file.content ?? "",
          metadata: {
            size: file.size,
            ext: path.extname(file.path),
          },
        };
        addChunk(fileChunk);
        modulesMap.set(file.path, fileChunk);
        modulesMap.set(fileChunk.name, fileChunk);

        // Also register as code module
        const moduleChunk: IndexChunk = {
          id: `module:${file.path}`,
          type: "module",
          filePath: file.path,
          name: path.basename(file.path),
          content: `Code module at ${file.path}`,
          metadata: {
            path: file.path,
            size: file.size,
          },
        };
        addChunk(moduleChunk);
      }
    }

    // 4. Index Controllers (Architecture)
    if (analysis.architecture?.controllers?.length) {
      for (const controllerPath of analysis.architecture.controllers as string[]) {
        const name = path.basename(controllerPath);
        const chunk: IndexChunk = {
          id: `controller:${controllerPath}`,
          type: "controller",
          filePath: controllerPath,
          name,
          content: `Controller component handling endpoint routing and HTTP requests at ${controllerPath}`,
          metadata: { path: controllerPath },
        };
        addChunk(chunk);
        controllersMap.set(controllerPath, chunk);
        controllersMap.set(name, chunk);
      }
    }

    // 5. Index Services (Architecture)
    if (analysis.architecture?.services?.length) {
      for (const servicePath of analysis.architecture.services as string[]) {
        const name = path.basename(servicePath);
        const chunk: IndexChunk = {
          id: `service:${servicePath}`,
          type: "service",
          filePath: servicePath,
          name,
          content: `Service component encapsulating business logic and data operations at ${servicePath}`,
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

    // 7. Index Exported Symbols
    if (analysis.symbols?.length) {
      for (const fileSymbols of analysis.symbols) {
        if (!fileSymbols.symbols?.length) continue;
        for (const sym of fileSymbols.symbols) {
          const chunk: IndexChunk = {
            id: `symbol:${fileSymbols.file}:${sym.name}`,
            type: "symbol",
            filePath: fileSymbols.file,
            name: sym.name,
            content: `${sym.type} ${sym.name} exported in ${fileSymbols.file}`,
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

    return indexedRepo;
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
