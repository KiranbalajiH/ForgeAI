import { agentOrchestratorService } from "../agent/agent-orchestrator.service";
import { contextAssemblyService } from "../context/context-assembly.service";
import { answerGenerationService } from "../generation/answer-generation.service";
import { citationService } from "../sources/citation.service";
import { chatSessionService } from "../ai/chat-session.service";
import { logger } from "../utils/logger";
import { SourceReference, Citation } from "../sources/source.types";

export interface ChatSessionMetadata {
  repository: string;
  provider?: string;
  model?: string;
  contextUsed: { category: string; count: number }[];
  sources: SourceReference[];
  citations?: Citation[];
  sessionId?: string;
}

export class ChatService {
  async ask(
    question: string,
    sessionId: string | undefined,
    userId: string,
    provider?: string,
    model?: string
  ) {
    const session = chatSessionService.getOrCreate(sessionId, "default", userId);

    // Save user message in history
    chatSessionService.append(session.sessionId, {
      role: "user",
      content: question,
      timestamp: new Date(),
    });

    // 1. Agent Orchestrator: classify query intent and execute appropriate tool(s)
    let toolsUsed: string[] = [];
    let rawSources: any[] = [];

    try {
      const orchestratorResult = await agentOrchestratorService.planAndExecute(question);
      toolsUsed = orchestratorResult.toolsUsed;
      rawSources = orchestratorResult.sources;
    } catch (err) {
      logger.error("[ChatService] Agent orchestrator execution failed:", err);
      toolsUsed = [];
      rawSources = [];
    }

    // Edge Case: No relevant sources returned by tools
    if (!rawSources || rawSources.length === 0) {
      const fallbackAnswer =
        "The system could not retrieve relevant information from the knowledge base, web search, or external APIs to answer your question.";

      chatSessionService.append(session.sessionId, {
        role: "assistant",
        content: fallbackAnswer,
        timestamp: new Date(),
        sources: [],
      });

      return {
        success: true,
        answer: fallbackAnswer,
        metadata: {
          repository: "default",
          provider,
          model,
          contextUsed: toolsUsed.map((t) => ({ category: t, count: 0 })),
          sources: [],
          citations: [],
          sessionId: session.sessionId,
        },
        sources: [],
        citations: [],
      };
    }

    // 2. Assemble context
    const { contextBlob, sourcesUsed } = contextAssemblyService.assemble(rawSources);

    // 3. Generate grounded LLM answer
    let finalAnswer = "";
    try {
      finalAnswer = await answerGenerationService.generate(question, contextBlob, model);
    } catch (err: any) {
      logger.error("[ChatService] LLM generation failed:", err);
      finalAnswer = `Error generating answer: ${err.message || "Failed to reach AI service."}`;
    }

    // 4. Format structured citations
    const formattedSources = citationService.format(sourcesUsed);
    const structuredCitations = citationService.formatCitations(sourcesUsed);

    // Save assistant message to history
    chatSessionService.append(session.sessionId, {
      role: "assistant",
      content: finalAnswer,
      timestamp: new Date(),
      sources: formattedSources,
    });

    const metadata: ChatSessionMetadata = {
      repository: "default",
      provider,
      model,
      contextUsed: toolsUsed.map((t) => ({
        category: t,
        count: sourcesUsed.filter((s) => s.sourceType === t.replace("_search", "")).length,
      })),
      sources: formattedSources,
      citations: structuredCitations,
      sessionId: session.sessionId,
    };

    return {
      success: true,
      answer: finalAnswer,
      metadata,
      sources: formattedSources,
      citations: structuredCitations,
    };
  }

  async *streamAsk(
    question: string,
    sessionId: string | undefined,
    userId: string,
    provider?: string,
    model?: string
  ): AsyncGenerator<
    {
      token?: string;
      done?: boolean;
      metadata?: ChatSessionMetadata;
      sources?: SourceReference[];
      citations?: Citation[];
    },
    void,
    unknown
  > {
    const session = chatSessionService.getOrCreate(sessionId, "default", userId);

    chatSessionService.append(session.sessionId, {
      role: "user",
      content: question,
      timestamp: new Date(),
    });

    // 1. Agent Orchestrator: classify query intent and execute tool(s)
    let toolsUsed: string[] = [];
    let rawSources: any[] = [];

    try {
      const orchestratorResult = await agentOrchestratorService.planAndExecute(question);
      toolsUsed = orchestratorResult.toolsUsed;
      rawSources = orchestratorResult.sources;
    } catch (err) {
      logger.error("[ChatService] Agent orchestrator execution failed in streamAsk:", err);
      toolsUsed = [];
      rawSources = [];
    }

    // Edge Case: No relevant sources returned by tools
    if (!rawSources || rawSources.length === 0) {
      const fallbackAnswer =
        "The system could not retrieve relevant information from the knowledge base, web search, or external APIs to answer your question.";

      yield { token: fallbackAnswer };

      chatSessionService.append(session.sessionId, {
        role: "assistant",
        content: fallbackAnswer,
        timestamp: new Date(),
        sources: [],
      });

      yield {
        done: true,
        metadata: {
          repository: "default",
          provider,
          model,
          contextUsed: toolsUsed.map((t) => ({ category: t, count: 0 })),
          sources: [],
          citations: [],
          sessionId: session.sessionId,
        },
        sources: [],
        citations: [],
      };
      return;
    }

    // 2. Assemble context
    const { contextBlob, sourcesUsed } = contextAssemblyService.assemble(rawSources);

    // 3. Stream LLM tokens
    let fullAnswer = "";
    try {
      const tokenGenerator = answerGenerationService.streamGenerate(question, contextBlob, model);
      for await (const token of tokenGenerator) {
        fullAnswer += token;
        yield { token };
      }
    } catch (err: any) {
      logger.error("[ChatService] LLM stream generation error:", err);
      const errorMsg = `\n\n[Error generating answer: ${err.message || "AI Service unavailable"}]`;
      fullAnswer += errorMsg;
      yield { token: errorMsg };
    }

    // 4. Format structured citations
    const formattedSources = citationService.format(sourcesUsed);
    const structuredCitations = citationService.formatCitations(sourcesUsed);

    chatSessionService.append(session.sessionId, {
      role: "assistant",
      content: fullAnswer,
      timestamp: new Date(),
      sources: formattedSources,
    });

    const metadata: ChatSessionMetadata = {
      repository: "default",
      provider,
      model,
      contextUsed: toolsUsed.map((t) => ({
        category: t,
        count: sourcesUsed.filter((s) => s.sourceType === t.replace("_search", "")).length,
      })),
      sources: formattedSources,
      citations: structuredCitations,
      sessionId: session.sessionId,
    };

    yield {
      done: true,
      metadata,
      sources: formattedSources,
      citations: structuredCitations,
    };
  }
}

export const chatService = new ChatService();
