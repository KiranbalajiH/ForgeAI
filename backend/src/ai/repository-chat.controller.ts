import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { RepositoryChatService } from "./repository-chat.service";
import { repositoryIndexService } from "../github/repository-index.service";
import { analysisCacheService } from "./analysis-cache.service";
import { ChatSessionService } from "./chat-session.service";

const repositoryChatService = new RepositoryChatService();
const chatSessionService = new ChatSessionService();

export class RepositoryChatController {
  /**
   * GET /api/chat/providers
   * Returns list of supported AI providers and their configured models.
   */
  async getProviders(_req: AuthRequest, res: Response) {
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
   * GET /api/chat/repository/:repoName/sessions
   */
  async listSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const repoName = req.params.repoName;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!repoName) {
        return res.status(400).json({ success: false, message: "repoName is required" });
      }

      const sessions = chatSessionService.listByRepo(repoName, userId);

      const mappedSessions = sessions.map((s) => ({
        sessionId: s.sessionId,
        createdAt: s.createdAt,
        title: s.title || (s.messages.length > 0 
          ? s.messages[0].content.substring(0, 60) + (s.messages[0].content.length > 60 ? "..." : "")
          : "New Conversation"),
      }));

      // Sort newest first
      mappedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({
        success: true,
        sessions: mappedSessions,
      });
    } catch (error: any) {
      console.error("[RepositoryChatController] Error listing sessions:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to list sessions",
      });
    }
  }

  /**
   * GET /api/chat/repository/:repoName/sessions/:sessionId
   */
  async getSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { repoName, sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const session = chatSessionService.get(sessionId);

      if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }

      if (session.userId !== userId || session.repoName !== repoName) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      return res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          createdAt: session.createdAt,
          title: session.title || (session.messages.length > 0
            ? session.messages[0].content.substring(0, 60) + (session.messages[0].content.length > 60 ? "..." : "")
            : "New Conversation"),
          messages: session.messages,
        },
      });
    } catch (error: any) {
      console.error("[RepositoryChatController] Error getting session:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get session",
      });
    }
  }

  /**
   * PATCH /api/chat/repository/:repoName/sessions/:sessionId
   */
  async renameSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { repoName, sessionId } = req.params;
      const { title } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }

      const session = chatSessionService.get(sessionId);

      if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }

      if (session.userId !== userId || session.repoName !== repoName) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      chatSessionService.rename(sessionId, title.trim());

      return res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          title: title.trim(),
          createdAt: session.createdAt,
        },
      });
    } catch (error: any) {
      console.error("[RepositoryChatController] Error renaming session:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to rename session",
      });
    }
  }

  /**
   * DELETE /api/chat/repository/:repoName/sessions/:sessionId
   */
  async deleteSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { repoName, sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const session = chatSessionService.get(sessionId);

      if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }

      if (session.userId !== userId || session.repoName !== repoName) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      chatSessionService.delete(sessionId);

      return res.json({
        success: true,
        message: "Session deleted successfully",
      });
    } catch (error: any) {
      console.error("[RepositoryChatController] Error deleting session:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete session",
      });
    }
  }

  /**
   * POST /api/chat/repository
   * Body: { repository: string, question: string, provider?: string, model?: string, stream?: boolean, sessionId?: string }
   */
  async ask(req: AuthRequest, res: Response) {
    try {
      const { repository, question, provider, model, stream = true, sessionId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

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

      const statusInfo = repositoryIndexService.getStatus(repoName);
      const hasValidIndex = Boolean(
        repositoryIndexService.getIndex(repoName) || analysisCacheService.get(repoName)
      );

      if (!hasValidIndex) {
        if (statusInfo.status === "NOT_INDEXED") {
          const message = `⚠️ Repository "${repoName}" is not indexed yet. Please index the repository to enable Repository Chat.`;
          if (req.headers.accept === "application/json" && req.body.stream === false) {
            return res.status(400).json({ success: false, message, status: statusInfo });
          }
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.write(`data: ${JSON.stringify({ token: message })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true, metadata: { repository: repoName, status: statusInfo }, sources: [] })}\n\n`);
          return res.end();
        }

        if (statusInfo.status === "INDEXING") {
          const message = `ℹ️ Repository "${repoName}" is currently being indexed. Chat will be available once indexing completes.`;
          if (req.headers.accept === "application/json" && req.body.stream === false) {
            return res.status(400).json({ success: false, message, status: statusInfo });
          }
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.write(`data: ${JSON.stringify({ token: message })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true, metadata: { repository: repoName, status: statusInfo }, sources: [] })}\n\n`);
          return res.end();
        }

        if (statusInfo.status === "FAILED") {
          const message = `⚠️ Repository "${repoName}" indexing failed: ${statusInfo.indexError || "Unknown error"}. Please retry indexing.`;
          if (req.headers.accept === "application/json" && req.body.stream === false) {
            return res.status(400).json({ success: false, message, status: statusInfo });
          }
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.write(`data: ${JSON.stringify({ token: message })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true, metadata: { repository: repoName, status: statusInfo }, sources: [] })}\n\n`);
          return res.end();
        }
      }

      // Non-streaming requested explicitly
      if (req.headers.accept === "application/json" && req.body.stream === false) {
        const result = await repositoryChatService.ask(
          repoName,
          q,
          userId,
          targetProvider,
          targetModel,
          sessionId
        );

        return res.json({
          success: true,
          answer: result.answer,
          metadata: {
            repository: repoName,
            provider: targetProvider || "default",
            model: targetModel,
            contextUsed: result.contextUsed,
            sources: result.sources,
            sessionId: result.sessionId,
          },
          sources: result.sources,
        });
      }

      // Default: Server-Sent Events (SSE) streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const result = await repositoryChatService.streamAsk(
        repoName,
        q,
        userId,
        (token: string) => {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        },
        targetProvider,
        targetModel,
        sessionId
      );

      // Signal completion with metadata & sources
      res.write(
        `data: ${JSON.stringify({
          done: true,
          metadata: {
            repository: repoName,
            provider: targetProvider || "default",
            model: targetModel,
            contextUsed: result.contextUsed,
            sources: result.sources,
            sessionId: result.sessionId,
          },
          sources: result.sources,
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
