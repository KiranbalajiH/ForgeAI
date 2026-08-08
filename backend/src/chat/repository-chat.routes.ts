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
 * POST /api/chat/repository
 * Single-turn / streaming repository Q&A.
 */
router.post(
  "/repository",
  authenticateToken,
  chatController.ask.bind(chatController)
);

export default router;
