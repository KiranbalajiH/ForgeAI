import { Request, Response } from "express";
import { RefactoringPlannerService } from "./refactoring-planner.service";

const refactoringPlannerService = new RefactoringPlannerService();

/**
 * RefactoringPlannerController
 *
 * Exposes:
 *   POST /api/refactoring/plan
 *     Body:    { repository: string, focusArea?: string }
 *     Returns: {
 *       success: true,
 *       executiveSummary: string,
 *       opportunities: RefactoringOpportunity[],
 *       overallPriority: "High" | "Medium" | "Low",
 *       overallEstimatedImpact: string,
 *       overallEstimatedEffort: string,
 *       recommendedStepOrder: string[],
 *       keyRisks: string[],
 *       markdownPlan: string,
 *       sources: SourceReference[],
 *       metadata: { repository, focusArea, complexity, intent, contextDomainsUsed, strategy },
 *       stats: KnowledgeRetrievalStats
 *     }
 */
export class RefactoringPlannerController {
  async plan(req: Request, res: Response) {
    try {
      const { repository, focusArea } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      const repoName = repository.trim();
      const area = focusArea && typeof focusArea === "string" ? focusArea.trim() : undefined;

      const result = await refactoringPlannerService.plan(repoName, area);

      return res.json({
        success: true,
        executiveSummary: result.executiveSummary,
        opportunities: result.opportunities,
        overallPriority: result.overallPriority,
        overallEstimatedImpact: result.overallEstimatedImpact,
        overallEstimatedEffort: result.overallEstimatedEffort,
        recommendedStepOrder: result.recommendedStepOrder,
        keyRisks: result.keyRisks,
        markdownPlan: result.markdownPlan,
        sources: result.sources,
        metadata: result.metadata,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error("[RefactoringPlannerController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate refactoring plan",
      });
    }
  }
}
