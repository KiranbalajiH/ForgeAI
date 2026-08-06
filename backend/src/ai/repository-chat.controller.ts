import { Request, Response } from "express";
import { RepositoryChatService } from "./repository-chat.service";

const repositoryChatService = new RepositoryChatService();

/**
 * RepositoryChatController
 *
 * Exposes:
 *   POST /api/chat/repository
 *     Body: { repository: string, question: string, stream?: boolean }
 *
 *     - If streaming (default): Streams SSE tokens (data: { token }), completes with data: { done, metadata, sources }
 *     - If non-streaming: Returns standard JSON { success, answer, metadata, sources }
 */
export class RepositoryChatController {
  async ask(req: Request, res: Response) {
    try {
      const { repository, question, stream = true } = req.body;

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

      const repoName = repository.trim();
      const q = question.trim();

      // Non-streaming requested explicitly
      if (req.headers.accept === "application/json" && req.body.stream === false) {
        const { answer, contextUsed, sources } = await repositoryChatService.ask(
          repoName,
          q
        );

        return res.json({
          success: true,
          answer,
          metadata: {
            repository: repoName,
            contextUsed,
            sources,
          },
          sources,
        });
      }

      // Default: Server-Sent Events (SSE) streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const { contextUsed, sources } = await repositoryChatService.streamAsk(
        repoName,
        q,
        (token: string) => {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      );

      // Signal completion with metadata & sources
      res.write(
        `data: ${JSON.stringify({
          done: true,
          metadata: {
            repository: repoName,
            contextUsed,
            sources,
          },
          sources,
        })}\n\n`
      );

      return res.end();
    } catch (error: any) {
      console.error("[RepositoryChatController] Error:", error);

      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message ?? "Streaming failed" })}\n\n`);
        return res.end();
      }

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate answer",
      });
    }
  }
}
