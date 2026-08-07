import {
  RepositoryKnowledgeService,
  RepositoryKnowledgeResult,
  KnowledgeRetrievalOptions,
} from "./repository-knowledge.service";
import { LLMService } from "./llm.service";
import { SourceReference } from "./chat-context.service";
import { KnowledgeSearchMetadata, KnowledgeRetrievalStats } from "./repository-knowledge.service";
import { executeWithTelemetry } from "./ai-service.wrapper";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";


export interface ExplainResult {
  /** The generated explanation from the LLM */
  explanation: string;
  /** Citable source file references */
  sources: SourceReference[];
  /** Search and context domain metadata */
  metadata: KnowledgeSearchMetadata;
  /** Retrieval performance statistics */
  stats: KnowledgeRetrievalStats;
  /** Retrieval strategy used ("semantic" | "broad_fallback") */
  strategy: string;
}

/**
 * RepositoryExplainService
 *
 * Responsibility:
 *  1. Accept a repository and a repository-level question.
 *  2. Delegate knowledge retrieval to RepositoryKnowledgeService.
 *  3. Wrap the retrieved prompt with an explanation-focused persona.
 *  4. Call LLMService and return a structured ExplainResult.
 *
 * Key difference from RepositoryChatService:
 *  - Applies an explanation persona (thorough, educational, structured Markdown output).
 *  - Non-streaming only — designed for document-style explanations, not interactive Q&A.
 *  - Returns retrieval metadata and strategy alongside the explanation.
 */
export class RepositoryExplainService extends AIServiceBase {
  private knowledgeService: RepositoryKnowledgeService;
  private llmService: LLMService;

  constructor(
    knowledgeService?: RepositoryKnowledgeService,
    llmService?: LLMService,
    configService?: AIConfigService
  ) {
    super("RepositoryExplainService", configService);
    this.knowledgeService = knowledgeService ?? new RepositoryKnowledgeService(undefined, undefined, undefined, undefined, configService);
    this.llmService = llmService ?? new LLMService(undefined, configService);
  }

  /**
   * Explain a repository concept or component based on a structured question.
   *
   * @param repository - Repository slug / name
   * @param question   - Repository-level question or explanation request
   * @param options    - Optional retrieval tuning parameters
   */
  async explain(
    repository: string,
    question: string,
    options?: KnowledgeRetrievalOptions
  ): Promise<ExplainResult> {
    return this.execute(repository, async (context) => {
        // 1. Retrieve structured knowledge via RepositoryKnowledgeService
    const knowledgeResult: RepositoryKnowledgeResult = this.knowledgeService.retrieve(
      repository,
      question,
      options
    );

    // 2. Wrap the retrieved prompt with an explanation-focused system persona.
    //    The knowledge prompt already contains all relevant context sections;
    //    we prepend a structured explanation directive and append the question.
    const explanationPrompt = this.buildExplanationPrompt(knowledgeResult.prompt, question);

    // 3. Call LLMService
    const explanation = await this.trackLLM(context, explanationPrompt, () =>
      this.llmService.chat(explanationPrompt)
    );

    return {
      explanation,
      sources: knowledgeResult.sources,
      metadata: knowledgeResult.metadata,
      stats: knowledgeResult.stats,
      strategy: knowledgeResult.strategy,
    };
    }, {
      category: "AIResponses",
      payload: { question, options },
    });
  }

  /**
   * Wraps the retrieved knowledge prompt with an explanation-focused persona and instructions.
   */
  private buildExplanationPrompt(knowledgePrompt: string, question: string): string {
    return [
      `You are an expert software documentation author and senior software engineer.`,
      `Your task is to produce a thorough, structured, and educational explanation about the repository described below.`,
      ``,
      `Guidelines:`,
      `- Use clear Markdown formatting with headings, bullet lists, and code blocks.`,
      `- Reference specific file paths, class names, functions, and API routes from the context.`,
      `- Explain the "why" (design decisions) as well as the "what" (implementation details).`,
      `- Be comprehensive but precise. Avoid padding.`,
      `- If the context does not contain sufficient information to answer, clearly state what is unknown.`,
      ``,
      `---`,
      ``,
      knowledgePrompt,
      ``,
      `---`,
      ``,
      `## Explanation Request`,
      question,
    ].join("\n");
  }
}
