import path from "path";
import {
  AnalysisPipelineService,
  RepositoryAnalysisResult,
} from "./analysis-pipeline.service";
import { analysisCacheService } from "../ai/analysis-cache.service";

export type IndexChunkType =
  | "file"
  | "symbol"
  | "relationship"
  | "apiRoute"
  | "summary";

export interface IndexChunk {
  /** Unique chunk ID for exact lookup, e.g. "file:backend/src/app.ts" */
  id: string;
  /** Domain type of the chunk */
  type: IndexChunkType;
  /** Associated file path (if applicable) */
  filePath?: string;
  /** Human-readable identifier (symbol name, route path, file name) */
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
  /** Array of all indexed document chunks */
  chunks: IndexChunk[];
  /** Map/lookup index by chunk ID for fast direct retrieval */
  chunkMap: Map<string, IndexChunk>;
  /** Secondary lookup index grouped by chunk type */
  chunksByType: Record<IndexChunkType, IndexChunk[]>;
}

/**
 * RepositoryIndexService
 *
 * Responsibility: Construct and manage provider-agnostic, in-memory search indexes
 * from pre-computed RepositoryAnalysisResult data.
 *
 * Indexes:
 *  - Project Summary
 *  - Source Files
 *  - Exported Symbols
 *  - Module Import Relationships
 *  - API Routes
 *
 * Designed to serve as the baseline input for future vector embedding & semantic search modules.
 */
export class RepositoryIndexService {
  private pipeline = new AnalysisPipelineService();
  private indexStore = new Map<string, IndexedRepository>();

  /**
   * Builds an in-memory searchable index from a repository's analysis result.
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
      relationship: [],
      apiRoute: [],
      summary: [],
    };

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

    // 3. Index Source Files
    if (analysis.files?.length) {
      for (const file of analysis.files) {
        addChunk({
          id: `file:${file.path}`,
          type: "file",
          filePath: file.path,
          name: path.basename(file.path),
          content: file.content ?? "",
          metadata: {
            size: file.size,
            ext: path.extname(file.path),
          },
        });
      }
    }

    // 4. Index Symbols
    if (analysis.symbols?.length) {
      for (const fileSymbols of analysis.symbols) {
        if (!fileSymbols.symbols?.length) continue;
        for (const sym of fileSymbols.symbols) {
          addChunk({
            id: `symbol:${fileSymbols.file}:${sym.name}`,
            type: "symbol",
            filePath: fileSymbols.file,
            name: sym.name,
            content: `${sym.type} ${sym.name} exported in ${fileSymbols.file}`,
            metadata: {
              symbolType: sym.type,
              file: fileSymbols.file,
            },
          });
        }
      }
    }

    // 5. Index Module Relationships
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

    // 6. Index API Routes
    if (analysis.apiRoutes?.length) {
      for (const route of analysis.apiRoutes) {
        addChunk({
          id: `route:${route.method}:${route.path}`,
          type: "apiRoute",
          name: `${route.method} ${route.path}`,
          content: `API Endpoint ${route.method} ${route.path} handled by ${route.handler}`,
          metadata: {
            method: route.method,
            path: route.path,
            handler: route.handler,
          },
        });
      }
    }

    const indexedRepo: IndexedRepository = {
      repository,
      indexedAt: new Date(),
      totalChunks: chunks.length,
      chunks,
      chunkMap,
      chunksByType,
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
}
