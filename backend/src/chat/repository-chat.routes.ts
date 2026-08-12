import { Router } from "express";
import { RepositoryChatController } from "../ai/repository-chat.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const chatController = new RepositoryChatController();

/**
 * GET /api/chat/providers
 * Returns configured AI providers and models.
 */
router.get(
  "/providers",
  authenticateToken,
  chatController.getProviders.bind(chatController)
);

/**
 * GET /api/chat/repository/:repoName/sessions
 * List chat sessions for the authenticated user and repository.
 */
router.get(
  "/repository/:repoName/sessions",
  authenticateToken,
  chatController.listSessions.bind(chatController)
);

/**
 * GET /api/chat/repository/:repoName/sessions/:sessionId
 * Get a specific chat session for the authenticated user.
 */
router.get(
  "/repository/:repoName/sessions/:sessionId",
  authenticateToken,
  chatController.getSession.bind(chatController)
);

/**
 * PATCH /api/chat/repository/:repoName/sessions/:sessionId
 * Rename a specific chat session.
 */
router.patch(
  "/repository/:repoName/sessions/:sessionId",
  authenticateToken,
  chatController.renameSession.bind(chatController)
);

/**
 * DELETE /api/chat/repository/:repoName/sessions/:sessionId
 * Delete a specific chat session.
 */
router.delete(
  "/repository/:repoName/sessions/:sessionId",
  authenticateToken,
  chatController.deleteSession.bind(chatController)
);

/**
 * POST /api/chat/repository
 * Single-turn / streaming repository Q&A.
 */
router.post(
  "/repository",
  authenticateToken,
  chatController.ask.bind(chatController)
);

export default router;
