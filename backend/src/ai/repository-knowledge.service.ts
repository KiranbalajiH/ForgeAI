import { AnalysisPipelineService } from "../github/analysis-pipeline.service";
import { analysisCacheService } from "./analysis-cache.service";
import { ChatContextService, ContextDomain, SourceReference } from "./chat-context.service";
import { ContextRetrieverService, RetrievedContext, ContextRetrieverOptions } from "../github/context-retriever.service";
import { RepoChatContextBuilderService } from "./repo-chat-context-builder.service";
import { RetrievalLogger } from "../utils/retrieval-logger";
import { SearchIntent } from "../github/relevance-scoring.service";
import { executeWithTelemetrySync } from "./ai-service.wrapper";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";

// ─── Standardized RepositoryKnowledgeResult Model ────────────────────────────

export type KnowledgeRetrievalStrategy = "semantic" | "broad_fallback";

export interface KnowledgeSearchMetadata {
  /** Target repository identifier or slug */
  repository: string;
  /** Developer query or task prompt */
  query: string;
  /** Classified intent of the query */
  intent: SearchIntent | string;
  /** Context domains injected into the prompt */
  contextDomainsUsed: ContextDomain[];
}

export interface KnowledgeRetrievalStats {
  /** Retrieval execution time in milliseconds */
  searchDurationMs: number;
  /** Total matching search candidates prior to budget capping */
  searchResultsCount: number;
  /** Total retained context chunks */
  retrievedChunksCount: number;
  /** Final formatted prompt context size in bytes */
  finalContextSizeBytes: number;
}

/**
 * Standardized RepositoryKnowledgeResult Model
 *
 * Serves as the common output format for all AI repository features:
 *  - Repository Chat
 *  - Repository Explain
 *  - AI Code Review
 *  - Documentation Generation
 *  - PR Analysis
 */
export interface RepositoryKnowledgeResult {
  /** Formatted markdown prompt string ready for LLMs or downstream tasks */
  prompt: string;
  /** Detailed retrieved context chunks (present when strategy is "semantic") */
  retrievedContext?: RetrievedContext;
  /** Citable source-file references */
  sources: SourceReference[];
  /** Search and context domain metadata */
  metadata: KnowledgeSearchMetadata;
  /** Retrieval performance and volume statistics */
  stats: KnowledgeRetrievalStats;
  /** Retrieval strategy executed ("semantic" | "broad_fallback") */
  strategy: KnowledgeRetrievalStrategy;
  /** Boolean indicator whether broad-context fallback was triggered */
  fallbackUsed: boolean;
}

/** Alias for backward compatibility with previous interface name */
export type KnowledgeResult = RepositoryKnowledgeResult;

/** Options forwarded to ContextRetrieverService */
export type KnowledgeRetrievalOptions = ContextRetrieverOptions;

// ─── Service Implementation ──────────────────────────────────────────────────

/**
 * RepositoryKnowledgeService
 *
 * Single orchestration layer for repository knowledge retrieval.
 * Produces a standardized RepositoryKnowledgeResult model.
 */
export class RepositoryKnowledgeService extends AIServiceBase {
  private contextRetriever: ContextRetrieverService;
  private contextBuilder: RepoChatContextBuilderService;
  private broadContextService: ChatContextService;
  private pipeline: AnalysisPipelineService;

  constructor(
    contextRetriever?: ContextRetrieverService,
    contextBuilder?: RepoChatContextBuilderService,
    broadContextService?: ChatContextService,
    pipeline?: AnalysisPipelineService,
    configService?: AIConfigService
  ) {
    super("RepositoryKnowledgeService", configService);
    this.contextRetriever = contextRetriever ?? new ContextRetrieverService();
    this.contextBuilder = contextBuilder ?? new RepoChatContextBuilderService();
    this.broadContextService = broadContextService ?? new ChatContextService();
    this.pipeline = pipeline ?? new AnalysisPipelineService();
  }

