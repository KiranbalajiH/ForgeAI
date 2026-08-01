import OpenAI from "openai";
import { LLMProvider } from "./llm-provider";

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_BASE_URL,
    });
  }

  async chat(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL!,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}