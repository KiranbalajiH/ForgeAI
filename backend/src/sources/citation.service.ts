import { VectorSearchResult, RetrievedSource } from "../retrieval/retrieval.types";
import { Citation, SourceReference } from "./source.types";

export class CitationService {
  format(sources: (VectorSearchResult | RetrievedSource)[]): SourceReference[] {
    return sources.map((s: any, idx: number) => {
      const title = s.title || `Source ${idx + 1}`;
      const docId = s.documentId || s.id || `doc-${idx + 1}`;
      const chunkId = s.id || `chunk-${idx + 1}`;
      const score = s.score ?? s.relevanceScore ?? 0;

      return {
        index: idx + 1,
        documentId: docId,
        chunkId: chunkId,
        name: title,
        title: title,
        path: `knowledge-base/document/${docId}`,
        type: s.sourceType || "vector",
        score: parseFloat(score.toFixed(4)),
      };
    });
  }

  formatCitations(sources: (VectorSearchResult | RetrievedSource)[]): Citation[] {
    return sources.map((s: any, idx: number) => {
      const title = s.title || `Source ${idx + 1}`;
      const docId = s.documentId || s.id || `doc-${idx + 1}`;
      const chunkId = s.id || `chunk-${idx + 1}`;
      const score = s.score ?? s.relevanceScore ?? 0;

      return {
        index: idx + 1,
        documentId: docId,
        chunkId: chunkId,
        title: title,
        score: parseFloat(score.toFixed(4)),
        snippet: s.content ? s.content.substring(0, 150) + "..." : undefined,
        type: s.sourceType || "vector",
      };
    });
  }
}

export const citationService = new CitationService();
