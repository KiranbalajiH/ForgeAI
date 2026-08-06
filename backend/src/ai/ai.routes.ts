import { Router } from "express";
import { AIController } from "./ai.controller";
import { RepositoryChatController } from "./repository-chat.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const controller = new AIController();
const chatController = new RepositoryChatController();

// One-shot repository analysis report
router.post(
  "/analyze",
  controller.analyzeRepository.bind(controller)
);

// Milestone 1: Single-turn repository Q&A (no streaming, no history)
router.post(
  "/chat",
  authenticateToken,
  chatController.ask.bind(chatController)
);

export default router;