import { Router } from "express";
import { DocumentationGenerationController } from "../ai/documentation-generation.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const docGenController = new DocumentationGenerationController();

/**
 * POST /api/docs/generate
 *
 * AI-powered documentation generation endpoint.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, documentationType: string }
 * Returns: {
 *   success: true,
 *   documentation: string,
 *   sources: SourceReference[],
 *   metadata: { repository, documentationType, intent, contextDomainsUsed, strategy },
 *   stats: { searchDurationMs, retrievedChunksCount, finalContextSizeBytes }
 * }
 */
router.post(
  "/generate",
  authenticateToken,
  docGenController.generate.bind(docGenController)
);

export default router;
