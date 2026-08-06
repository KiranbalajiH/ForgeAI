import { AnalysisPipelineService } from "../github/analysis-pipeline.service";
import { analysisCacheService } from "./analysis-cache.service";
import {
  ChatContextService,
  ContextDomain,
  SourceReference,
} from "./chat-context.service";
import { LLMService } from "./llm.service";

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
 * return the AI response plus context domains and file source citations.
 *
 * - Does NOT duplicate analysis: reads from AnalysisCacheService first,
 *   and only falls back to AnalysisPipelineService if no cache entry exists.
 * - Does NOT handle conversation history.
 * - Does NOT stream.
 */
export class RepositoryChatService {
  /**
   * Answer a single question about the given repository.
   *
   * @param repository - The repository slug (must already be cloned)
   * @param question   - The developer's natural language question
   * @returns { answer, contextUsed, sources }
   */
  async ask(repository: string, question: string): Promise<ChatResult> {
    // 1. Resolve analysis — cache-first, pipeline fallback
    let analysis = analysisCacheService.get(repository);

    if (!analysis) {
      analysis = pipeline.analyze(repository);
    }

    // 2. Build context + track which domains & source files were injected
    const { prompt, contextUsed, sources } = contextService.build(
      analysis,
      question
    );

    // 3. Single-turn LLM call via the existing LLMService abstraction
    const answer = await llmService.chat(prompt);

    return { answer, contextUsed, sources };
  }
}
