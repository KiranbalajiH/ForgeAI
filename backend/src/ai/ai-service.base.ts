import { executeWithTelemetry, executeWithTelemetrySync } from "./ai-service.wrapper";
import { AIConfigService, defaultAIConfigService } from "./ai-config.service";
import { AIRequestMetrics, defaultAIMetricsService } from "./ai-metrics.service";
import { AICacheService, defaultAICacheService, CacheCategory } from "./ai-cache.service";
import { BackgroundJobService, defaultBackgroundJobService, JobOptions } from "./background-job.service";

export interface AIExecutionContext {
  requestId: string;
  repositoryId: string;
  metrics: Partial<AIRequestMetrics>;
}

export interface AIRequestMetadata {
  repository: string;
  intent: string;
  contextDomainsUsed: any[];
  strategy: string;
  [key: string]: any;
}

export interface AIExecutionResult<T> {
  result: T;
  metadata?: AIRequestMetadata;
}

export abstract class AIServiceBase {
  protected configService: AIConfigService;
  protected cacheService: AICacheService;
  protected jobService: BackgroundJobService;

  protected constructor(
    protected readonly serviceName: string,
    configService?: AIConfigService,
    cacheService?: AICacheService,
    jobService?: BackgroundJobService
  ) {
    this.configService = configService ?? defaultAIConfigService;
    this.cacheService = cacheService ?? defaultAICacheService;
    this.jobService = jobService ?? defaultBackgroundJobService;
  }

  /**
   * Standardized background execution wrapper for AI services.
   * Enqueues the operation, which internally utilizes `execute` for telemetry and caching.
   */
  protected executeBackground<T>(
    repositoryId: string,
    operation: (context: AIExecutionContext) => Promise<T>,
    jobOptions: JobOptions,
    cacheOptions?: {
      payload: any;
      category: CacheCategory;
      ttlMs?: number;
    }
  ): string {
    return this.jobService.enqueue<T, any>(jobOptions, async (jobId, updateProgress) => {
      // Background jobs automatically reuse the standard execution telemetry and caching!
      return this.execute(repositoryId, operation, cacheOptions);
    });
  }

  /**
   * Standardized asynchronous execution wrapper for AI services.
   * Handles telemetry, timing, error logging, metrics collection, common validation, and caching.
   */
  protected async execute<T>(
    repositoryId: string,
    operation: (context: AIExecutionContext) => Promise<T>,
    cacheOptions?: {
      payload: any;
      category: import("./ai-cache.service").CacheCategory;
      ttlMs?: number;
    }
  ): Promise<T> {
    if (!repositoryId) {
      throw new Error(`Repository ID is required for ${this.serviceName} execution.`);
    }

    return executeWithTelemetry(this.serviceName, repositoryId, async (requestId) => {
      const startTime = new Date().toISOString();
      const startTimeMs = Date.now();
      const metrics: Partial<AIRequestMetrics> = {};

      const operationRunner = async () => {
        try {
          const result: any = await operation({ requestId, repositoryId, metrics });

          if (result && result.stats) {
            if (metrics.retrievalDurationMs === undefined && result.stats.searchDurationMs !== undefined) {
              metrics.retrievalDurationMs = result.stats.searchDurationMs;
            }
            if (metrics.retrievedContextSize === undefined && result.stats.finalContextSizeBytes !== undefined) {
              metrics.retrievedContextSize = result.stats.finalContextSizeBytes;
            }
          }
          return result;
        } catch (error: any) {
          defaultAIMetricsService.recordMetrics({
            serviceName: this.serviceName,
            repositoryId,
            requestId,
            startTime,
            endTime: new Date().toISOString(),
            executionDurationMs: Date.now() - startTimeMs,
            success: false,
            errorCategory: error.category || "Internal",
            ...metrics,
          });
          throw error;
        }
      };

      let finalResult: T;

      if (cacheOptions) {
        const key = this.cacheService.generateKey(repositoryId, this.serviceName, cacheOptions.payload);
        // Track whether cache hit occurred by checking if operation modified metrics
        const beforeKeys = Object.keys(metrics).length;
        
        finalResult = await this.cacheService.getOrSet(
          key,
          repositoryId,
          this.serviceName,
          cacheOptions.category,
          operationRunner,
          { category: cacheOptions.category, ttlMs: cacheOptions.ttlMs }
        );
        
        // If metrics weren't modified by operationRunner, it was a hit
        if (Object.keys(metrics).length === beforeKeys) {
          metrics.cacheStatus = "HIT";
        }
      } else {
        finalResult = await operationRunner();
      }

      defaultAIMetricsService.recordMetrics({
        serviceName: this.serviceName,
        repositoryId,
        requestId,
        startTime,
        endTime: new Date().toISOString(),
        executionDurationMs: Date.now() - startTimeMs,
        success: true,
        ...metrics,
      });

      return finalResult;
    });
  }

