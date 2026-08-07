import { Router } from "express";
import { ImpactAnalysisController } from "../ai/impact-analysis.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const impactController = new ImpactAnalysisController();

/**
 * POST /api/impact/analyze
 *
 * AI-powered Impact Analysis endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, targetType: string, targetIdentifier: string }
 * Returns: {
 *   success: true,
 *   directDependencies: string[],
 *   indirectDependencies: string[],
 *   affectedModules: string[],
 *   riskLevel: "Low" | "Medium" | "High",
 *   testingScope: string,
 *   breakingChangeLikelihood: "Low" | "Medium" | "High",
 *   recommendedValidationSteps: string[],
 *   markdownReport: string,
 *   sources: SourceReference[],
 *   metadata: { repository, targetType, targetIdentifier, intent, contextDomainsUsed, strategy },
 *   stats: KnowledgeRetrievalStats
 * }
 */
router.post(
  "/analyze",
  authenticateToken,
  impactController.analyze.bind(impactController)
);

export default router;
