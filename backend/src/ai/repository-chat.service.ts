import { AnalysisPipelineService } from "../github/analysis-pipeline.service";
import { analysisCacheService } from "./analysis-cache.service";
import {
  ContextDomain,
  SourceReference,
} from "./chat-context.service";
import { LLMService } from "./llm.service";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";
import { AIProviderFactory } from "./providers/ai-provider.factory";
import { RepositoryKnowledgeService } from "./repository-knowledge.service";
import { chatSessionService, ChatMessage } from "./chat-session.service";
import { LLMMessage } from "./providers/llm-provider";

const knowledgeService = new RepositoryKnowledgeService();
const defaultLlmService = new LLMService();
const sessionService = chatSessionService;
const MAX_HISTORY_MESSAGES = 20; // 10 user + 10 assistant

export interface ChatResult {
  answer: string;
  contextUsed: ContextDomain[];
  sources: SourceReference[];
  sessionId: string;
}

/**
 * RepositoryChatService
 *
 * Responsibility: Accept a user question about a repository, build the
 * appropriate context from the existing analysis, call LLMService (with optional target provider & model),
 * and return/stream the AI response plus context domains and file source citations.
 */
export class RepositoryChatService extends AIServiceBase {
  constructor(configService?: AIConfigService) {
    super("RepositoryChatService", configService);
  }

  private getLlmService(providerName?: string): LLMService {
    if (providerName && providerName.trim() && providerName.toLowerCase() !== "default") {
      const providerInstance = AIProviderFactory.createProviderByName(
        providerName.trim(),
        this.configService
      );
      return new LLMService(providerInstance, this.configService);
    }
    return defaultLlmService;
  }

  /**
   * Answer a single question about the given repository (non-streaming).
   *
   * @param repository   - The repository slug
   * @param question     - The developer's natural language question
   * @param userId       - The ID of the user requesting
   * @param providerName - Optional target AI provider (e.g. "openai", "nvidia", "qwen")
   * @param model        - Optional target model name (e.g. "gpt-4o", "qwen-max")
   * @param sessionId    - Optional session ID for conversation continuity
   * @returns { answer, contextUsed, sources, sessionId }
   */
  async ask(
    repository: string,
    question: string,
    userId: string,
    providerName?: string,
    model?: string,
    sessionId?: string
  ): Promise<ChatResult> {
    return this.execute(repository, async (context) => {
      const knowledge = knowledgeService.retrieve(repository, question);
      const targetLlmService = this.getLlmService(providerName);
      
      const session = sessionService.getOrCreate(sessionId, repository, userId);
      const recentHistory = session.messages
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const messages: LLMMessage[] = [
        { role: "system", content: "You are an expert software engineer assistant helping a developer understand the codebase. Answer questions accurately based only on the repository context provided. Reference specific file paths and function names when possible.\n\n" + knowledge.prompt },
        ...recentHistory,
        { role: "user", content: question }
      ];

      const answer = await this.trackLLM(context, knowledge.prompt, () =>
        targetLlmService.chatMessages(messages, model)
      );

      const userMsg: ChatMessage = { role: "user", content: question, timestamp: new Date() };
      const assistantMsg: ChatMessage = { role: "assistant", content: answer, timestamp: new Date(), sources: knowledge.sources };
      sessionService.append(session.sessionId, userMsg);
      sessionService.append(session.sessionId, assistantMsg);

      return { 
        answer, 
        contextUsed: knowledge.metadata.contextDomainsUsed, 
        sources: knowledge.sources,
        sessionId: session.sessionId
      };
    }, {
      category: "AIResponses",
      payload: { question, provider: providerName, model, sessionId },
    });
  }

  /**
   * Stream the AI response tokens for a question in real-time.
   *
   * @param repository   - The repository slug
   * @param question     - The developer's natural language question
   * @param userId       - The ID of the user requesting
   * @param onChunk      - Callback invoked as each token chunk arrives from LLMService
   * @param providerName - Optional target AI provider (e.g. "openai", "nvidia", "qwen")
   * @param model        - Optional target model name (e.g. "gpt-4o", "qwen-max")
   * @param sessionId    - Optional session ID for conversation continuity
   * @returns { answer, contextUsed, sources, sessionId }
   */
  async streamAsk(
    repository: string,
    question: string,
    userId: string,
    onChunk: (token: string) => void,
    providerName?: string,
    model?: string,
    sessionId?: string
  ): Promise<ChatResult> {
    return this.execute(repository, async (context) => {
      const knowledge = knowledgeService.retrieve(repository, question);
      const targetLlmService = this.getLlmService(providerName);

      const session = sessionService.getOrCreate(sessionId, repository, userId);
      const recentHistory = session.messages
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // In original code, streamChat takes LLMMessage[]. The prompt has to be in system role.
      // We know `knowledge.prompt` has persona already built-in in `RepoChatContextBuilderService`, but for continuity we need to extract it or just push the new knowledge.
      const messages: LLMMessage[] = [
        { role: "system", content: knowledge.prompt },
        ...recentHistory,
        { role: "user", content: question }
      ];

      const stream = targetLlmService.streamChat(messages, model);

      let fullAnswer = "";

      for await (const chunk of stream) {
        if (chunk) {
          fullAnswer += chunk;
          onChunk(chunk);
        }
      }

      const userMsg: ChatMessage = { role: "user", content: question, timestamp: new Date() };
      const assistantMsg: ChatMessage = { role: "assistant", content: fullAnswer, timestamp: new Date(), sources: knowledge.sources };
      sessionService.append(session.sessionId, userMsg);
      sessionService.append(session.sessionId, assistantMsg);

      return { 
        answer: fullAnswer, 
        contextUsed: knowledge.metadata.contextDomainsUsed, 
        sources: knowledge.sources,
        sessionId: session.sessionId
      };
    });
  }
}
