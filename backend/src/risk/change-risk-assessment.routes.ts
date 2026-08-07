import { Router } from "express";
import { ChangeRiskAssessmentController } from "../ai/change-risk-assessment.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const riskController = new ChangeRiskAssessmentController();

/**
 * POST /api/risk/assess
 *
 * AI-powered Change Risk Assessment endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, targetType: string, targetIdentifier: string, changeDescription?: string }
 * Returns: {
 *   success: true,
 *   overallRisk: "Low" | "Medium" | "High" | "Critical",
 *   riskFactors: string[],
 *   potentialBreakingChanges: string[],
 *   componentsLikelyAffected: string[],
 *   recommendedTestAreas: string[],
 *   rollbackConsiderations: string[],
 *   mitigationSuggestions: string[],
 *   confidenceScore: number,
 *   markdownReport: string,
 *   sources: SourceReference[],
 *   metadata: { repository, targetType, targetIdentifier, changeDescription?, intent, contextDomainsUsed, strategy },
 *   stats: KnowledgeRetrievalStats
 * }
 */
router.post(
  "/assess",
  authenticateToken,
  riskController.assess.bind(riskController)
);

export default router;
