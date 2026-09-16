import { IEmbeddingProvider, OpenAIEmbeddingProvider } from "./embedding.provider";
import { logger } from "../utils/logger";

export class EmbeddingService {
  private provider: IEmbeddingProvider;

  constructor(provider?: IEmbeddingProvider) {
    this.provider = provider || new OpenAIEmbeddingProvider();
  }

  public setProvider(provider: IEmbeddingProvider) {
    this.provider = provider;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      logger.warn("[EmbeddingService] Empty text passed to generateEmbedding; returning empty vector.");
      return [];
    }
    return this.provider.generateEmbedding(text);
  }
}

export const embeddingService = new EmbeddingService();
