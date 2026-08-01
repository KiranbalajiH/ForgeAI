export interface LLMProvider {
  chat(prompt: string): Promise<string>;
}