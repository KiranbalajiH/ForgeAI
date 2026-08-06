import { FileRankingService } from "../github/file-ranking.service";

interface AnalyzedFile {
  path: string;
  size: number;
  content: string;
}

interface ScoredFile extends AnalyzedFile {
  score: number;
}

const fileRankingService = new FileRankingService();

/**
 * Ranks repository files by relevance to a user query using keyword matching.
 * Architectural importance (from FileRankingService) is used as a tiebreaker.
 *
 * Future: Replace keyword scoring with vector embeddings + cosine similarity.
 */
export class FileRelevanceService {
  rank(files: AnalyzedFile[], query: string, topN = 10): AnalyzedFile[] {
    const tokens = this.tokenize(query);

    // Get architectural base scores from existing FileRankingService
    const archScores = new Map<string, number>(
      fileRankingService
        .rank(files)
        .map((f) => [f.path, f.score])
    );

    const scored: ScoredFile[] = files.map((file) => {
      const fileLower = file.path.toLowerCase();
      const contentLower = file.content.toLowerCase();

      let relevanceScore = 0;

      for (const token of tokens) {
        // File path match: high signal (e.g. query "auth" → auth.service.ts)
        if (fileLower.includes(token)) {
          relevanceScore += 15;
        }

        // Content match: count occurrences, capped to avoid huge files dominating
        const matches = contentLower.split(token).length - 1;
        relevanceScore += Math.min(matches, 20);
      }

      // Add architectural importance as baseline
      const archScore = archScores.get(file.path) ?? 0;

      return {
        ...file,
        score: relevanceScore + archScore * 0.2,
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  private tokenize(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2); // Skip stop words like "is", "a", "to"
  }
}