  /**
   * Retrieve knowledge for a repository query and return a standardized RepositoryKnowledgeResult.
   *
   * @param repository - Repository name / slug
   * @param query      - Natural-language query or prompt
   * @param options    - Optional retrieval parameters
   * @returns          RepositoryKnowledgeResult model (always resolves)
   */
  retrieve(
    repository: string,
    query: string,
    options?: KnowledgeRetrievalOptions
  ): RepositoryKnowledgeResult {
    return this.executeSync(
      repository,
      (context) => {
        const startTime = Date.now();
        let detectedIntent: string = "General Search";

        // ── 1. Attempt semantic retrieval strategy ──────────────────────────────
        try {
          const retrieved = this.contextRetriever.retrieve(repository, query, options);
          detectedIntent = retrieved.intent ?? "General Search";

          const hasRelevantContext =
            retrieved.files.length > 0 ||
            retrieved.symbols.length > 0 ||
            retrieved.routes.length > 0 ||
            retrieved.models.length > 0;

          if (hasRelevantContext) {
            const built = this.contextBuilder.buildFromRetrievedContext(
              repository,
              query,
              retrieved
            );

            const retrievedChunksCount =
              retrieved.files.length +
              retrieved.symbols.length +
              retrieved.routes.length +
              retrieved.models.length;

            const durationMs = Date.now() - startTime;
            const sizeBytes = Buffer.byteLength(built.prompt, "utf8");

            const stats: KnowledgeRetrievalStats = {
              searchDurationMs: durationMs,
              searchResultsCount: retrievedChunksCount,
              retrievedChunksCount,
              finalContextSizeBytes: sizeBytes,
            };

            const metadata: KnowledgeSearchMetadata = {
              repository,
              query,
              intent: detectedIntent,
              contextDomainsUsed: built.contextUsed,
            };

            RetrievalLogger.logTelemetry({
              query,
              detectedIntent,
              searchDurationMs: durationMs,
              searchResultsCount: retrievedChunksCount,
              retrievedChunksCount,
              finalContextSizeBytes: sizeBytes,
              fallbackUsed: false,
              timestamp: new Date().toISOString(),
            });

            return {
              prompt: built.prompt,
              retrievedContext: retrieved,
              sources: built.sources,
              metadata,
              stats,
              strategy: "semantic",
              fallbackUsed: false,
            };
          }
        } catch (error: any) {
          console.warn(
            `[RepositoryKnowledgeService] Semantic retrieval failed for "${query}" in "${repository}": ` +
              `${error?.message ?? error}. Falling back to broad context strategy.`
          );
        }

        // ── 2. Broad-context fallback strategy ──────────────────────────────────
        let analysis = analysisCacheService.get(repository);
        if (!analysis) {
          analysis = this.pipeline.analyze(repository);
        }

        const built = this.broadContextService.build(analysis, query);

        const durationMs = Date.now() - startTime;
        const sizeBytes = Buffer.byteLength(built.prompt, "utf8");

        const stats: KnowledgeRetrievalStats = {
          searchDurationMs: durationMs,
          searchResultsCount: 0,
          retrievedChunksCount: 0,
          finalContextSizeBytes: sizeBytes,
        };

        const metadata: KnowledgeSearchMetadata = {
          repository,
          query,
          intent: detectedIntent !== "General Search" ? detectedIntent : "Fallback Context",
          contextDomainsUsed: built.contextUsed,
        };

        RetrievalLogger.logTelemetry({
          query,
          detectedIntent: metadata.intent,
          searchDurationMs: durationMs,
          searchResultsCount: 0,
          retrievedChunksCount: 0,
          finalContextSizeBytes: sizeBytes,
          fallbackUsed: true,
          timestamp: new Date().toISOString(),
        });

        return {
          prompt: built.prompt,
          retrievedContext: undefined,
          sources: built.sources,
          metadata,
          stats,
          strategy: "broad_fallback",
          fallbackUsed: true,
        };
      },
      {
        category: "RepositoryKnowledge",
        payload: { query, options },
        ttlMs: 1000 * 60 * 60, // 1 hour
      }
    );
  }
}
