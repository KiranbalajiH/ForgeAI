import { Router } from "express";
import { RefactoringPlannerController } from "../ai/refactoring-planner.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const refactoringController = new RefactoringPlannerController();

/**
 * POST /api/refactoring/plan
 *
 * AI-powered Refactoring Planner endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, focusArea?: string }
 * Returns: {
 *   success: true,
 *   executiveSummary: string,
 *   opportunities: RefactoringOpportunity[],
 *   overallPriority: "High" | "Medium" | "Low",
 *   overallEstimatedImpact: string,
 *   overallEstimatedEffort: string,
 *   recommendedStepOrder: string[],
 *   keyRisks: string[],
 *   markdownPlan: string,
 *   sources: SourceReference[],
 *   metadata: { repository, focusArea, complexity, intent, contextDomainsUsed, strategy },
 *   stats: KnowledgeRetrievalStats
 * }
 */
router.post(
  "/plan",
  authenticateToken,
  refactoringController.plan.bind(refactoringController)
);

export default router;
