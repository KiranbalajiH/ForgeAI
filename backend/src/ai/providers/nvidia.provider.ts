import OpenAI from "openai";
import { LLMProvider as AIProvider, LLMMessage as AIMessage } from "./llm-provider";
import { AIConfigService, defaultAIConfigService } from "../ai-config.service";

export class NvidiaProvider implements AIProvider {
  private client: OpenAI;
  private configService: AIConfigService;

  constructor(configService?: AIConfigService) {
    this.configService = configService ?? defaultAIConfigService;
    
    // NVIDIA NIM provides an OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    });
  }

  getProviderName(): string {
    return "NVIDIA NIM";
  }

  getSupportedModels(): string[] {
    return [
      "meta/llama-3.1-405b-instruct",
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.1-8b-instruct",
      "mistralai/mixtral-8x22b-instruct-v0.1",
      "nvidia/nemotron-4-340b-instruct"
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
        error: error?.message || "Unknown error connecting to NVIDIA NIM"
      };
    }
  }

  async chat(prompt: string): Promise<string> {
    const llmConfig = this.configService.get("llm");
    const response = await this.client.chat.completions.create({
      model: process.env.NVIDIA_DEFAULT_MODEL || llmConfig.defaultModel,
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
      model: process.env.NVIDIA_DEFAULT_MODEL || llmConfig.defaultModel,
      messages,
      temperature: llmConfig.temperature,
      max_tokens: llmConfig.maxTokens,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async *streamChat(messages: AIMessage[]): AsyncGenerator<string, void, unknown> {
    const llmConfig = this.configService.get("llm");
    const stream = await this.client.chat.completions.create({
      model: process.env.NVIDIA_DEFAULT_MODEL || llmConfig.defaultModel,
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
