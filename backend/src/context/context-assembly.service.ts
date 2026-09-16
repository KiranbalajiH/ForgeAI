import { RetrievedSource } from "../retrieval/retrieval.types";

export interface AssembledContext {
  contextBlob: string;
  sourcesUsed: RetrievedSource[];
}

export class ContextAssemblyService {
  assemble(sources: RetrievedSource[], maxCharacters = 12000): AssembledContext {
    // 1. Remove obvious duplicates (by content string matching)
    const uniqueSources: RetrievedSource[] = [];
    const seenContents = new Set<string>();

    for (const source of sources) {
      const normalizedContent = source.content.trim().toLowerCase();
      if (!seenContents.has(normalizedContent)) {
        seenContents.add(normalizedContent);
        uniqueSources.push(source);
      }
    }

    // 2. Rank by relevance score
    uniqueSources.sort((a, b) => {
      const scoreA = a.relevanceScore ?? 0;
      const scoreB = b.relevanceScore ?? 0;
      return scoreB - scoreA;
    });

    // 3. Assemble and limit context size
    let contextBlob = "";
    const sourcesUsed: RetrievedSource[] = [];
    let currentLength = 0;

    for (let i = 0; i < uniqueSources.length; i++) {
      const source = uniqueSources[i];
      const sourceHeader = `[Source ${i + 1}] Title: ${source.title}\n`;
      const sourceBody = `Content: ${source.content}\n\n`;
      const entryText = sourceHeader + sourceBody;

      if (currentLength + entryText.length > maxCharacters) {
        if (i === 0) {
          const allowedLength = maxCharacters - sourceHeader.length;
          if (allowedLength > 100) {
            contextBlob += sourceHeader + `Content: ${source.content.slice(0, allowedLength)}...\n\n`;
            sourcesUsed.push(source);
          }
        }
        break;
      }

      contextBlob += entryText;
      sourcesUsed.push(source);
      currentLength += entryText.length;
    }

    return {
      contextBlob: contextBlob || "No relevant context found.",
      sourcesUsed,
    };
  }
}

export const contextAssemblyService = new ContextAssemblyService();
