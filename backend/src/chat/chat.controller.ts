import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { chatService } from "./chat.service";
import { chatSessionService } from "../ai/chat-session.service";

export class ChatController {
  async getProviders(_req: AuthRequest, res: Response) {
    return res.json({
      success: true,
      defaultProvider: "openai",
      providers: [
        {
          id: "openai",
          name: "OpenAI",
          models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
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
          models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long", "qwen-vl-plus", "qwen-vl-max"],
        },
      ],
    });
  }

  async listSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const sessions = chatSessionService.listByRepo("default", userId);
      const mappedSessions = sessions.map((s) => ({
        sessionId: s.sessionId,
        createdAt: s.createdAt,
        title: s.title || (s.messages.length > 0 
          ? s.messages[0].content.substring(0, 60) + (s.messages[0].content.length > 60 ? "..." : "")
          : "New Conversation"),
      }));

      mappedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({
        success: true,
        sessions: mappedSessions,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = chatSessionService.get(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }
      return res.json({
        success: true,
        session,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async renameSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { title } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }
      const success = chatSessionService.rename(sessionId, title.trim());
      if (!success) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }
      const session = chatSessionService.get(sessionId);
      return res.json({
        success: true,
        session: {
          sessionId,
          title: session?.title,
          createdAt: session?.createdAt,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const success = chatSessionService.delete(sessionId);
      if (!success) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }
      return res.json({ success: true, message: "Session deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async ask(req: AuthRequest, res: Response) {
    try {
      const { question, sessionId, provider, model, stream = true } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!question) {
        return res.status(400).json({ success: false, message: "Question is required" });
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        
        // flushHeaders might not be a function on express 5 response, let's write headers directly using writeHead or check if flushHeaders exists.
        // Usually res.writeHead(200, headers) or res.writeHead is safer across express versions.
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        const generator = chatService.streamAsk(question, sessionId, userId, provider, model);

        for await (const chunk of generator) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.end();
      } else {
        const result = await chatService.ask(question, sessionId, userId, provider, model);
        return res.json(result);
      }
    } catch (error: any) {
      console.error("[ChatController] Error asking query:", error);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: error.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  }
}
