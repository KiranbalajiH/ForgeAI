import * as crypto from "crypto";
import { AIMetricsService, defaultAIMetricsService, CacheStatus } from "./ai-metrics.service";
import { AIConfigService, defaultAIConfigService } from "./ai-config.service";

export type CacheCategory = "RepositoryKnowledge" | "SearchResults" | "RetrievedContext" | "AIResponses";

export interface CacheOptions {
  category: CacheCategory;
  ttlMs?: number;
  bypassCache?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Reusable intelligent caching layer for AI services.
 * Designed to be easily swappable with Redis or a distributed cache in the future.
 */
export class AICacheService {
  private inMemoryCache: Map<string, CacheEntry<any>> = new Map();

  constructor(
    private configService: AIConfigService = defaultAIConfigService,
    private metricsService: AIMetricsService = defaultAIMetricsService
  ) {}

  /**
   * Generates a deterministic cache key.
   */
  public generateKey(
    repositoryId: string,
    serviceName: string,
    requestPayload: any
  ): string {
    const llmConfig = this.configService.get("llm");
    const configVersion = `${llmConfig.defaultModel}_${llmConfig.temperature}_${llmConfig.maxTokens}`;
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ repositoryId, serviceName, requestPayload, configVersion }))
      .digest("hex");
    return `${serviceName}:${repositoryId}:${hash}`;
  }

  /**
   * Retrieves a value from the cache or generates it using the factory function.
   */
  public async getOrSet<T>(
    key: string,
    repositoryId: string,
    serviceName: string,
    category: CacheCategory,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const bypassCache = options?.bypassCache || process.env.AI_BYPASS_CACHE === "true";
    
    if (bypassCache) {
      this.recordMetric(serviceName, repositoryId, key, category, "BYPASSED");
      return factory();
    }

    const entry = this.inMemoryCache.get(key);
    const now = Date.now();

    if (entry) {
      if (entry.expiresAt > now) {
        this.recordMetric(serviceName, repositoryId, key, category, "HIT");
        return entry.value as T;
      } else {
        this.recordMetric(serviceName, repositoryId, key, category, "EXPIRED");
        this.inMemoryCache.delete(key);
      }
    } else {
      this.recordMetric(serviceName, repositoryId, key, category, "MISS");
    }

    // Cache Miss or Expired - Generate new value
    const value = await factory();
    const ttlMs = options?.ttlMs || 60000 * 60; // default 1 hour
    
    this.inMemoryCache.set(key, { value, expiresAt: now + ttlMs });
    
    // If it was expired, we could consider this a REFRESH for metric purposes, 
    // but MISS covers the initial non-existent state. We log REFRESH when we update.
    if (entry) {
      this.recordMetric(serviceName, repositoryId, key, category, "REFRESH");
    }
    
    return value;
  }

  /**
   * Synchronous version of getOrSet.
   */
  public getOrSetSync<T>(
    key: string,
    repositoryId: string,
    serviceName: string,
    category: CacheCategory,
    factory: () => T,
    options?: CacheOptions
  ): T {
    const bypassCache = options?.bypassCache || process.env.AI_BYPASS_CACHE === "true";
    
    if (bypassCache) {
      this.recordMetric(serviceName, repositoryId, key, category, "BYPASSED");
      return factory();
    }

    const entry = this.inMemoryCache.get(key);
    const now = Date.now();

    if (entry) {
      if (entry.expiresAt > now) {
        this.recordMetric(serviceName, repositoryId, key, category, "HIT");
        return entry.value as T;
      } else {
        this.recordMetric(serviceName, repositoryId, key, category, "EXPIRED");
        this.inMemoryCache.delete(key);
      }
    } else {
      this.recordMetric(serviceName, repositoryId, key, category, "MISS");
    }

    const value = factory();
    const ttlMs = options?.ttlMs || 60000 * 60;
    
    this.inMemoryCache.set(key, { value, expiresAt: now + ttlMs });
    
    if (entry) {
      this.recordMetric(serviceName, repositoryId, key, category, "REFRESH");
    }
    
    return value;
  }

  private recordMetric(
    serviceName: string,
    repositoryId: string,
    cacheKey: string,
    category: string,
    status: CacheStatus
  ) {
    this.metricsService.recordCacheMetrics({
      serviceName,
      repositoryId,
      cacheKey,
      category,
      status,
      timestamp: new Date().toISOString()
    });
  }
}

export const defaultAICacheService = new AICacheService();
