import { Request, Response } from "express";
import { CodeReviewService } from "./code-review.service";

const codeReviewService = new CodeReviewService();

/**
 * CodeReviewController
 *
 * Exposes:
 *   POST /api/review/code
 *     Body:    { repository: string, reviewType: string, filePath?: string }
 *     Returns: {
 *       success: true,
 *       summary: string,
 *       findings: ReviewFinding[],
 *       recommendations: string[],
 *       overallSeverity: "Low" | "Medium" | "High",
 *       fullReview: string,
 *       sources: SourceReference[],
 *       metadata: { repository, reviewType, filePath?, intent, contextDomainsUsed, strategy },
 *       stats: KnowledgeRetrievalStats
 *     }
 */
export class CodeReviewController {
  async review(req: Request, res: Response) {
    try {
      const { repository, reviewType, filePath } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      if (!reviewType || typeof reviewType !== "string" || !reviewType.trim()) {
        return res.status(400).json({
          success: false,
          message: "reviewType is required",
        });
      }

      const repoName = repository.trim();
      const type = reviewType.trim();
      const file = filePath && typeof filePath === "string" ? filePath.trim() : undefined;

      const result = await codeReviewService.review(repoName, type, file);

      return res.json({
        success: true,
        summary: result.summary,
        findings: result.findings,
        recommendations: result.recommendations,
        overallSeverity: result.overallSeverity,
        fullReview: result.fullReview,
        sources: result.sources,
        metadata: result.metadata,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error("[CodeReviewController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate code review",
      });
    }
  }
}
