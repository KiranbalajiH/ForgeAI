import path from "path";

export interface SearchCandidate {
  id?: string;
  type?: string;
  name: string;
  filePath?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, any>;
}

/**
 * RelevanceScoringService
 *
 * Responsibility: Ranks and scores search candidates against a query using heuristic rules:
 *  - Exact symbol, filename, controller/service name match
 *  - Domain-aware folder relevance (e.g. "authentication" prefers auth/, middleware/, jwt/)
 *  - Higher scoring for filenames over file content
 *  - Higher scoring for symbols over filenames when equally matched
 *  - Ignoring generated files, node_modules, and prompt templates (unless query is AI-related)
 *
 * Exposes:
 *  - score(query: string, candidate: SearchCandidate): number
 *  - rank<T extends SearchCandidate>(query: string, candidates: T[]): T[]
 */
export class RelevanceScoringService {
  /**
   * Calculates a relevance score for a single candidate based on heuristic rules.
   *
   * @param query - Raw or normalized search query
   * @param candidate - Search candidate chunk or match object
   * @returns Relevance score (0 if candidate is ignored or non-matching)
   */
  score(query: string, candidate: SearchCandidate): number {
    if (!query || !query.trim() || !candidate) {
      return 0;
    }

    const normQuery = query.trim().toLowerCase();

    // 1. Filter out ignored files (node_modules, generated files, prompt templates)
    if (this.isIgnored(candidate, normQuery)) {
      return 0;
    }

    const normName = (candidate.name || "").toLowerCase();
    const normPath = candidate.filePath ? candidate.filePath.toLowerCase() : "";
    const fileName = candidate.filePath
      ? path.basename(candidate.filePath).toLowerCase()
      : normName;
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    const normContent = (candidate.content || "").toLowerCase();

    const isSymbol = candidate.type === "symbol";
    const isController = candidate.type === "controller";
    const isService = candidate.type === "service";
    const isFile = candidate.type === "file" || candidate.type === "module";

    let baseScore = 0;

    // 2. Exact Symbol Match (Requirement 2 & 6: Symbols score higher than filenames)
    if (isSymbol && (normName === normQuery || normName.replace(/^[^a-zA-Z0-9]+/, "") === normQuery)) {
      baseScore = 100;
    }

    // 3. Exact Controller / Service Name Match (Requirement 3)
    else if (
      (isController || isService) &&
      (normName === normQuery ||
        fileNameWithoutExt === normQuery ||
        fileNameWithoutExt.replace(/\.(controller|service)$/i, "") === normQuery)
    ) {
      baseScore = 99;
    }

    // 4. Exact Filename Match (Requirement 1)
    else if (isFile && (fileName === normQuery || fileNameWithoutExt === normQuery || normPath === normQuery)) {
      baseScore = 98;
    } else if (normName === normQuery || normPath === normQuery) {
      baseScore = 96;
    }

    // 5. Prefix Match Heuristics
    else if (normName.startsWith(normQuery) || fileName.startsWith(normQuery)) {
      baseScore = isSymbol ? 86 : isController || isService ? 84 : 83;
    } else if (normPath.startsWith(normQuery)) {
      baseScore = 80;
    }

    // 6. Substring Match Heuristics
    else if (normName.includes(normQuery) || fileName.includes(normQuery)) {
      baseScore = isSymbol ? 66 : isController || isService ? 62 : 60;
    } else if (normPath.includes(normQuery)) {
      baseScore = 55;
    }

    // 7. API Route Path Heuristics
    else if (candidate.type === "apiRoute" && candidate.metadata?.path) {
      const routePath = String(candidate.metadata.path).toLowerCase();
      if (routePath === normQuery) baseScore = 96;
      else if (routePath.startsWith(normQuery)) baseScore = 82;
      else if (routePath.includes(normQuery)) baseScore = 60;
    }

    // 8. Content Substring Fallback (Requirement 5: Filenames score higher than content)
    else if (normContent.includes(normQuery)) {
      baseScore = 18;
    }

    // If still zero, we may still get boosts from folder relevance or path length.
    // Previously the method returned early here, causing folder boosts to be ignored.
    // We now proceed to compute boosts even when baseScore is zero.
    // Note: Ignored candidates are handled earlier.
    // 9. Folder Relevance Boost (Requirement 4: e.g. "authentication" prefers auth/, middleware/, jwt/)
    const folderBoost = this.getFolderBoost(candidate.filePath, normQuery);

    // 10. Path Length Boost (Shorter paths get slightly higher score)
    let pathBoost = 0;
    if (candidate.filePath) {
      const pathDepth = candidate.filePath.split(/[/\\]/).filter(Boolean).length;
      pathBoost = Math.max(0, 5 - pathDepth * 0.5);
    }

    // 11. Symbol Tie-Breaker (Requirement 6: Symbols score higher than filenames when equally matched)
    const symbolBonus = isSymbol ? 0.5 : 0;

    const finalScore = baseScore + folderBoost + pathBoost + symbolBonus;
    return finalScore > 0 ? finalScore : 0;
  }

