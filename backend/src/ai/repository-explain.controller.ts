import { Request, Response } from "express";
import { RepositoryExplainService } from "./repository-explain.service";

const explainService = new RepositoryExplainService();

/**
 * RepositoryExplainController
 *
 * Exposes:
 *   POST /api/explain/repository
 *     Body:    { repository: string, question: string }
 *     Returns: { success: true, explanation: string, sources, metadata, stats, strategy }
 */
export class RepositoryExplainController {
  async explain(req: Request, res: Response) {
    try {
      const { repository, question } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({
          success: false,
          message: "question is required",
        });
      }

      const repoName = repository.trim();
      const q = question.trim();

      const result = await explainService.explain(repoName, q);

      return res.json({
        success: true,
        explanation: result.explanation,
        sources: result.sources,
        metadata: {
          repository: repoName,
          intent: result.metadata.intent,
          contextDomainsUsed: result.metadata.contextDomainsUsed,
          strategy: result.strategy,
        },
        stats: result.stats,
      });
    } catch (error: any) {
      console.error("[RepositoryExplainController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate explanation",
      });
    }
  }
}
