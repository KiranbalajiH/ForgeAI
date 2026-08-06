export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  chat(prompt: string): Promise<string>;
  chatMessages(messages: LLMMessage[]): Promise<string>;
  streamChat(messages: LLMMessage[]): AsyncGenerator<string, void, unknown>;
}