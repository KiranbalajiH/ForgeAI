import { LLMProvider as AIProvider } from "./llm-provider";
import { OpenAIProvider } from "./openai.provider";
import { NvidiaProvider } from "./nvidia.provider";
import { QwenProvider } from "./qwen.provider";
import { AIConfigService } from "../ai-config.service";

export class AIProviderFactory {
  static createProviderByName(providerName: string, configService: AIConfigService): AIProvider {
    switch (providerName.toLowerCase()) {
      case "openai":
        return new OpenAIProvider(configService);
      case "nvidia":
      case "nim":
        return new NvidiaProvider(configService);
      case "qwen":
        return new QwenProvider(configService);
      default:
        console.warn(`[AIProviderFactory] Unknown provider '${providerName}'. Falling back to OpenAI.`);
        return new OpenAIProvider(configService);
    }
  }

  static createProvider(configService: AIConfigService): AIProvider {
    const providerName = configService.get("llm").provider?.toLowerCase() || "openai";
    return this.createProviderByName(providerName, configService);
  }
}
