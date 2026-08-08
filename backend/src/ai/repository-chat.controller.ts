import { Request, Response } from "express";
import { RepositoryChatService } from "./repository-chat.service";

const repositoryChatService = new RepositoryChatService();

export class RepositoryChatController {
  /**
   * GET /api/chat/providers
   * Returns list of supported AI providers and their configured models.
   */
  async getProviders(_req: Request, res: Response) {
    try {
      return res.json({
        success: true,
        defaultProvider: "openai",
        providers: [
          {
            id: "openai",
            name: "OpenAI",
            models: [
              "gpt-4o",
              "gpt-4o-mini",
              "gpt-4-turbo",
              "gpt-3.5-turbo",
              "o1-preview",
              "o1-mini",
            ],
          },
          {
            id: "nvidia",
            name: "NVIDIA NIM",
            models: [
              "meta/llama-3.1-405b-instruct",
              "meta/llama-3.1-70b-instruct",
              "meta/llama-3.1-8b-instruct",
              "mistralai/mixtral-8x22b-instruct-v0.1",
              "nvidia/nemotron-4-340b-instruct",
            ],
          },
          {
            id: "qwen",
            name: "Qwen",
            models: [
              "qwen-max",
              "qwen-plus",
              "qwen-turbo",
              "qwen-long",
              "qwen-vl-plus",
              "qwen-vl-max",
            ],
          },
        ],
      });
    } catch (error: any) {
      console.error("[RepositoryChatController] Error listing providers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to list AI providers",
      });
    }
  }

  /**
   * POST /api/chat/repository
   * Body: { repository: string, question: string, provider?: string, model?: string, stream?: boolean }
   */
  async ask(req: Request, res: Response) {
    try {
      const { repository, question, provider, model, stream = true } = req.body;

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
      const targetProvider = provider && typeof provider === "string" ? provider.trim() : undefined;
      const targetModel = model && typeof model === "string" ? model.trim() : undefined;

      // Non-streaming requested explicitly
      if (req.headers.accept === "application/json" && req.body.stream === false) {
        const { answer, contextUsed, sources } = await repositoryChatService.ask(
          repoName,
          q,
          targetProvider,
          targetModel
        );

        return res.json({
          success: true,
          answer,
          metadata: {
            repository: repoName,
            provider: targetProvider || "default",
            model: targetModel,
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
        },
        targetProvider,
        targetModel
      );

      // Signal completion with metadata & sources
      res.write(
        `data: ${JSON.stringify({
          done: true,
          metadata: {
            repository: repoName,
            provider: targetProvider || "default",
            model: targetModel,
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
