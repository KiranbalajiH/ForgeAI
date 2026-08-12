import { AnalysisPipelineService } from "./analysis-pipeline.service";
import { repositoryIndexService } from "./repository-index.service";

export class RepositoryAnalyzerService {
  private pipeline: AnalysisPipelineService;

  constructor() {
    this.pipeline = new AnalysisPipelineService();
  }

  analyzeRepository(repoName: string, simulateFailure = false) {
    const attemptedTime = new Date().toISOString();
    repositoryIndexService.setStatus(repoName, {
      status: "INDEXING",
      lastAttemptedIndexTime: attemptedTime,
      indexError: null,
    });

    try {
      if (simulateFailure) {
        throw new Error("Simulated repository indexing failure.");
      }

      const result = this.pipeline.analyze(repoName);
      const indexed = repositoryIndexService.buildIndex(repoName);

      repositoryIndexService.setStatus(repoName, {
        status: "INDEXED",
        lastSuccessfulIndexTime: new Date().toISOString(),
        lastAttemptedIndexTime: attemptedTime,
        indexError: null,
        totalFiles: result.totalFiles,
        totalChunks: indexed.totalChunks,
      });

      return result;
    } catch (error: any) {
      repositoryIndexService.setFailed(
        repoName,
        error.message || "Failed to analyze repository",
        attemptedTime
      );
      throw error;
    }
  }
}