  /**
   * Standardized synchronous execution wrapper for AI services.
   */
  protected executeSync<T>(
    repositoryId: string,
    operation: (context: AIExecutionContext) => T,
    cacheOptions?: {
      payload: any;
      category: import("./ai-cache.service").CacheCategory;
      ttlMs?: number;
    }
  ): T {
    if (!repositoryId) {
      throw new Error(`Repository ID is required for ${this.serviceName} execution.`);
    }
    
    return executeWithTelemetrySync(this.serviceName, repositoryId, (requestId) => {
      const startTime = new Date().toISOString();
      const startTimeMs = Date.now();
      const metrics: Partial<AIRequestMetrics> = {};

      const operationRunner = () => {
        try {
          const result: any = operation({ requestId, repositoryId, metrics });

          if (result && result.stats) {
            if (metrics.retrievalDurationMs === undefined && result.stats.searchDurationMs !== undefined) {
              metrics.retrievalDurationMs = result.stats.searchDurationMs;
            }
            if (metrics.retrievedContextSize === undefined && result.stats.finalContextSizeBytes !== undefined) {
              metrics.retrievedContextSize = result.stats.finalContextSizeBytes;
            }
          }
          return result;
        } catch (error: any) {
          defaultAIMetricsService.recordMetrics({
            serviceName: this.serviceName,
            repositoryId,
            requestId,
            startTime,
            endTime: new Date().toISOString(),
            executionDurationMs: Date.now() - startTimeMs,
            success: false,
            errorCategory: error.category || "Internal",
            ...metrics,
          });
          throw error;
        }
      };

      let finalResult: T;

      if (cacheOptions) {
        const key = this.cacheService.generateKey(repositoryId, this.serviceName, cacheOptions.payload);
        const beforeKeys = Object.keys(metrics).length;
        
        finalResult = this.cacheService.getOrSetSync(
          key,
          repositoryId,
          this.serviceName,
          cacheOptions.category,
          operationRunner,
          { category: cacheOptions.category, ttlMs: cacheOptions.ttlMs }
        );
        
        if (Object.keys(metrics).length === beforeKeys) {
          metrics.cacheStatus = "HIT";
        }
      } else {
        finalResult = operationRunner();
      }

      defaultAIMetricsService.recordMetrics({
        serviceName: this.serviceName,
        repositoryId,
        requestId,
        startTime,
        endTime: new Date().toISOString(),
        executionDurationMs: Date.now() - startTimeMs,
        success: true,
        ...metrics,
      });

      return finalResult;
    });
  }

  /**
   * Helper to execute an LLM call while automatically tracking duration, model, and prompt size.
   */
  protected async trackLLM<T>(
    context: AIExecutionContext,
    prompt: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    context.metrics.modelUsed = this.configService.get("llm").defaultModel;
    context.metrics.estimatedPromptSize = prompt.length;
    try {
      const result = await operation();
      context.metrics.llmDurationMs = Date.now() - start;
      return result;
    } catch (error) {
      context.metrics.llmDurationMs = Date.now() - start;
      throw error;
    }
  }

  /**
   * Helper to build common metadata from a knowledge result.
   */
  protected buildMetadata(
    repository: string,
    knowledgeResult: any,
    extraFields?: Record<string, any>
  ): AIRequestMetadata {
    return {
      repository,
      intent: String(knowledgeResult.metadata.intent),
      contextDomainsUsed: knowledgeResult.metadata.contextDomainsUsed,
      strategy: knowledgeResult.strategy,
      ...extraFields,
    };
  }
}
