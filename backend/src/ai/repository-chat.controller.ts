import { Request, Response } from "express";
import { RepositoryChatService } from "./repository-chat.service";

const repositoryChatService = new RepositoryChatService();

/**
 * RepositoryChatController
 *
 * Exposes:
 *   POST /api/chat/repository
 *     Body:    { repository: string, question: string }
 *     Returns: { success: true, answer: string, metadata: { repository, contextUsed } }
 */
export class RepositoryChatController {
  async ask(req: Request, res: Response) {
    try {
      const { repository, question } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({
          success: false,
          message: "question is required",
        });
      }

      const { answer, contextUsed } = await repositoryChatService.ask(
        repository.trim(),
        question.trim()
      );

      return res.json({
        success: true,
        answer,
        metadata: {
          repository: repository.trim(),
          contextUsed,
        },
      });
    } catch (error: any) {
      console.error("[RepositoryChatController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate answer",
      });
    }
  }
}
