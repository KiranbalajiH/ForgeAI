import { OpenRouterProvider } from "./providers/openrouter.provider";
import { LLMProvider } from "./providers/llm-provider";

export class LLMService {
  private provider: LLMProvider;

  constructor() {
    this.provider = new OpenRouterProvider();
  }

  async chat(prompt: string): Promise<string> {
    return this.provider.chat(prompt);
  }

  async chatMessages(messages: import("./providers/llm-provider").LLMMessage[]): Promise<string> {
    return this.provider.chatMessages(messages);
  }

  streamChat(messages: import("./providers/llm-provider").LLMMessage[]): AsyncGenerator<string, void, unknown> {
    return this.provider.streamChat(messages);
  }
}