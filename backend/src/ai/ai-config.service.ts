/**
 * Centralized AI Configuration Module
 * 
 * Provides unified, environment-aware configuration for all AI services including:
 * - Default LLM model, temperature, max tokens, and timeout
 * - Retrieval limits (max search results, max chunks, context size budget)
 * - Context scanning limits
 * - Retry policy (max retries, backoff ms)
 * - Logging options (telemetry, log level)
 */

export type RoutingStrategy = "manual" | "priority" | "health" | "capability";

export interface LLMConfig {
  provider: string; // The active provider when strategy is 'manual'
  routingStrategy: RoutingStrategy;
  providerPriority: string[]; // List of providers ordered by preference
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  healthCheckCacheMs: number;
}

export interface RetrievalLimitsConfig {
  maxSearchResults: number;
  maxRetrievedChunks: number;
  maxPromptContextSize: number;
  minRelevanceScore: number;
  chunkMergeThreshold: number;
}

export interface ContextLimitsConfig {
  maxFilesToScan: number;
  maxSymbolsToScan: number;
  maxContextSizeBytes: number;
}

export interface RetryPolicyConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
}

export interface LoggingOptionsConfig {
  enableTelemetry: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  logPromptContext: boolean;
}

export interface AIConfig {
  llm: LLMConfig;
  retrieval: RetrievalLimitsConfig;
  context: ContextLimitsConfig;
  retryPolicy: RetryPolicyConfig;
  timeoutMs: number;
  logging: LoggingOptionsConfig;
}

export class AIConfigService {
  private config: AIConfig;

  constructor(customConfig?: Partial<AIConfig>) {
    this.config = this.loadConfig(customConfig);
  }

  private loadConfig(customConfig?: Partial<AIConfig>): AIConfig {
    return {
      llm: {
        provider: process.env.AI_PROVIDER || "openai",
        routingStrategy: (process.env.AI_ROUTING_STRATEGY as RoutingStrategy) || "manual",
        providerPriority: process.env.AI_PROVIDER_PRIORITY
          ? process.env.AI_PROVIDER_PRIORITY.split(",").map((s) => s.trim())
          : ["openai", "nvidia", "qwen"],
        defaultModel:
          process.env.AI_DEFAULT_MODEL ||
          process.env.OPENAI_MODEL ||
          process.env.OPENROUTER_MODEL ||
          "qwen/qwen3-coder:free",
        temperature: parseFloat(process.env.AI_TEMPERATURE || "0.2"),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || "4096", 10),
        timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || "30000", 10),
        healthCheckCacheMs: parseInt(process.env.AI_HEALTH_CHECK_CACHE_MS || "60000", 10),
        ...customConfig?.llm,
      },
      retrieval: {
        maxSearchResults: parseInt(
          process.env.AI_RETRIEVAL_MAX_SEARCH_RESULTS || "10",
          10
        ),
        maxRetrievedChunks: parseInt(
          process.env.AI_RETRIEVAL_MAX_CHUNKS || "20",
          10
        ),
        maxPromptContextSize: parseInt(
          process.env.AI_RETRIEVAL_MAX_PROMPT_CONTEXT_SIZE || "14000",
          10
        ),
        minRelevanceScore: parseInt(
          process.env.AI_RETRIEVAL_MIN_RELEVANCE || "15",
          10
        ),
        chunkMergeThreshold: parseInt(
          process.env.AI_RETRIEVAL_CHUNK_MERGE_THRESHOLD || "15",
          10
        ),
        ...customConfig?.retrieval,
      },
      context: {
        maxFilesToScan: parseInt(process.env.AI_CONTEXT_MAX_FILES || "1000", 10),
        maxSymbolsToScan: parseInt(
          process.env.AI_CONTEXT_MAX_SYMBOLS || "500",
          10
        ),
        maxContextSizeBytes: parseInt(
          process.env.AI_CONTEXT_MAX_BYTES || "1000000",
          10
        ),
        ...customConfig?.context,
      },
      retryPolicy: {
        maxRetries: parseInt(process.env.AI_RETRY_MAX_RETRIES || "3", 10),
        initialBackoffMs: parseInt(
          process.env.AI_RETRY_INITIAL_BACKOFF_MS || "1000",
          10
        ),
        maxBackoffMs: parseInt(
          process.env.AI_RETRY_MAX_BACKOFF_MS || "10000",
          10
        ),
        ...customConfig?.retryPolicy,
      },
      timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || "30000", 10),
      logging: {
        enableTelemetry: process.env.AI_LOG_TELEMETRY !== "false",
        logLevel: (process.env.AI_LOG_LEVEL as any) || "info",
        logPromptContext: process.env.AI_LOG_PROMPT_CONTEXT === "true",
        ...customConfig?.logging,
      },
    };
  }

  public get<K extends keyof AIConfig>(key: K): AIConfig[K] {
    return this.config[key];
  }

  public getAll(): AIConfig {
    return { ...this.config };
  }
}

export const defaultAIConfigService = new AIConfigService();
