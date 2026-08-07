import {
  RepositoryIndexService,
  IndexedRepository,
  IndexChunk,
} from "./repository-index.service";
import {
  RelevanceScoringService,
  SearchCandidate,
  SearchIntent,
} from "./relevance-scoring.service";
import { RETRIEVAL_CONFIG } from "../config/retrieval.config";

export interface SearchMatch extends SearchCandidate {
  id: string;
  type: string;
  name: string;
  filePath?: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchResult {
  files: SearchMatch[];
  symbols: SearchMatch[];
  controllers: SearchMatch[];
  services: SearchMatch[];
  routes: SearchMatch[];
  models: SearchMatch[];
  intent?: SearchIntent;
}

/**
 * RepositorySearchService
 *
 * Responsibility: Performs fast, provider-agnostic, intent-aware keyword-based search over an
 * in-memory RepositoryIndex using RelevanceScoringService to compute and rank relevance scores.
 * Uses configurable maxSearchResults from RETRIEVAL_CONFIG.
 *
 * Exposes:
 *  search(repositoryName: string, query: string, intent?: SearchIntent): SearchResult
 */
export class RepositorySearchService {
  private indexService: RepositoryIndexService;
  private scoringService: RelevanceScoringService;

  constructor(
    indexService?: RepositoryIndexService,
    scoringService?: RelevanceScoringService
  ) {
    this.indexService = indexService ?? new RepositoryIndexService();
    this.scoringService = scoringService ?? new RelevanceScoringService();
  }

  /**
   * Searches the repository index for matching files, symbols, controllers, services, routes, and database models.
   *
   * @param repositoryName - Repository name/slug
   * @param query - Keyword query string
   * @param intent - Optional pre-classified SearchIntent
   * @returns SearchResult object containing ranked top matches per category
   */
  search(repositoryName: string, query: string, intent?: SearchIntent): SearchResult {
    const searchIntent = intent ?? this.scoringService.classifyIntent(query);
    const limit = RETRIEVAL_CONFIG.maxSearchResults;

    const result: SearchResult = {
      files: [],
      symbols: [],
      controllers: [],
      services: [],
      routes: [],
      models: [],
      intent: searchIntent,
    };

    if (!query || !query.trim()) {
      return result;
    }

    // 1. Retrieve existing index or build on demand
    let indexedRepo = this.indexService.getIndex(repositoryName);
    if (!indexedRepo) {
      indexedRepo = this.indexService.buildIndex(repositoryName);
    }

    if (!indexedRepo || !indexedRepo.chunks.length) {
      return result;
    }

    // Deduplication maps for entity candidates
    const filesMap = new Map<string, SearchMatch>();
    const controllersMap = new Map<string, SearchMatch>();
    const servicesMap = new Map<string, SearchMatch>();
    const symbolsMap = new Map<string, SearchMatch>();
    const routesMap = new Map<string, SearchMatch>();
    const modelsMap = new Map<string, SearchMatch>();

    // 2. Filter and categorize matching chunks using RelevanceScoringService with intent-awareness
    for (const chunk of indexedRepo.chunks) {
      const score = this.scoringService.score(query, chunk, searchIntent);
      if (score < RETRIEVAL_CONFIG.minRelevanceScore) continue;

      const match: SearchMatch = {
        id: chunk.id,
        type: chunk.type,
        name: chunk.name,
        filePath: chunk.filePath,
        content: chunk.content,
        score,
        metadata: chunk.metadata,
      };

      switch (chunk.type) {
        case "file":
        case "module":
        case "summary": {
          const key = chunk.filePath || chunk.name;
          const existing = filesMap.get(key);
          if (!existing || match.score > existing.score) {
            filesMap.set(key, match);
          }
          break;
        }

        case "controller": {
          const key = chunk.filePath || chunk.name;
          const existing = controllersMap.get(key);
          if (!existing || match.score > existing.score) {
            controllersMap.set(key, match);
          }
          break;
        }

        case "service": {
          const key = chunk.filePath || chunk.name;
          const existing = servicesMap.get(key);
          if (!existing || match.score > existing.score) {
            servicesMap.set(key, match);
          }
          break;
        }

        case "symbol": {
          const key = chunk.id;
          const existing = symbolsMap.get(key);
          if (!existing || match.score > existing.score) {
            symbolsMap.set(key, match);
          }
          break;
        }

        case "apiRoute": {
          const key = chunk.id;
          const existing = routesMap.get(key);
          if (!existing || match.score > existing.score) {
            routesMap.set(key, match);
          }
          break;
        }

        case "databaseModel": {
          const key = chunk.id;
          const existing = modelsMap.get(key);
          if (!existing || match.score > existing.score) {
            modelsMap.set(key, match);
          }
          break;
        }

        default:
          break;
      }
    }

    // 3. Delegate ranking of matches within each category and return top matches based on limit
    result.files = this.scoringService
      .rank(query, Array.from(filesMap.values()), searchIntent)
      .slice(0, limit);

    result.controllers = this.scoringService
      .rank(query, Array.from(controllersMap.values()), searchIntent)
      .slice(0, limit);

    result.services = this.scoringService
      .rank(query, Array.from(servicesMap.values()), searchIntent)
      .slice(0, limit);

    result.symbols = this.scoringService
      .rank(query, Array.from(symbolsMap.values()), searchIntent)
      .slice(0, limit);

    result.routes = this.scoringService
      .rank(query, Array.from(routesMap.values()), searchIntent)
      .slice(0, limit);

    result.models = this.scoringService
      .rank(query, Array.from(modelsMap.values()), searchIntent)
      .slice(0, limit);

    return result;
  }
}
