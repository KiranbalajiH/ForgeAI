import { Request, Response } from "express";
import { ChangeRiskAssessmentService } from "./change-risk-assessment.service";

const riskAssessmentService = new ChangeRiskAssessmentService();

/**
 * ChangeRiskAssessmentController
 *
 * Exposes:
 *   POST /api/risk/assess
 *     Body:    { repository: string, targetType: string, targetIdentifier: string, changeDescription?: string }
 *     Returns: {
 *       success: true,
 *       overallRisk: "Low" | "Medium" | "High" | "Critical",
 *       riskFactors: string[],
 *       potentialBreakingChanges: string[],
 *       componentsLikelyAffected: string[],
 *       recommendedTestAreas: string[],
 *       rollbackConsiderations: string[],
 *       mitigationSuggestions: string[],
 *       confidenceScore: number,
 *       markdownReport: string,
 *       sources: SourceReference[],
 *       metadata: { repository, targetType, targetIdentifier, changeDescription?, intent, contextDomainsUsed, strategy },
 *       stats: KnowledgeRetrievalStats
 *     }
 */
export class ChangeRiskAssessmentController {
  async assess(req: Request, res: Response) {
    try {
      const { repository, targetType, targetIdentifier, changeDescription } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      if (!targetType || typeof targetType !== "string" || !targetType.trim()) {
        return res.status(400).json({
          success: false,
          message: "targetType is required",
        });
      }

      if (
        !targetIdentifier ||
        typeof targetIdentifier !== "string" ||
        !targetIdentifier.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "targetIdentifier is required",
        });
      }

      const repoName = repository.trim();
      const type = targetType.trim();
      const identifier = targetIdentifier.trim();
      const desc =
        changeDescription && typeof changeDescription === "string"
          ? changeDescription.trim()
          : undefined;

      const result = await riskAssessmentService.assess(
        repoName,
        type,
        identifier,
        desc
      );

      return res.json({
        success: true,
        overallRisk: result.overallRisk,
        riskFactors: result.riskFactors,
        potentialBreakingChanges: result.potentialBreakingChanges,
        componentsLikelyAffected: result.componentsLikelyAffected,
        recommendedTestAreas: result.recommendedTestAreas,
        rollbackConsiderations: result.rollbackConsiderations,
        mitigationSuggestions: result.mitigationSuggestions,
        confidenceScore: result.confidenceScore,
        markdownReport: result.markdownReport,
        sources: result.sources,
        metadata: result.metadata,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error("[ChangeRiskAssessmentController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to assess change risk",
      });
    }
  }
}
