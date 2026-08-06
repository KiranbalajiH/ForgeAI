import { Request, Response } from "express";
import { RepoChatService } from "../ai/repo-chat.service";
import { ChatSessionService } from "../ai/chat-session.service";
import { analysisCacheService } from "../ai/analysis-cache.service";

const sessionService = new ChatSessionService();
const chatService = new RepoChatService(sessionService);

export class RepoChatController {
  /**
   * POST /repo/:repoName/chat
   *
   * Start or continue a chat session about a repository.
   * Streams the AI response as Server-Sent Events (SSE).
   *
   * Body: { sessionId?: string, message: string }
   */
  async chat(req: Request, res: Response) {
    const repoName = Array.isArray(req.params.repoName)
      ? req.params.repoName[0]
      : req.params.repoName;

    const { sessionId, message } = req.body;

    if (!repoName) {
      return res.status(400).json({
        success: false,
        message: "repoName is required",
      });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "message is required and must be a non-empty string",
      });
    }

    if (!analysisCacheService.has(repoName)) {
      return res.status(404).json({
        success: false,
        message: `Repository "${repoName}" has not been analyzed yet. Please run POST /repo/analyze first.`,
      });
    }

    try {
      await chatService.streamChat(repoName, sessionId, message.trim(), res);
    } catch (error: any) {
      console.error("[RepoChatController] streamChat error:", error);

      // Only send JSON error if headers not yet sent (i.e., SSE stream not started)
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: error.message ?? "Failed to generate response",
        });
      }
    }
  }

  /**
   * GET /repo/:repoName/chat/:sessionId
   *
   * Retrieve full conversation history for a session.
   */
  getSession(req: Request, res: Response) {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;

    const session = sessionService.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    return res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        repoName: session.repoName,
        createdAt: session.createdAt,
        messages: session.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      },
    });
  }

  /**
   * DELETE /repo/:repoName/chat/:sessionId
   *
   * Delete a chat session and its history.
   */
  deleteSession(req: Request, res: Response) {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;

    const deleted = sessionService.delete(sessionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    return res.json({
      success: true,
      message: "Session deleted",
    });
  }
}
