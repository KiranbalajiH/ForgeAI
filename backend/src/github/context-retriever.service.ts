import {
  RepositorySearchService,
  SearchMatch,
} from "./repository-search.service";
import { RepositoryIndexService } from "./repository-index.service";

export interface ContextItem {
  name: string;
  filePath?: string;
  content?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RetrievedContext {
  summary: string;
  files: ContextItem[];
  symbols: ContextItem[];
  routes: ContextItem[];
  models: ContextItem[];
}

export interface ContextRetrieverOptions {
  maxFiles?: number;
  maxSymbols?: number;
  maxRoutes?: number;
  maxModels?: number;
  maxFileContentLength?: number;
}

/**
 * ContextRetrieverService
 *
 * Responsibility: Retrieves and constructs a compact, relevance-ranked AI context payload
 * from a repository index for consumption by PromptBuilderService.
 *
 * Exposes:
 *  retrieve(repositoryName: string, query: string, options?: ContextRetrieverOptions): RetrievedContext
 */
export class ContextRetrieverService {
  private searchService: RepositorySearchService;
  private indexService: RepositoryIndexService;

  constructor(
    searchService?: RepositorySearchService,
    indexService?: RepositoryIndexService
  ) {
    this.searchService = searchService ?? new RepositorySearchService();
    this.indexService = indexService ?? new RepositoryIndexService();
  }

  /**
   * Retrieves relevance-ranked context chunks for a user query.
   *
   * @param repositoryName - Repository name/slug
   * @param query - User prompt or question
   * @param options - Custom size limits for prompt safety
   * @returns Structured RetrievedContext object with summary, files, symbols, routes, models
   */
  retrieve(
    repositoryName: string,
    query: string,
    options?: ContextRetrieverOptions
  ): RetrievedContext {
    const maxFiles = options?.maxFiles ?? 6;
    const maxSymbols = options?.maxSymbols ?? 10;
    const maxRoutes = options?.maxRoutes ?? 10;
    const maxModels = options?.maxModels ?? 8;
    const maxFileContentLength = options?.maxFileContentLength ?? 3000;

    // 1. Fetch project summary from RepositoryIndexService
    let indexedRepo = this.indexService.getIndex(repositoryName);
    if (!indexedRepo) {
      indexedRepo = this.indexService.buildIndex(repositoryName);
    }

    const summaryChunk = indexedRepo?.chunks.find((c) => c.type === "summary");
    const summary = summaryChunk ? summaryChunk.content : "";

    // 2. Perform search via RepositorySearchService
    const searchResults = this.searchService.search(repositoryName, query);

    // 3. Combine and rank file candidates (files, controllers, services) by relevance score
    const rawFiles: SearchMatch[] = [
      ...searchResults.files,
      ...searchResults.controllers,
      ...searchResults.services,
    ];

    // Deduplicate file candidates by filePath
    const uniqueFilesMap = new Map<string, SearchMatch>();
    for (const f of rawFiles) {
      const key = f.filePath || f.name;
      const existing = uniqueFilesMap.get(key);
      if (!existing || f.score > existing.score) {
        uniqueFilesMap.set(key, f);
      }
    }

    const rankedFiles = Array.from(uniqueFilesMap.values()).sort(
      (a, b) => b.score - a.score
    );

    // 4. Map to ContextItem structure while capping individual content size
    const files: ContextItem[] = rankedFiles.slice(0, maxFiles).map((f) => ({
      name: f.name,
      filePath: f.filePath,
      content:
        f.content && f.content.length > maxFileContentLength
          ? f.content.slice(0, maxFileContentLength) + "\n... [truncated]"
          : f.content,
      score: f.score,
      metadata: f.metadata,
    }));

    const symbols: ContextItem[] = searchResults.symbols
      .slice(0, maxSymbols)
      .map((s) => ({
        name: s.name,
        filePath: s.filePath,
        content: s.content,
        score: s.score,
        metadata: s.metadata,
      }));

    const routes: ContextItem[] = searchResults.routes
      .slice(0, maxRoutes)
      .map((r) => ({
        name: r.name,
        filePath: r.filePath,
        content: r.content,
        score: r.score,
        metadata: r.metadata,
      }));

    const models: ContextItem[] = searchResults.models
      .slice(0, maxModels)
      .map((m) => ({
        name: m.name,
        filePath: m.filePath,
        content: m.content,
        score: m.score,
        metadata: m.metadata,
      }));

    return {
      summary,
      files,
      symbols,
      routes,
      models,
    };
  }
}
