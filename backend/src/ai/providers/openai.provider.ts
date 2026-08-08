import OpenAI from "openai";
import { LLMProvider as AIProvider, LLMMessage as AIMessage } from "./llm-provider";
import { AIConfigService, defaultAIConfigService } from "../ai-config.service";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private configService: AIConfigService;

  constructor(configService?: AIConfigService) {
    this.configService = configService ?? defaultAIConfigService;
    // Uses standard OpenAI environment variables, or custom ones if defined
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || process.env.OPENROUTER_BASE_URL,
    });
  }

  getProviderName(): string {
    return "OpenAI";
  }

  getSupportedModels(): string[] {
    return [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
      "o1-preview",
      "o1-mini"
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
        error: error?.message || "Unknown error connecting to OpenAI"
      };
    }
  }

  async chat(prompt: string, targetModel?: string): Promise<string> {
    const llmConfig = this.configService.get("llm");
    const model = targetModel || process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || llmConfig.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
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

  async chatMessages(messages: AIMessage[], targetModel?: string): Promise<string> {
    const llmConfig = this.configService.get("llm");
    const model = targetModel || process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || llmConfig.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: llmConfig.temperature,
      max_tokens: llmConfig.maxTokens,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async *streamChat(messages: AIMessage[], targetModel?: string): AsyncGenerator<string, void, unknown> {
    const llmConfig = this.configService.get("llm");
    const model = targetModel || process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || llmConfig.defaultModel;

    const stream = await this.client.chat.completions.create({
      model,
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