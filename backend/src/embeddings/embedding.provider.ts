import OpenAI from "openai";
import { logger } from "../utils/logger";

export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
}

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private openai: OpenAI;
  private model: string;

  constructor(model: string = "text-embedding-ada-002") {
    this.model = model;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "dummy",
      baseURL: process.env.OPENAI_BASE_URL || process.env.OPENROUTER_BASE_URL,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
        throw new Error("No API keys configured for OpenAI/OpenRouter embeddings");
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      if (response.data?.[0]?.embedding) {
        return response.data[0].embedding;
      }
      throw new Error("No embedding returned from OpenAI API");
    } catch (err: any) {
      logger.warn(
        `[OpenAIEmbeddingProvider] Failed to generate embedding from provider. Falling back to deterministic mock vector. Reason: ${err?.message}`
      );
      return this.generateDeterministicMockEmbedding(text);
    }
  }

  private generateDeterministicMockEmbedding(text: string): number[] {
    const vector: number[] = [];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < 1536; i++) {
      const value = Math.sin(hash + i) * 10000;
      vector.push(value - Math.floor(value));
    }
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((val) => val / (magnitude || 1));
  }
}
