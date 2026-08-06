import { AnalysisPipelineService } from "./analysis-pipeline.service";

export class RepositoryAnalyzerService {
  private pipeline: AnalysisPipelineService;

  constructor() {
    this.pipeline = new AnalysisPipelineService();
  }

  analyzeRepository(repoName: string) {
    return this.pipeline.analyze(repoName);
  }
}