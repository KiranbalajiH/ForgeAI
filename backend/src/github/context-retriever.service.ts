import {
  RepositorySearchService,
  SearchMatch,
} from "./repository-search.service";
import { RepositoryIndexService } from "./repository-index.service";
import {
  RelevanceScoringService,
  SearchIntent,
} from "./relevance-scoring.service";
import { RETRIEVAL_CONFIG } from "../config/retrieval.config";

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
  intent?: SearchIntent;
}

export interface ContextRetrieverOptions {
  maxFiles?: number;
  maxSymbols?: number;
  maxRoutes?: number;
  maxModels?: number;
  maxFileContentLength?: number;
  maxTotalCharacterBudget?: number;
  minSnippetLength?: number;
  minRelevanceScore?: number;
  intent?: SearchIntent;
}

/**
 * ContextRetrieverService
 *
 * Responsibility: Retrieves and constructs an intent-aware, relevance-ranked AI context payload.
 * Centralized RETRIEVAL_CONFIG parameters enforce:
 *  - maxSearchResults
 *  - maxRetrievedChunks
 *  - maxPromptContextSize
 *  - minRelevanceScore
 *  - chunkMergeThreshold
 *
 * Exposes:
 *  retrieve(repositoryName: string, query: string, options?: ContextRetrieverOptions): RetrievedContext
 */
export class ContextRetrieverService {
  private searchService: RepositorySearchService;
  private indexService: RepositoryIndexService;
  private scoringService: RelevanceScoringService;

  constructor(
    searchService?: RepositorySearchService,
    indexService?: RepositoryIndexService,
    scoringService?: RelevanceScoringService
  ) {
    this.scoringService = scoringService ?? new RelevanceScoringService();
    this.searchService = searchService ?? new RepositorySearchService(indexService, this.scoringService);
    this.indexService = indexService ?? new RepositoryIndexService();
  }

