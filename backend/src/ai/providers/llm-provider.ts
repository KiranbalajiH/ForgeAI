export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderHealthCheckResult {
  isHealthy: boolean;
  responseTimeMs: number;
  error?: string;
}

export interface LLMProvider {
  getProviderName(): string;
  getSupportedModels(): string[];
  checkHealth(): Promise<ProviderHealthCheckResult>;
  
  chat(prompt: string, model?: string): Promise<string>;
  chatMessages(messages: LLMMessage[], model?: string): Promise<string>;
  streamChat(messages: LLMMessage[], model?: string): AsyncGenerator<string, void, unknown>;
}