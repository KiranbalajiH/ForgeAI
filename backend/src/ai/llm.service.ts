import { LLMProvider as AIProvider, LLMMessage as AIMessage } from "./providers/llm-provider";
import { ProviderSelectionService, defaultProviderSelectionService } from "./providers/provider-selection.service";
import { AIConfigService } from "./ai-config.service";

export class LLMService {
  private selectionService: ProviderSelectionService;
  // Retain fixed provider support for backwards compatibility if passed explicitly
  private fixedProvider?: AIProvider;

  constructor(provider?: AIProvider, configService?: AIConfigService, selectionService?: ProviderSelectionService) {
    this.fixedProvider = provider;
    this.selectionService = selectionService ?? defaultProviderSelectionService;
  }

  private async getActiveProvider(): Promise<AIProvider> {
    if (this.fixedProvider) return this.fixedProvider;
    return this.selectionService.selectProvider();
  }

  async chat(prompt: string): Promise<string> {
    const provider = await this.getActiveProvider();
    return provider.chat(prompt);
  }

  async chatMessages(messages: import("./providers/llm-provider").LLMMessage[] | AIMessage[]): Promise<string> {
    const provider = await this.getActiveProvider();
    return provider.chatMessages(messages as AIMessage[]);
  }

  async *streamChat(messages: import("./providers/llm-provider").LLMMessage[] | AIMessage[]): AsyncGenerator<string, void, unknown> {
    const provider = await this.getActiveProvider();
    yield* provider.streamChat(messages as AIMessage[]);
  }
}