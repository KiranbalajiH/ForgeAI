import { LLMService } from "../ai/llm.service";
import { LLMMessage } from "../ai/providers/llm-provider";

export class AnswerGenerationService {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  buildSystemPrompt(contextBlob: string): string {
    return `You are a grounded AI Knowledge Assistant.
Answer the user's question using ONLY the facts and evidence provided in the context below.

Context & Grounding Rules:
- The context below may contain internal knowledge base documents, public web search results, or real-time API function data.
- Clearly distinguish between source types when explaining your answer (e.g., internal policies, live web news, or API exchange rate data).
- Do NOT invent facts or extrapolate beyond what is explicitly stated in the context.
- Do NOT claim that a web search occurred or that an API was called unless actual web search or API results are present in the context.
- If the provided context does not contain enough information to answer the question, state clearly that the required information is not available.

Citation Instructions:
- Cite sources using bracketed numbers like [1], [2], corresponding to their source entry in the context.

---
CONTEXT:
${contextBlob}
---`;
  }

  async generate(question: string, contextBlob: string, model?: string): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(contextBlob);
    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ];
    return this.llmService.chatMessages(messages, model);
  }

  async *streamGenerate(
    question: string,
    contextBlob: string,
    model?: string
  ): AsyncGenerator<string, void, unknown> {
    const systemPrompt = this.buildSystemPrompt(contextBlob);
    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ];
    yield* this.llmService.streamChat(messages, model);
  }
}

export const answerGenerationService = new AnswerGenerationService();
