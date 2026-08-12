import { Router } from "express";
import { WorkspaceAnalysisController } from "../ai/workspace-analysis.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const workspaceController = new WorkspaceAnalysisController();

/**
 * GET /api/workspace/overview/:repoName
 * POST /api/workspace/overview
 *
 * Repository Overview endpoint grounded in repository evidence.
 * Protected by JWT (Authorization: Bearer <token>).
 */
router.get(
  "/overview/:repoName",
  authenticateToken,
  workspaceController.getOverview.bind(workspaceController)
);

router.post(
  "/overview",
  authenticateToken,
  workspaceController.getOverview.bind(workspaceController)
);

/**
 * POST /api/workspace/analyze
 *
 * Unified repository health and workspace analysis endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 */
router.post(
  "/analyze",
  authenticateToken,
  workspaceController.analyze.bind(workspaceController)
);

export default router;
