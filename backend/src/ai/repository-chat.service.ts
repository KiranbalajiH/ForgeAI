import { AnalysisPipelineService } from "../github/analysis-pipeline.service";
import { analysisCacheService } from "./analysis-cache.service";
import {
  ChatContextService,
  ContextDomain,
  SourceReference,
} from "./chat-context.service";
import { LLMService } from "./llm.service";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";
import { AIProviderFactory } from "./providers/ai-provider.factory";

const pipeline = new AnalysisPipelineService();
const contextService = new ChatContextService();
const defaultLlmService = new LLMService();

export interface ChatResult {
  answer: string;
  contextUsed: ContextDomain[];
  sources: SourceReference[];
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
   * @param providerName - Optional target AI provider (e.g. "openai", "nvidia", "qwen")
   * @param model        - Optional target model name (e.g. "gpt-4o", "qwen-max")
   * @returns { answer, contextUsed, sources }
   */
  async ask(
    repository: string,
    question: string,
    providerName?: string,
    model?: string
  ): Promise<ChatResult> {
    return this.execute(repository, async (context) => {
      let analysis = analysisCacheService.get(repository);

      if (!analysis) {
        analysis = pipeline.analyze(repository);
      }

      const { prompt, contextUsed, sources } = contextService.build(
        analysis,
        question
      );

      const targetLlmService = this.getLlmService(providerName);

      const answer = await this.trackLLM(context, prompt, () =>
        targetLlmService.chat(prompt, model)
      );

      return { answer, contextUsed, sources };
    }, {
      category: "AIResponses",
      payload: { question, provider: providerName, model },
    });
  }

  /**
   * Stream the AI response tokens for a question in real-time.
   *
   * @param repository   - The repository slug
   * @param question     - The developer's natural language question
   * @param onChunk      - Callback invoked as each token chunk arrives from LLMService
   * @param providerName - Optional target AI provider (e.g. "openai", "nvidia", "qwen")
   * @param model        - Optional target model name (e.g. "gpt-4o", "qwen-max")
   * @returns { answer, contextUsed, sources }
   */
  async streamAsk(
    repository: string,
    question: string,
    onChunk: (token: string) => void,
    providerName?: string,
    model?: string
  ): Promise<ChatResult> {
    return this.execute(repository, async (context) => {
      let analysis = analysisCacheService.get(repository);

      if (!analysis) {
        analysis = pipeline.analyze(repository);
      }

      const { prompt, contextUsed, sources } = contextService.build(
        analysis,
        question
      );

      const targetLlmService = this.getLlmService(providerName);

      const stream = targetLlmService.streamChat(
        [{ role: "user", content: prompt }],
        model
      );

      let fullAnswer = "";

      for await (const chunk of stream) {
        if (chunk) {
          fullAnswer += chunk;
          onChunk(chunk);
        }
      }

      return { answer: fullAnswer, contextUsed, sources };
    });
  }
}
