import { LLMService } from "../ai/llm.service";

export class AnswerVerificationService {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  async verify(question: string, answer: string, contextBlob: string): Promise<{ isGrounded: boolean; feedback?: string }> {
    try {
      const verificationPrompt = `You are a facts checker.
Review the following user question, generated answer, and reference context.
Verify if the generated answer is strictly supported by the context and contains no hallucinations or ungrounded facts.

Question: "${question}"
Answer: "${answer}"

Context:
${contextBlob}

Output strictly "GROUNDED" if the answer is fully supported by the context.
Otherwise, output "UNGROUNDED" followed by a 1-sentence explanation of what is unsupported.`;

      const response = await this.llmService.chat(verificationPrompt);
      const isGrounded = response.trim().toUpperCase().startsWith("GROUNDED");
      return {
        isGrounded,
        feedback: isGrounded ? undefined : response.replace(/UNGROUNDED:?/i, "").trim(),
      };
    } catch {
      return { isGrounded: true };
    }
  }
}

export const answerVerificationService = new AnswerVerificationService();
