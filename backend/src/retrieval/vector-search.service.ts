import { db } from "../utils/db";
import { embeddingService } from "../embeddings/embedding.service";
import { VectorSearchResult } from "./retrieval.types";

export interface SearchOptions {
  limit?: number;
  minScore?: number;
}

export class VectorSearchService {
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<(VectorSearchResult & { sourceType: "vector"; relevanceScore: number })[]> {
    const limit = options.limit ?? 5;
    const minScore = options.minScore ?? 0.15;

    const queryVector = await embeddingService.generateEmbedding(query);

    if (!queryVector || queryVector.length === 0) {
      return [];
    }

    // Fetch all document chunks along with document title
    const chunks = await db.documentChunk.findMany({
      include: {
        document: {
          select: {
            title: true,
          },
        },
      },
    });

    const results = chunks
      .map((chunk: any) => {
        let chunkEmbedding: number[] = [];
        try {
          if (typeof chunk.embedding === "string") {
            chunkEmbedding = JSON.parse(chunk.embedding);
          } else if (Array.isArray(chunk.embedding)) {
            chunkEmbedding = chunk.embedding as number[];
          }
        } catch {
          chunkEmbedding = [];
        }

        if (chunkEmbedding.length === 0) {
          return null;
        }

        // Compute dot product (since vector embeddings are normalized, dot product equals cosine similarity)
        let dotProduct = 0;
        const len = Math.min(queryVector.length, chunkEmbedding.length);
        for (let i = 0; i < len; i++) {
          dotProduct += queryVector[i] * chunkEmbedding[i];
        }

        return {
          id: chunk.id,
          documentId: chunk.documentId,
          title: chunk.document?.title || "Untitled Document",
          content: chunk.content,
          score: dotProduct,
          relevanceScore: dotProduct,
          sourceType: "vector" as const,
          metadata: chunk.metadata || {},
        };
      })
      .filter(
        (res: any): res is NonNullable<typeof res> =>
          res !== null && res.score >= minScore
      );

    // Sort by similarity score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }
}

export const vectorSearchService = new VectorSearchService();
