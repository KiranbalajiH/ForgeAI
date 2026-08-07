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

const pipeline = new AnalysisPipelineService();
const contextService = new ChatContextService();
const llmService = new LLMService();

export interface ChatResult {
  answer: string;
  contextUsed: ContextDomain[];
  sources: SourceReference[];
}

/**
 * RepositoryChatService
 *
 * Responsibility: Accept a user question about a repository, build the
 * appropriate context from the existing analysis, call LLMService, and
 * return/stream the AI response plus context domains and file source citations.
 *
 * - Does NOT duplicate analysis: reads from AnalysisCacheService first,
 *   and only falls back to AnalysisPipelineService if no cache entry exists.
 * - Does NOT handle conversation history.
 */
export class RepositoryChatService extends AIServiceBase {
  constructor(configService?: AIConfigService) {
    super("RepositoryChatService", configService);
  }

  /**
   * Answer a single question about the given repository (non-streaming).
   *
   * @param repository - The repository slug
   * @param question   - The developer's natural language question
   * @returns { answer, contextUsed, sources }
   */
  async ask(repository: string, question: string): Promise<ChatResult> {
    return this.execute(repository, async (context) => {
      let analysis = analysisCacheService.get(repository);

      if (!analysis) {
        analysis = pipeline.analyze(repository);
      }

    const { prompt, contextUsed, sources } = contextService.build(
      analysis,
      question
    );

      const answer = await this.trackLLM(context, prompt, () =>
        llmService.chat(prompt)
      );

      return { answer, contextUsed, sources };
    }, {
      category: "AIResponses",
      payload: { question },
    });
  }

  /**
   * Stream the AI response tokens for a question in real-time.
   *
   * @param repository - The repository slug
   * @param question   - The developer's natural language question
   * @param onChunk    - Callback invoked as each token chunk arrives from LLMService
   * @returns { answer, contextUsed, sources }
   */
  async streamAsk(
    repository: string,
    question: string,
    onChunk: (token: string) => void
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

    const stream = llmService.streamChat([
      { role: "user", content: prompt },
    ]);

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
