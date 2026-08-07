import { ErrorCategory } from "./ai-service.wrapper";

export type CacheStatus = "HIT" | "MISS" | "REFRESH" | "EXPIRED" | "BYPASSED";

export interface AIRequestMetrics {
  serviceName: string;
  repositoryId: string;
  requestId: string;
  modelUsed?: string;
  startTime: string;
  endTime: string;
  executionDurationMs: number;
  success: boolean;
  errorCategory?: ErrorCategory;
  retrievalDurationMs?: number;
  llmDurationMs?: number;
  retrievedContextSize?: number;
  estimatedPromptSize?: number;
  cacheStatus?: CacheStatus;
}

export interface AICacheMetrics {
  serviceName: string;
  repositoryId: string;
  cacheKey: string;
  category: string;
  status: CacheStatus;
  timestamp: string;
}

export class AIMetricsService {
  /**
   * Internal service interface for exposing metrics.
   * Currently logs to console, but can be integrated with Prometheus/OpenTelemetry later.
   * This ensures the implementation remains provider-agnostic.
   */
  public recordMetrics(metrics: AIRequestMetrics): void {
    // Provider-agnostic collection point
    console.log(`[AIMetrics] ${JSON.stringify(metrics)}`);
  }

  public recordCacheMetrics(metrics: AICacheMetrics): void {
    console.log(`[AICacheMetrics] ${JSON.stringify(metrics)}`);
  }
}

export const defaultAIMetricsService = new AIMetricsService();
