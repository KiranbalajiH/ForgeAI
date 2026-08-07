import { Router } from "express";
import { CodeReviewController } from "../ai/code-review.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const codeReviewController = new CodeReviewController();

/**
 * POST /api/review/code
 *
 * AI-powered code review endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, reviewType: string, filePath?: string }
 * Returns: {
 *   success: true,
 *   summary: string,
 *   findings: ReviewFinding[],
 *   recommendations: string[],
 *   overallSeverity: "Low" | "Medium" | "High",
 *   fullReview: string,
 *   sources: SourceReference[],
 *   metadata: { repository, reviewType, filePath?, intent, contextDomainsUsed, strategy },
 *   stats: KnowledgeRetrievalStats
 * }
 */
router.post(
  "/code",
  authenticateToken,
  codeReviewController.review.bind(codeReviewController)
);

export default router;
