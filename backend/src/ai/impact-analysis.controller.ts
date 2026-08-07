import { Request, Response } from "express";
import { ImpactAnalysisService } from "./impact-analysis.service";

const impactAnalysisService = new ImpactAnalysisService();

/**
 * ImpactAnalysisController
 *
 * Exposes:
 *   POST /api/impact/analyze
 *     Body:    { repository: string, targetType: string, targetIdentifier: string }
 *     Returns: {
 *       success: true,
 *       directDependencies: string[],
 *       indirectDependencies: string[],
 *       affectedModules: string[],
 *       riskLevel: "Low" | "Medium" | "High",
 *       testingScope: string,
 *       breakingChangeLikelihood: "Low" | "Medium" | "High",
 *       recommendedValidationSteps: string[],
 *       markdownReport: string,
 *       sources: SourceReference[],
 *       metadata: { repository, targetType, targetIdentifier, intent, contextDomainsUsed, strategy },
 *       stats: KnowledgeRetrievalStats
 *     }
 */
export class ImpactAnalysisController {
  async analyze(req: Request, res: Response) {
    try {
      const { repository, targetType, targetIdentifier } = req.body;

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

      const result = await impactAnalysisService.analyze(repoName, type, identifier);

      return res.json({
        success: true,
        directDependencies: result.directDependencies,
        indirectDependencies: result.indirectDependencies,
        affectedModules: result.affectedModules,
        riskLevel: result.riskLevel,
        testingScope: result.testingScope,
        breakingChangeLikelihood: result.breakingChangeLikelihood,
        recommendedValidationSteps: result.recommendedValidationSteps,
        markdownReport: result.markdownReport,
        sources: result.sources,
        metadata: result.metadata,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error("[ImpactAnalysisController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to analyze change impact",
      });
    }
  }
}
