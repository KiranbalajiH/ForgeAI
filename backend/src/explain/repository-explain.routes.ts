import { Router } from "express";
import { RepositoryExplainController } from "../ai/repository-explain.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const explainController = new RepositoryExplainController();

/**
 * POST /api/explain/repository
 *
 * Repository-level structured explanation endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, question: string }
 * Returns: {
 *   success: true,
 *   explanation: string,
 *   sources: SourceReference[],
 *   metadata: { repository, intent, contextDomainsUsed, strategy },
 *   stats: { searchDurationMs, retrievedChunksCount, finalContextSizeBytes }
 * }
 */
router.post(
  "/repository",
  authenticateToken,
  explainController.explain.bind(explainController)
);

export default router;
