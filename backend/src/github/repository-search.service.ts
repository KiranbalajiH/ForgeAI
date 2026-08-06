import {
  RepositoryIndexService,
  IndexedRepository,
  IndexChunk,
} from "./repository-index.service";
import {
  RelevanceScoringService,
  SearchCandidate,
} from "./relevance-scoring.service";

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
}

/**
 * RepositorySearchService
 *
 * Responsibility: Performs fast, provider-agnostic, keyword-based search over an
 * in-memory RepositoryIndex using RelevanceScoringService to compute and rank relevance scores.
 * Returns top 10 results per category.
 *
 * Exposes:
 *  search(repositoryName: string, query: string): SearchResult
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
   * @returns SearchResult object containing ranked top 10 matches per category
   */
  search(repositoryName: string, query: string): SearchResult {
    const result: SearchResult = {
      files: [],
      symbols: [],
      controllers: [],
      services: [],
      routes: [],
      models: [],
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

    // Deduplication maps for file-based entity candidates
    const filesMap = new Map<string, SearchMatch>();
    const controllersMap = new Map<string, SearchMatch>();
    const servicesMap = new Map<string, SearchMatch>();

    // 2. Filter and categorize matching chunks using RelevanceScoringService
    for (const chunk of indexedRepo.chunks) {
      const score = this.scoringService.score(query, chunk);
      if (score <= 0) continue;

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
        case "module": {
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

        case "symbol":
          result.symbols.push(match);
          break;

        case "apiRoute":
          result.routes.push(match);
          break;

        case "databaseModel":
          result.models.push(match);
          break;

        default:
          break;
      }
    }

    // 3. Delegate ranking of matches within each category and return top 10 results
    result.files = this.scoringService
      .rank(query, Array.from(filesMap.values()))
      .slice(0, 10);

    result.controllers = this.scoringService
      .rank(query, Array.from(controllersMap.values()))
      .slice(0, 10);

    result.services = this.scoringService
      .rank(query, Array.from(servicesMap.values()))
      .slice(0, 10);

    result.symbols = this.scoringService
      .rank(query, result.symbols)
      .slice(0, 10);

    result.routes = this.scoringService
      .rank(query, result.routes)
      .slice(0, 10);

    result.models = this.scoringService
      .rank(query, result.models)
      .slice(0, 10);

    return result;
  }
}