  /**
   * Retrieves intent-aware, relevance-ranked, and centralized config-bounded context chunks for a user query.
   *
   * @param repositoryName - Repository name/slug
   * @param query - User prompt or question
   * @param options - Custom size limits and character budget options for prompt safety
   * @returns Structured RetrievedContext object with summary, files, symbols, routes, models, and intent
   */
  retrieve(
    repositoryName: string,
    query: string,
    options?: ContextRetrieverOptions
  ): RetrievedContext {
    // 1. Detect query intent
    const intent = options?.intent ?? this.scoringService.classifyIntent(query);

    // 2. Set intent-specific retrieval defaults
    let defaultMaxFiles = 6;
    let defaultMaxSymbols = 8;
    let defaultMaxRoutes = 8;
    let defaultMaxModels = 6;
    let defaultMaxFileContentLength = 2500;

    switch (intent) {
      case "Code Explanation":
        defaultMaxFiles = 6;
        defaultMaxSymbols = 4;
        defaultMaxFileContentLength = 3500;
        break;

      case "Symbol Lookup":
        defaultMaxFiles = 3;
        defaultMaxSymbols = 12;
        defaultMaxFileContentLength = 1500;
        break;

      case "Error Investigation":
        defaultMaxFiles = 8;
        defaultMaxSymbols = 6;
        defaultMaxRoutes = 10;
        defaultMaxFileContentLength = 3000;
        break;

      case "File Discovery":
        defaultMaxFiles = 10;
        defaultMaxSymbols = 4;
        defaultMaxFileContentLength = 1500;
        break;

      case "Architecture Question":
        defaultMaxFiles = 8;
        defaultMaxRoutes = 12;
        defaultMaxModels = 10;
        defaultMaxFileContentLength = 2000;
        break;

      case "General Search":
      default:
        defaultMaxFiles = 6;
        defaultMaxSymbols = 8;
        defaultMaxRoutes = 8;
        defaultMaxModels = 6;
        defaultMaxFileContentLength = 2500;
        break;
    }

    const maxFiles = options?.maxFiles ?? defaultMaxFiles;
    const maxSymbols = options?.maxSymbols ?? defaultMaxSymbols;
    const maxRoutes = options?.maxRoutes ?? defaultMaxRoutes;
    const maxModels = options?.maxModels ?? defaultMaxModels;
    const maxFileContentLength = options?.maxFileContentLength ?? defaultMaxFileContentLength;
    const maxTotalCharacterBudget = options?.maxTotalCharacterBudget ?? RETRIEVAL_CONFIG.maxPromptContextSize;
    const minSnippetLength = options?.minSnippetLength ?? RETRIEVAL_CONFIG.chunkMergeThreshold;
    const minRelevanceScore = options?.minRelevanceScore ?? RETRIEVAL_CONFIG.minRelevanceScore;
    const maxRetrievedChunks = RETRIEVAL_CONFIG.maxRetrievedChunks;

    // 3. Fetch project summary from RepositoryIndexService
    let indexedRepo = this.indexService.getIndex(repositoryName);
    if (!indexedRepo) {
      indexedRepo = this.indexService.buildIndex(repositoryName);
    }

    const summaryChunk = indexedRepo?.chunks.find((c) => c.type === "summary");
    const summary = summaryChunk ? summaryChunk.content : "";

    let currentBudget = summary.length;

    // 4. Perform intent-aware search via RepositorySearchService
    const searchResults = this.searchService.search(repositoryName, query, intent);

    // 5. Collect all candidate search matches
    const allMatches: SearchMatch[] = [
      ...searchResults.files,
      ...searchResults.controllers,
      ...searchResults.services,
      ...searchResults.symbols,
      ...searchResults.routes,
      ...searchResults.models,
    ];

    // Filter out tiny or low-relevance snippets based on RETRIEVAL_CONFIG
    const validMatches = allMatches.filter(
      (m) => m && m.content && m.content.trim().length >= minSnippetLength && m.score >= minRelevanceScore
    );

    // Group and deduplicate/merge contiguous chunks from the same file
    const fileGroupMap = new Map<
      string,
      {
        primaryMatch: SearchMatch;
        mergedContent: string;
        maxScore: number;
        symbolNames: Set<string>;
        combinedMetadata: Record<string, any>;
      }
    >();

    const standaloneSymbols: SearchMatch[] = [];
    const standaloneRoutes: SearchMatch[] = [];
    const standaloneModels: SearchMatch[] = [];

    for (const match of validMatches) {
      if (match.type === "symbol" && !match.filePath) {
        standaloneSymbols.push(match);
        continue;
      }
      if (match.type === "apiRoute") {
        standaloneRoutes.push(match);
        continue;
      }
      if (match.type === "databaseModel") {
        standaloneModels.push(match);
        continue;
      }

      const fileKey = match.filePath || match.name;
      const existing = fileGroupMap.get(fileKey);

      if (!existing) {
        fileGroupMap.set(fileKey, {
          primaryMatch: match,
          mergedContent: match.content,
          maxScore: match.score,
          symbolNames: match.type === "symbol" ? new Set([match.name]) : new Set(),
          combinedMetadata: { ...match.metadata },
        });
      } else {
        existing.maxScore = Math.max(existing.maxScore, match.score);
        existing.combinedMetadata = {
          ...existing.combinedMetadata,
          ...match.metadata,
        };

        if (match.type === "symbol") {
          existing.symbolNames.add(match.name);
        }

        // Merge contiguous or non-duplicate content snippets
        if (
          match.content &&
          !existing.mergedContent.includes(match.content) &&
          !match.content.includes(existing.mergedContent)
        ) {
          existing.mergedContent = `${existing.mergedContent}\n\n// --- Additional section ---\n${match.content}`;
        }
      }
    }

    // Sort deduplicated file entries by priority (highest maxScore first)
    const rankedFileGroups = Array.from(fileGroupMap.values()).sort(
      (a, b) => b.maxScore - a.maxScore
    );

    let totalChunksCount = 0;

    // Build intent-optimized file context items
    const files: ContextItem[] = [];

    for (const group of rankedFileGroups) {
      if (files.length >= maxFiles || totalChunksCount >= maxRetrievedChunks) break;

      let content = group.mergedContent;
      if (content.length > maxFileContentLength) {
        content = content.slice(0, maxFileContentLength) + "\n... [truncated]";
      }

      if (currentBudget + content.length > maxTotalCharacterBudget) {
        const remainingBudget = maxTotalCharacterBudget - currentBudget;
        if (remainingBudget < 100) break;
        content = content.slice(0, remainingBudget) + "\n... [budget capped]";
      }

      currentBudget += content.length;
      totalChunksCount++;

      const symbolsList = Array.from(group.symbolNames);
      files.push({
        name: group.primaryMatch.name,
        filePath: group.primaryMatch.filePath,
        content,
        score: group.maxScore,
        metadata: {
          ...group.combinedMetadata,
          ...(symbolsList.length > 0 ? { matchedSymbols: symbolsList } : {}),
        },
      });

      if (currentBudget >= maxTotalCharacterBudget) break;
    }

    // Process Symbols
    const symbols: ContextItem[] = [];
    const sortedSymbols = [...searchResults.symbols, ...standaloneSymbols].sort(
      (a, b) => b.score - a.score
    );

    for (const s of sortedSymbols) {
      if (symbols.length >= maxSymbols || totalChunksCount >= maxRetrievedChunks) break;
      if (!s.content || s.content.trim().length < minSnippetLength) continue;
      if (currentBudget + s.content.length > maxTotalCharacterBudget) break;

      currentBudget += s.content.length;
      totalChunksCount++;
      symbols.push({
        name: s.name,
        filePath: s.filePath,
        content: s.content,
        score: s.score,
        metadata: s.metadata,
      });
    }

    // Process Routes
    const routes: ContextItem[] = [];
    const sortedRoutes = searchResults.routes.sort((a, b) => b.score - a.score);

    for (const r of sortedRoutes) {
      if (routes.length >= maxRoutes || totalChunksCount >= maxRetrievedChunks) break;
      if (!r.content || r.content.trim().length < minSnippetLength) continue;
      if (currentBudget + r.content.length > maxTotalCharacterBudget) break;

      currentBudget += r.content.length;
      totalChunksCount++;
      routes.push({
        name: r.name,
        filePath: r.filePath,
        content: r.content,
        score: r.score,
        metadata: r.metadata,
      });
    }

    // Process Models
    const models: ContextItem[] = [];
    const sortedModels = searchResults.models.sort((a, b) => b.score - a.score);

    for (const m of sortedModels) {
      if (models.length >= maxModels || totalChunksCount >= maxRetrievedChunks) break;
      if (!m.content || m.content.trim().length < minSnippetLength) continue;
      if (currentBudget + m.content.length > maxTotalCharacterBudget) break;

      currentBudget += m.content.length;
      totalChunksCount++;
      models.push({
        name: m.name,
        filePath: m.filePath,
        content: m.content,
        score: m.score,
        metadata: m.metadata,
      });
    }

    return {
      summary,
      files,
      symbols,
      routes,
      models,
      intent,
    };
  }
}
