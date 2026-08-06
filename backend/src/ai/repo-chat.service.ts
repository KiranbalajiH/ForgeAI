import { analysisCacheService } from "./analysis-cache.service";
import {
  ChatSessionService,
  ChatMessage,
} from "./chat-session.service";
import { RepoChatContextBuilderService } from "./repo-chat-context-builder.service";
import { Response } from "express";
import { LLMService } from "./llm.service";
import { LLMMessage } from "./providers/llm-provider";

const MAX_HISTORY_MESSAGES = 20; // Max past turns to include (10 user + 10 assistant)

const contextBuilder = new RepoChatContextBuilderService();

// Cache of static system prompts per repoName (built once per repo)
const systemPromptCache = new Map<string, string>();

/**
 * Orchestrates a single chat turn:
 * 1. Validates the cached analysis exists
 * 2. Resolves or creates the chat session
 * 3. Builds LLM messages (system prompt + history + user message)
 * 4. Streams the response back over SSE
 * 5. Persists both messages to the session
 */
export class RepoChatService {
  private llmService: LLMService;
  private sessionService: ChatSessionService;

  constructor(sessionService: ChatSessionService) {
    this.llmService = new LLMService();
    this.sessionService = sessionService;
  }

  async streamChat(
    repoName: string,
    sessionId: string | undefined,
    userMessage: string,
    res: Response
  ): Promise<string> {
    // 1. Validate analysis cache
    const analysis = analysisCacheService.get(repoName);
    if (!analysis) {
      throw new Error(
        `Repository "${repoName}" has not been analyzed yet. Please run analysis first.`
      );
    }

    // 2. Resolve or create session
    const session = this.sessionService.getOrCreate(sessionId, repoName);

    // 3. Get or build the static system prompt (cached per repo)
    let systemPrompt = systemPromptCache.get(repoName);
    if (!systemPrompt) {
      systemPrompt = contextBuilder.buildSystemPrompt(analysis);
      systemPromptCache.set(repoName, systemPrompt);
    }

    // 4. Build dynamic file context for this specific query
    const fileContext = contextBuilder.buildFileContext(analysis, userMessage);

    // Combine system prompt + file context into the system message
    const fullSystemContent = fileContext
      ? `${systemPrompt}\n\n---\n\n${fileContext}`
      : systemPrompt;

    // 5. Assemble LLM messages
    const recentHistory = session.messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const messages: LLMMessage[] = [
      { role: "system", content: fullSystemContent },
      ...recentHistory,
      { role: "user", content: userMessage },
    ];

    // 6. Stream response via SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Session-Id", session.sessionId);

    let fullResponse = "";

    try {
      const stream = this.llmService.streamChat(messages);

      for await (const chunk of stream) {
        if (chunk) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        }
      }

      // Signal completion with sessionId for client to persist
      res.write(
        `data: ${JSON.stringify({ done: true, sessionId: session.sessionId })}\n\n`
      );
      res.end();
    } catch (error: any) {
      const errMsg = error?.message ?? "LLM request failed";
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      res.end();
      throw error;
    }

    // 7. Persist messages to session
    const userMsg: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: fullResponse,
      timestamp: new Date(),
    };

    this.sessionService.append(session.sessionId, userMsg);
    this.sessionService.append(session.sessionId, assistantMsg);

    return session.sessionId;
  }
}
