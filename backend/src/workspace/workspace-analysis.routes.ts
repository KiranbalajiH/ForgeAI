import { Router } from "express";
import { WorkspaceAnalysisController } from "../ai/workspace-analysis.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const workspaceController = new WorkspaceAnalysisController();

/**
 * POST /api/workspace/analyze
 *
 * Unified repository health and workspace analysis endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string }
 * Returns: {
 *   success: true,
 *   analysis: {
 *     repository, overview, technologies, architecture, majorModules,
 *     entryPoints, buildSystem, configFiles, totalFiles,
 *     estimatedComplexity, aiRecommendations, sources,
 *     contextDomainsUsed, stats, analyzedAt
 *   }
 * }
 */
router.post(
  "/analyze",
  authenticateToken,
  workspaceController.analyze.bind(workspaceController)
);

export default router;
