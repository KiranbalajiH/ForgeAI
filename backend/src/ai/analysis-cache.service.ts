import { RepositoryAnalysisResult } from "../github/analysis-pipeline.service";

/**
 * Singleton in-memory cache for repository analysis results.
 * Populated by AnalysisPipelineService after each successful analyze() call.
 * Consumed by the chat layer to avoid re-running analysis on every chat turn.
 */
class AnalysisCacheService {
  private cache = new Map<string, RepositoryAnalysisResult>();

  set(repoName: string, result: RepositoryAnalysisResult): void {
    this.cache.set(repoName, result);
  }

  get(repoName: string): RepositoryAnalysisResult | null {
    return this.cache.get(repoName) ?? null;
  }

  has(repoName: string): boolean {
    return this.cache.has(repoName);
  }

  delete(repoName: string): void {
    this.cache.delete(repoName);
  }
}

// Export as a singleton so the same instance is shared across all imports
export const analysisCacheService = new AnalysisCacheService();
