import { Router } from "express";
import { RepositoryChatController } from "../ai/repository-chat.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const chatController = new RepositoryChatController();

/**
 * POST /api/chat/repository
 *
 * Single-turn repository Q&A.
 * Protected by JWT (Authorization: Bearer <token>).
 *
 * Body:    { repository: string, question: string }
 * Returns: { success: true, answer: string, metadata: { repository, contextUsed } }
 */
router.post(
  "/repository",
  authenticateToken,
  chatController.ask.bind(chatController)
);

export default router;
