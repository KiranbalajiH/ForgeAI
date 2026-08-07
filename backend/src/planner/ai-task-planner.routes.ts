import { Router } from "express";
import { AITaskPlannerController } from "../ai/ai-task-planner.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const plannerController = new AITaskPlannerController();

/**
 * POST /api/planner/plan
 *
 * AI-powered Task Implementation Planner endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, taskDescription: string, scope?: "Repository" | "Module" | "File" }
 * Returns: {
 *   success: true,
 *   executiveSummary: string,
 *   objectives: string[],
 *   filesLikelyToChange: string[],
 *   dependencies: string[],
 *   implementationSteps: TaskImplementationStep[],
 *   risks: string[],
 *   testingStrategy: string[],
 *   estimatedComplexity: "Trivial" | "Low" | "Medium" | "High" | "Very High",
 *   estimatedDevelopmentTime: string,
 *   markdownPlan: string,
 *   sources: SourceReference[],
 *   metadata: { repository, taskDescription, scope, intent, contextDomainsUsed, strategy },
 *   stats: KnowledgeRetrievalStats
 * }
 */
router.post(
  "/plan",
  authenticateToken,
  plannerController.plan.bind(plannerController)
);

export default router;