  /**
   * Evaluates if a search candidate should be ignored.
   */
  private isIgnored(candidate: SearchCandidate, normQuery: string): boolean {
    const filePath = candidate.filePath || "";

    // Requirement 8: Ignore node_modules
    if (filePath.includes("node_modules")) {
      return true;
    }

    // Requirement 7: Ignore generated files
    const isGeneratedDir = /[/\\](dist|build|\.next|\.output|coverage|\.turbo|\.cache|out)[/\\]/i.test(
      filePath
    );
    const isGeneratedFile = /\.(min\.js|min\.css|map|lock)$|package-lock\.json|yarn\.lock|pnpm-lock\.yaml/i.test(
      filePath
    );
    if (isGeneratedDir || isGeneratedFile) {
      return true;
    }

    // Requirement 9: Ignore prompt templates unless query is AI-related
    const isPromptTemplate =
      /[/\\]prompts?[/\\]|\.prompt\.(ts|js|md|txt)$|prompt-template/i.test(
        filePath
      );
    const isAiQuery = /\b(ai|prompt|prompts|llm|openai|claude|gpt|system|chat|model|embedding)\b/i.test(
      normQuery
    );
    if (isPromptTemplate && !isAiQuery) {
      return true;
    }

    return false;
  }

  /**
   * Calculates folder relevance boost (Requirement 4).
   * Prefer auth/, middleware/, jwt/ for "authentication" query, etc.
   */
  private getFolderBoost(filePath: string | undefined, normQuery: string): number {
    if (!filePath) return 0;
    const normalizedPath = filePath.toLowerCase();

    // Check direct folder match
    const folders = normalizedPath.split(/[/\\]/);
    if (folders.some((f) => f === normQuery || f.includes(normQuery))) {
      return 15;
    }

    // Domain specific folder preference
    const isAuthQuery = /\b(auth|authentication|login|jwt|token|session|security|permission)\b/i.test(
      normQuery
    );
    if (isAuthQuery) {
      const isAuthFolder = /[/\\](auth|middleware|jwt|security|login|session)[/\\]/i.test(
        normalizedPath
      );
      if (isAuthFolder) {
        return 15;
      }
    }

    const isDbQuery = /\b(db|database|model|prisma|schema|entity|repository)\b/i.test(
      normQuery
    );
    if (isDbQuery) {
      const isDbFolder = /[/\\](db|database|models|entities|prisma|schemas)[/\\]/i.test(
        normalizedPath
      );
      if (isDbFolder) {
        return 15;
      }
    }

    const isApiQuery = /\b(api|route|endpoint|controller|http)\b/i.test(
      normQuery
    );
    if (isApiQuery) {
      const isApiFolder = /[/\\](api|routes|controllers|endpoints)[/\\]/i.test(
        normalizedPath
      );
      if (isApiFolder) {
        return 15;
      }
    }

    return 0;
  }

  /**
   * Sorts candidate search matches by relevance score in descending order.
   * Updates each candidate's `score` property.
   *
   * @param query - Search query string
   * @param candidates - List of search candidate objects
   * @returns Array of candidates sorted by relevance score
   */
  rank<T extends SearchCandidate>(query: string, candidates: T[]): T[] {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const scored = candidates
      .map((candidate) => {
        const computedScore = this.score(query, candidate);
        return { candidate, score: computedScore };
      })
      .filter((item) => item.score > 0);

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aIsSymbol = a.candidate.type === "symbol" ? 1 : 0;
      const bIsSymbol = b.candidate.type === "symbol" ? 1 : 0;
      return bIsSymbol - aIsSymbol;
    });

    return scored.map((item) => {
      item.candidate.score = item.score;
      return item.candidate;
    });
  }
}
