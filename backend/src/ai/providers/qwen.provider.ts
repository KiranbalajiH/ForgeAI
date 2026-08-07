import OpenAI from "openai";
import { LLMProvider as AIProvider, LLMMessage as AIMessage } from "./llm-provider";
import { AIConfigService, defaultAIConfigService } from "../ai-config.service";

export class QwenProvider implements AIProvider {
  private client: OpenAI;
  private configService: AIConfigService;

  constructor(configService?: AIConfigService) {
    this.configService = configService ?? defaultAIConfigService;
    
    // Qwen DashScope provides an OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: process.env.QWEN_API_KEY,
      baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
  }

  getProviderName(): string {
    return "Qwen";
  }

  getSupportedModels(): string[] {
    return [
      "qwen-max",
      "qwen-plus",
      "qwen-turbo",
      "qwen-long",
      "qwen-vl-plus",
      "qwen-vl-max"
    ];
  }

  async checkHealth(): Promise<import("./llm-provider").ProviderHealthCheckResult> {
    const start = Date.now();
    try {
      await this.client.models.list();
      return {
        isHealthy: true,
        responseTimeMs: Date.now() - start
      };
    } catch (error: any) {
      return {
        isHealthy: false,
        responseTimeMs: Date.now() - start,
        error: error?.message || "Unknown error connecting to Qwen"
      };
    }
  }

  async chat(prompt: string): Promise<string> {
    const llmConfig = this.configService.get("llm");
    const response = await this.client.chat.completions.create({
      model: process.env.QWEN_DEFAULT_MODEL || llmConfig.defaultModel,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: llmConfig.temperature,
      max_tokens: llmConfig.maxTokens,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async chatMessages(messages: AIMessage[]): Promise<string> {
    const llmConfig = this.configService.get("llm");
    const response = await this.client.chat.completions.create({
      model: process.env.QWEN_DEFAULT_MODEL || llmConfig.defaultModel,
      messages,
      temperature: llmConfig.temperature,
      max_tokens: llmConfig.maxTokens,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async *streamChat(messages: AIMessage[]): AsyncGenerator<string, void, unknown> {
    const llmConfig = this.configService.get("llm");
    const stream = await this.client.chat.completions.create({
      model: process.env.QWEN_DEFAULT_MODEL || llmConfig.defaultModel,
      messages,
      temperature: llmConfig.temperature,
      max_tokens: llmConfig.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        yield delta;
      }
    }
  }
}
