import { defaultAIConfigService } from "../ai/ai-config.service";

/**
 * Centralized Retrieval Pipeline Configuration
 *
 * Configurable settings for semantic search, context retrieval, chunk merging, and prompt context budget.
 */
export interface RetrievalConfig {
  /** Maximum search results returned per category by RepositorySearchService */
  maxSearchResults: number;
  /** Maximum total retrieved chunks across files, symbols, routes, and models */
  maxRetrievedChunks: number;
  /** Maximum prompt context size budget in characters (~3,500 tokens) */
  maxPromptContextSize: number;
  /** Minimum relevance score threshold required for chunk inclusion */
  minRelevanceScore: number;
  /** Minimum character length threshold to merge or retain a code snippet */
  chunkMergeThreshold: number;
}

export const RETRIEVAL_CONFIG: RetrievalConfig = defaultAIConfigService.get("retrieval");

